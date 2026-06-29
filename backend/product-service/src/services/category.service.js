import { CategoryModel } from "../models/category.model.js";

const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
};

// thêm category
export const createCategory = async (categoryInput) => {
  try {
    const { name, description, status } = categoryInput;

    if (!name || name.trim() === '') {
      throw new Error('Tên danh mục là bắt buộc và không được để trống!');
    }

    const isExists = await CategoryModel.checkNameExists(name.trim());
    if (isExists) {
      throw new Error(`Danh mục với tên "${name}" đã tồn tại trên hệ thống!`);
    }

    // Sinh ID ngẫu nhiên cho danh mục
    const category_id = 'cat-' + generateId(); 

    const currentTime = new Date().toISOString(); 

    const newCategory = await CategoryModel.create({
      category_id,
      name: name.trim(),
      description,
      status,
      created_at: currentTime, 
      updated_at: currentTime
    });

    return newCategory;

  } catch (error) {
    console.error('Lỗi tại createCategory Service:', error.message);
    throw error;
  }
};