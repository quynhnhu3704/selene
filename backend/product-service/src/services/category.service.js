// backend\product-service\src\services\category.service.js
import { CategoryModel } from "../models/category.model.js";
import ExcelJS from "exceljs";
import { ProductModel } from "../models/product.model.js";

const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
};

export const getCategoryDetail = async (categoryId) => {
  const category = await CategoryModel.getCategoryById(categoryId);
  if (!category) throw new Error("Không tìm thấy danh mục yêu cầu!");
  return category;
};

// thêm category
export const createCategory = async (categoryInput, file) => {
  try {
    const { name, description, status } = categoryInput;

    if (typeof name !== "string" || name.trim() === "") {
      throw new Error("Tên danh mục là bắt buộc và không được để trống!");
    }

    const isExists = await CategoryModel.checkNameExists(name.trim());
    if (isExists) {
      throw new Error(`Danh mục với tên '${name}' đã tồn tại trên hệ thống!`);
    }

    // Sinh ID ngẫu nhiên cho danh mục
    const category_id = "cat-" + generateId();

    const currentTime = new Date().toISOString();

    const image_url = await uploadCategoryImage(file);
    let newCategory;
    try {
      newCategory = await CategoryModel.create({
        category_id,
        image_url,
        name: name.trim(),
        description,
        status,
        created_at: currentTime,
        updated_at: currentTime,
      });
    } catch (error) {
      if (image_url) await ProductModel.deleteFilesFromStorage([image_url]);
      throw error;
    }
    return newCategory;
  } catch (error) {
    console.error("Lỗi tại createCategory Service:", error.message);
    throw error;
  }
};

// cập nhật catgory
export const updateCategory = async (category_id, updateInput, file) => {
  try {
    const { name, description, status } = updateInput;

    // 1. Kiểm tra nếu có cập nhật tên thì không được để trống
    if (
      name !== undefined &&
      (typeof name !== "string" || name.trim() === "")
    ) {
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

    const category = await CategoryModel.getCategoryById(category_id);
    if (!category) throw new Error("Không tìm thấy danh mục yêu cầu!");
    const image_url = await uploadCategoryImage(file);

    // 3. Lấy thời gian hiện tại từ Node.js (Date.now() định dạng ISO)
    const updated_at = new Date().toISOString();

    // 4. Chuẩn bị object dữ liệu update (chỉ update những trường được truyền lên)
    const updateData = {
      ...(name && { name: name.trim() }),
      ...(description !== undefined && { description }),
      ...(image_url && { image_url }),
      ...(status && { status }),
      updated_at,
    };

    // 5. Gọi model thực thi
    let updatedCategory;
    try {
      updatedCategory = await CategoryModel.update(category_id, updateData);
      if (!updatedCategory) throw new Error("Không tìm thấy danh mục yêu cầu!");
    } catch (error) {
      if (image_url) await ProductModel.deleteFilesFromStorage([image_url]);
      throw error;
    }
    if (image_url && category.image_url) {
      await ProductModel.deleteFilesFromStorage([category.image_url]);
    }

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
    const limit = Math.min(100, Math.max(1, parseInt(options.limit) || 10));
    let categories = await getCategoryRows();
    const q = String(options.q || "")
      .trim()
      .toLocaleLowerCase("vi-VN");
    if (q)
      categories = categories.filter((item) =>
        item.name.toLocaleLowerCase("vi-VN").includes(q),
      );
    if (["active", "inactive"].includes(options.status)) {
      categories = categories.filter((item) => item.status === options.status);
    }
    if (["az", "za"].includes(options.sort)) {
      categories.sort(
        (a, b) =>
          a.name.localeCompare(b.name, "vi") * (options.sort === "za" ? -1 : 1),
      );
    } else if (["products_asc", "products_desc"].includes(options.sort)) {
      categories.sort(
        (a, b) =>
          (a.product_count - b.product_count) *
          (options.sort === "products_desc" ? -1 : 1),
      );
    }
    const count = categories.length;
    const page = Math.min(
      Math.max(1, parseInt(options.page) || 1),
      Math.max(1, Math.ceil(count / limit)),
    );
    const from = (page - 1) * limit;
    const data = categories.slice(from, from + limit);

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

// Dùng count của quan hệ products để đếm sản phẩm, không đếm biến thể.
const getCategoryRows = async () => {
  const categories = [];
  let from = 0;
  while (true) {
    const { data, count } = await CategoryModel.getCategories(from, from + 499);
    categories.push(...data);
    if (!data.length || categories.length >= count) break;
    from += data.length;
  }
  return categories;
};

const uploadCategoryImage = async (file) => {
  if (!file) return undefined;
  if (
    !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(
      file.mimetype,
    )
  ) {
    throw new Error("Ảnh danh mục phải là JPG, PNG, WEBP hoặc GIF!");
  }
  const [image_url] = await ProductModel.uploadMultipleFilesToStorage([file]);
  return image_url;
};

export const generateCategoriesExcelBuffer = async () => {
  const categories = await getCategoryRows();
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Categories");
  worksheet.columns = [
    { header: "STT", key: "stt", width: 8 },
    { header: "Danh mục", key: "name", width: 30 },
    { header: "Ảnh danh mục", key: "image_url", width: 60 },
    { header: "Số lượng SP", key: "product_count", width: 18 },
    { header: "Trạng thái", key: "status", width: 18 },
    { header: "Ngày tạo", key: "created_at", width: 18 },
  ];
  worksheet.getRow(1).font = { bold: true };
  categories.forEach((category, index) => {
    worksheet.addRow({
      ...category,
      stt: index + 1,
      status: category.status === "active" ? "Hoạt động" : "Đã khóa",
      created_at: category.created_at ? new Date(category.created_at) : null,
    });
  });
  worksheet.getColumn("created_at").numFmt = "dd/mm/yyyy";
  return workbook.xlsx.writeBuffer();
};
