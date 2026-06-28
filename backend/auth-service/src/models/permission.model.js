import { supabase } from '../configs/supabase.js';

export const PermissionModel = {

    // Lấy danh sách tất cả các quyền hiện có trong hệ thống
    getAllPermissions: async () => {
        const { data, error } = await supabase
            .from('permissions')
            .select('name');

        if (error) throw error;

        return data ? data.map(p => p.name) : [];
    },

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