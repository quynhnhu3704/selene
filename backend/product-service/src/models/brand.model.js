// backend\product-service\src\models\brand.model.js
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
  },

  // Kiểm tra tên muốn sửa có trùng với thương hiệu KHÁC không 
  checkNameExistsForUpdate: async (name, currentBrandId) => {
    const { data, error } = await supabase
      .from('brands')
      .select('brand_id')
      .ilike('name', name) 
      .neq('brand_id', currentBrandId) // Loại trừ chính thương hiệu đang sửa
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Cập nhật thương hiệu theo ID
  update: async (brand_id, updateData) => {
    const { data, error } = await supabase
      .from('brands')
      .update({
        name: updateData.name,
        description: updateData.description,
        status: updateData.status,
        updated_at: updateData.updated_at 
      })
      .eq('brand_id', brand_id)
      .select();

    if (error) throw error;
    return data[0];
  },

  // Hàm tìm tên brand theo ID
  getBrandNameById: async (brand_id) => {
    const { data, error } = await supabase
      .from('brands')
      .select('name')
      .eq('brand_id', brand_id)
      .maybeSingle(); // Lấy 1 bản ghi hoặc trả về null nếu không thấy

    if (error) throw error;
    return data ? data.name : null; // Trả về chuỗi tên brand (ví dụ: "NEM") hoặc null
  }
};