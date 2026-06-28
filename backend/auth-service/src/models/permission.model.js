import { supabase } from '../configs/supabase.js';

export const PermissionModel = {

    // lấy quyền theo accountID
    getPermissionsByAccountId: async (accountId) => {
        const { data, error } = await supabase
            .from('accounts')
            .select(`
                 roles (
                   role_permissions (
                     permissions (name)
                   )
                 )
             `)
            .eq('account_id', accountId)
            .single();

        if (error) throw error;

        // Trả về mảng rỗng nếu không có dữ liệu quyền
        if (!data || !data.roles || !data.roles.role_permissions) return [];

        // Khử mảng lồng nhau thành mảng phẳng chứa string tên quyền
        return data.roles.role_permissions
            .map(rp => rp.permissions?.name)
            .filter(Boolean);
    }
}