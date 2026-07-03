// backend\auth-service\src\models\refreshToken.model.js
import { supabase } from '../configs/supabase.js';

export const RefreshTokenModel = {
  // Lưu mới hoặc cập nhật Refresh Token (vì account_id là UNIQUE nên dùng upsert)
  saveRefreshToken: async ({ refresh_token_id, account_id, refresh_token_hash, expires_at }) => {
    const { data, error } = await supabase
      .from('refresh_tokens')
      .upsert({
        refresh_token_id,
        account_id,
        refresh_token_hash,
        expires_at
      }, { onConflict: 'account_id' }) // Nếu trùng account_id sẽ ghi đè token mới
      .select()
      .single();

    if (error) throw new Error(`Lỗi lưu Refresh Token: ${error.message}`);
    return data;
  },

  // Tìm kiếm accountId 
  findByAccountId: async (accountId) => {
    const { data, error } = await supabase
      .from('refresh_tokens')
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (error) return null;
    return data;
  },

  // Xóa token khi logout
  deleteByAccountId: async (accountId) => {
    const { error } = await supabase
      .from('refresh_tokens')
      .delete()
      .eq('account_id', accountId);

    if (error) throw new Error(`Lỗi xóa Refresh Token: ${error.message}`);
    return true;
  }
}
