import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Thiếu cấu hình SUPABASE_URL hoặc SUPABASE_KEY trong notify-service');
}

export const supabase = createClient(supabaseUrl || 'https://example.supabase.co', supabaseKey || 'public-anon-key');
