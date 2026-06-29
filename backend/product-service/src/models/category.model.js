import { supabase } from '../configs/supabase.js';

export const CategoryModel = {
    // Kiểm tra tên danh mục đã tồn tại chưa
  checkNameExists: async (name) => {
    const { data, error } = await supabase
      .from('categories')
      .select('category_id')
      .eq('name', name)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Tạo mới danh mục với thời gian truyền từ Node.js
  create: async (categoryData) => {
    const { data, error } = await supabase
      .from('categories')
      .insert([
        {
          category_id: categoryData.category_id,
          name: categoryData.name,
          description: categoryData.description || null,
          status: categoryData.status || 'active',
          created_at: categoryData.created_at, 
          updated_at: categoryData.updated_at 
        }
      ])
      .select();

    if (error) throw error;
    return data[0];
  }

}