import { supabase } from '../configs/supabase.js';

export const BrandModel = {
  // Lấy danh sách thương hiệu có phân trang
  getBrandsWithPagination: async (from, to) => {
    const { data, error, count } = await supabase
      .from('brands')
      .select(`
        brand_id,
        name,
        description,
        status,
        created_at,
        updated_at
      `, { count: 'exact' })
      .order('created_at', { ascending: false }) 
      .range(from, to); 

    if (error) throw error;
    return { data, count };
  },

  // Kiểm tra tên thương hiệu đã tồn tại chưa
  checkNameExists: async (name) => {
    const { data, error } = await supabase
      .from('brands')
      .select('brand_id')
      .ilike('name', name)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Tạo mới thương hiệu
  create: async (brandData) => {
    const { data, error } = await supabase
      .from('brands')
      .insert([
        {
          brand_id: brandData.brand_id,
          name: brandData.name,
          description: brandData.description || null,
          status: brandData.status || 'active',
          created_at: brandData.created_at,
          updated_at: brandData.updated_at
        }
      ])
      .select();

    if (error) throw error;
    return data[0];
  }
};