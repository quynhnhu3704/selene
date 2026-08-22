// backend\product-service\src\models\category.model.js
import { supabase } from "../configs/supabase.js";

export const CategoryModel = {
  // Kiểm tra tên danh mục đã tồn tại chưa
  checkNameExists: async (name) => {
    const { data, error } = await supabase
      .from("categories")
      .select("category_id")
      .ilike("name", name)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Tạo mới danh mục với thời gian truyền từ Node.js
  create: async (categoryData) => {
    const { data, error } = await supabase
      .from("categories")
      .insert([
        {
          category_id: categoryData.category_id,
          name: categoryData.name,
          description: categoryData.description || null,
          status: categoryData.status || "active",
          created_at: categoryData.created_at,
          updated_at: categoryData.updated_at,
        },
      ])
      .select();

    if (error) throw error;
    return data[0];
  },

  // Kiểm tra xem tên muốn sửa có bị trùng với danh mục KHÁC không
  checkNameExistsForUpdate: async (name, currentCategoryId) => {
    const { data, error } = await supabase
      .from("categories")
      .select("category_id")
      .ilike("name", name)
      .neq("category_id", currentCategoryId) // Không tính chính nó
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Cập nhật danh mục theo ID
  update: async (category_id, updateData) => {
    const { data, error } = await supabase
      .from("categories")
      .update({
        name: updateData.name,
        description: updateData.description,
        status: updateData.status,
        updated_at: updateData.updated_at, // Nhận thời gian từ Node.js truyền xuống
      })
      .eq("category_id", category_id)
      .select(); // Trả về dữ liệu mới sau khi sửa xong

    if (error) throw error;
    return data[0];
  },

  // Lấy danh sách danh mục có phân trang
  getCategories: async (from, to) => {
    const { data, error, count } = await supabase
      .from("categories")
      .select(
        `
        category_id,
        name,
        description,
        status,
        created_at,
        updated_at
      `,
        { count: "exact" },
      ) // Đếm tổng số bản ghi thực tế trong DB
      .order("created_at", { ascending: false }) // Danh mục mới nhất xếp lên đầu
      .range(from, to); // Cắt dữ liệu theo trang [from, to]

    if (error) throw error;
    return { data, count };
  },

  // Lấy danh mục tối giản để dùng cho bộ lọc sản phẩm Admin
  getCategoriesForProductFilter: async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("category_id, name")
      .order("name", { ascending: true });

    if (error) throw error;
    return data;
  },
};
