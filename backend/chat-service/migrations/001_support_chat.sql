BEGIN;

CREATE TABLE IF NOT EXISTS public.conversations (
  conversation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id text NOT NULL REFERENCES public.accounts(account_id),
  assigned_staff_id text REFERENCES public.accounts(account_id),
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'closed')),
  last_message text,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'active' OR assigned_staff_id IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS conversations_one_open_customer
  ON public.conversations(customer_id) WHERE status IN ('waiting', 'active');
CREATE INDEX IF NOT EXISTS conversations_inbox ON public.conversations(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.messages (
  message_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.conversations(conversation_id),
  sender_id text NOT NULL REFERENCES public.accounts(account_id),
  content text NOT NULL CHECK (length(btrim(content)) BETWEEN 1 AND 2000),
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type = 'text'),
  client_id uuid NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sender_id, client_id)
);
CREATE INDEX IF NOT EXISTS messages_history ON public.messages(conversation_id, message_id DESC);
CREATE INDEX IF NOT EXISTS messages_unread ON public.messages(conversation_id, sender_id) WHERE NOT is_read;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.conversations, public.messages FROM anon, authenticated;
GRANT ALL ON public.conversations, public.messages TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.messages_message_id_seq TO service_role;

CREATE OR REPLACE VIEW public.support_conversation_details WITH (security_invoker = true) AS
SELECT c.*, p.full_name AS customer_name,
  (SELECT count(*) FROM public.messages m WHERE m.conversation_id = c.conversation_id
    AND NOT m.is_read AND m.sender_id <> c.customer_id) AS customer_unread,
  (SELECT count(*) FROM public.messages m WHERE m.conversation_id = c.conversation_id
    AND NOT m.is_read AND m.sender_id = c.customer_id) AS staff_unread
FROM public.conversations c
LEFT JOIN public.user_profiles p ON p.account_id = c.customer_id;
REVOKE ALL ON public.support_conversation_details FROM anon, authenticated;
GRANT SELECT ON public.support_conversation_details TO service_role;

-- Khóa hội thoại để gửi/đóng đồng thời không làm xuất hiện tin sau khi đã đóng.
CREATE OR REPLACE FUNCTION public.send_support_message(
  p_conversation_id uuid, p_sender_id text, p_content text, p_client_id uuid
) RETURNS public.messages LANGUAGE plpgsql SET search_path = public AS $$
DECLARE c public.conversations; m public.messages;
BEGIN
  SELECT * INTO c FROM public.conversations WHERE conversation_id = p_conversation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy hội thoại!'; END IF;
  SELECT * INTO m FROM public.messages WHERE sender_id = p_sender_id AND client_id = p_client_id;
  IF FOUND THEN
    IF m.conversation_id <> p_conversation_id OR m.content <> p_content THEN
      RAISE EXCEPTION 'Mã gửi tin nhắn đã được sử dụng!';
    END IF;
    RETURN m;
  END IF;
  IF c.status = 'closed' THEN RAISE EXCEPTION 'Hội thoại đã đóng!'; END IF;
  IF p_sender_id <> c.customer_id AND p_sender_id IS DISTINCT FROM c.assigned_staff_id THEN
    RAISE EXCEPTION 'Bạn chưa nhận xử lý hội thoại!';
  END IF;
  INSERT INTO public.messages(conversation_id, sender_id, content, client_id)
    VALUES (p_conversation_id, p_sender_id, p_content, p_client_id) RETURNING * INTO m;
  UPDATE public.conversations SET last_message = p_content, last_message_at = m.created_at,
    updated_at = clock_timestamp() WHERE conversation_id = p_conversation_id;
  RETURN m;
END;
$$;
REVOKE ALL ON FUNCTION public.send_support_message(uuid, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.send_support_message(uuid, text, text, uuid) TO service_role;

INSERT INTO public.permissions(permission_id, name, description, status, created_at)
SELECT 'per-chat-' || action, 'chat:' || action, description, 'active', now()
FROM (VALUES ('view', 'Xem hội thoại CSKH'), ('reply', 'Trả lời khách hàng'),
  ('assign', 'Nhận xử lý hội thoại'), ('close', 'Đóng hội thoại CSKH')) AS p(action, description)
WHERE NOT EXISTS (SELECT 1 FROM public.permissions existing WHERE existing.name = 'chat:' || p.action);
INSERT INTO public.role_permissions(role_id, permission_id)
SELECT r.role_id, p.permission_id FROM public.roles r CROSS JOIN public.permissions p
WHERE r.role_id IN ('1', '2') AND p.name IN ('chat:view', 'chat:reply', 'chat:assign', 'chat:close')
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;
