-- Migration 002: Tạo bảng message_attachments và nới lỏng message_type
BEGIN;

-- 1. Mở rộng ràng buộc message_type cho phép 'text', 'image', 'video', 'file', 'audio'
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_message_type_check 
  CHECK (message_type IN ('text', 'image', 'video', 'file', 'audio'));

-- 2. Tạo bảng message_attachments theo đúng cấu trúc schema
CREATE TABLE IF NOT EXISTS public.message_attachments (
  attachment_id varchar PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
  message_id varchar NOT NULL,
  file_url varchar NOT NULL,
  file_name varchar NOT NULL,
  file_type varchar NOT NULL,
  file_size bigint,
  created_at timestamp DEFAULT now()
);

-- 3. Tạo index tối ưu tốc độ truy vấn theo message_id
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id 
  ON public.message_attachments(message_id);

-- 4. Phân quyền truy cập
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.message_attachments FROM anon, authenticated;
GRANT ALL ON public.message_attachments TO service_role;

COMMIT;
