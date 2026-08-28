// backend\product-service\src\services\category.service.js
import { CategoryModel } from "../models/category.model.js";
import { ProductModel } from "../models/product.model.js";

const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
};

// thêm category
export const createCategory = async (categoryInput) => {
  try {
    const { name, description, status } = categoryInput;

    if (!name || name.trim() === "") {
      throw new Error("Tên danh mục là bắt buộc và không được để trống!");
    }

    const isExists = await CategoryModel.checkNameExists(name.trim());
    if (isExists) {
      throw new Error(`Danh mục với tên '${name}' đã tồn tại trên hệ thống!`);
    }

    // Sinh ID ngẫu nhiên cho danh mục
    const category_id = "cat-" + generateId();

    const currentTime = new Date().toISOString();

    const newCategory = await CategoryModel.create({
      category_id,
      name: name.trim(),
      description,
      status,
      created_at: currentTime,
      updated_at: currentTime,
    });

    return newCategory;
  } catch (error) {
    console.error("Lỗi tại createCategory Service:", error.message);
    throw error;
  }
};

// cập nhật catgory
export const updateCategory = async (category_id, updateInput) => {
  try {
    const { name, description, status } = updateInput;

    // 1. Kiểm tra nếu có cập nhật tên thì không được để trống
    if (name !== undefined && name.trim() === "") {
      throw new Error("Tên danh mục không được để trống!");
    }

    // 2. Nếu sửa tên, kiểm tra xem tên mới có bị trùng với danh mục khác không
    if (name) {
      const isNameDup = await CategoryModel.checkNameExistsForUpdate(
        name.trim(),
        category_id,
      );
      if (isNameDup) {
        throw new Error(
          `Tên danh mục '${name}' đã được sử dụng bởi một danh mục khác!`,
        );
      }
    }

    // 3. Lấy thời gian hiện tại từ Node.js (Date.now() định dạng ISO)
    const updated_at = new Date().toISOString();

    // 4. Chuẩn bị object dữ liệu update (chỉ update những trường được truyền lên)
    const updateData = {
      ...(name && { name: name.trim() }),
      ...(description !== undefined && { description }),
      ...(status && { status }),
      updated_at,
    };

    // 5. Gọi model thực thi
    const updatedCategory = await CategoryModel.update(category_id, updateData);

    if (!updatedCategory) {
      throw new Error(
        "Không tìm thấy danh mục yêu cầu hoặc cập nhật thất bại!",
      );
    }

    return updatedCategory;
  } catch (error) {
    console.error("Lỗi tại updateCategory Service:", error.message);
    throw error;
  }
};

// lấy danh sách
export const getAllCategories = async (options = {}) => {
  try {
    // 1. Cấu hình phân trang (Pagination) giống hệt logic Product của bạn
    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 10; // Mặc định 10 danh mục/trang
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 2. Gọi Model lấy dữ liệu từ Supabase
    const { data, count } = await CategoryModel.getCategories(from, to);

    // 3. Tính toán tổng số trang
    const totalPages = Math.ceil(count / limit);

    return {
      categories: data,
      pagination: {
        currentPage: page,
        limit,
        totalItems: count,
        totalPages,
      },
    };
  } catch (error) {
    console.error("Lỗi tại getAllCategories Service:", error.message);
    throw new Error(
      "Không thể kết nối đến Supabase để lấy danh sách danh mục!",
    );
  }
};

// lấy danh mục cho bộ lọc sản phẩm Admin
export const getCategoriesForProductFilter = async () => {
  try {
    return await CategoryModel.getCategoriesForProductFilter();
  } catch (error) {
    console.error(
      "Lỗi tại getCategoriesForProductFilter Service:",
      error.message,
    );
    throw new Error("Không thể lấy danh sách danh mục cho bộ lọc sản phẩm!");
  }
};

// cập nhật trạng thái category (toggle active/inactive) và các sản phẩm thuộc category đó
export const updateCategoryStatus = async (category_id) => {
  try {
    if (!category_id) {
      throw new Error("Mã danh mục không được để trống!");
    }

    // 1. Lấy thông tin danh mục hiện tại để kiểm tra sự tồn tại và xác định trạng thái cũ
    const category = await CategoryModel.getCategoryById(category_id);
    if (!category) {
      throw new Error("Không tìm thấy danh mục yêu cầu!");
    }

    // 2. Chuyển đổi trạng thái từ active -> inactive và ngược lại
    const newStatus = category.status === "active" ? "inactive" : "active";
    const currentTime = new Date().toISOString();

    // 3. Cập nhật trạng thái của danh mục
    const updatedCategory = await CategoryModel.update(category_id, {
      name: category.name,
      description: category.description,
      status: newStatus,
      updated_at: currentTime,
    });

    // 4. Đồng thời cập nhật trạng thái và updated_at của tất cả sản phẩm thuộc danh mục này
    await ProductModel.updateProductsStatusByCategory(
      category_id,
      newStatus,
      currentTime,
    );

    // 5. Cập nhật trạng thái và updated_at của tất cả các biến thể thuộc sản phẩm của danh mục này
    await ProductModel.updateVariantsStatusByCategory(
      category_id,
      newStatus,
      currentTime,
    );

    return updatedCategory;
  } catch (error) {
    console.error("Lỗi tại updateCategoryStatus Service:", error.message);
    throw error;
  }
};
