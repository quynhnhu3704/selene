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
  }
};