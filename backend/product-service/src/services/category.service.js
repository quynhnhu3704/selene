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
      throw new Error(`Danh mục với tên '${name}' đã tồn tại trên hệ thống!`);
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

// cập nhật catgory
export const updateCategory = async (category_id, updateInput) => {
  try {
    const { name, description, status } = updateInput;

    // 1. Kiểm tra nếu có cập nhật tên thì không được để trống
    if (name !== undefined && name.trim() === '') {
      throw new Error('Tên danh mục không được để trống!');
    }

    // 2. Nếu sửa tên, kiểm tra xem tên mới có bị trùng với danh mục khác không
    if (name) {
      const isNameDup = await CategoryModel.checkNameExistsForUpdate(name.trim(), category_id);
      if (isNameDup) {
        throw new Error(`Tên danh mục '${name}' đã được sử dụng bởi một danh mục khác!`);
      }
    }

    // 3. Lấy thời gian hiện tại từ Node.js (Date.now() định dạng ISO)
    const updated_at = new Date().toISOString();

    // 4. Chuẩn bị object dữ liệu update (chỉ update những trường được truyền lên)
    const updateData = {
      ...(name && { name: name.trim() }),
      ...(description !== undefined && { description }),
      ...(status && { status }),
      updated_at
    };

    // 5. Gọi model thực thi
    const updatedCategory = await CategoryModel.update(category_id, updateData);

    if (!updatedCategory) {
      throw new Error('Không tìm thấy danh mục yêu cầu hoặc cập nhật thất bại!');
    }

    return updatedCategory;

  } catch (error) {
    console.error('Lỗi tại updateCategory Service:', error.message);
    throw error;
  }
}