// backend\product-service\src\services\product.service.js
import { ProductModel } from "../models/product.model.js";
import { BrandModel } from "../models/brand.model.js";

const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
};

//  Hàm dùng chung: Trích xuất 1 tấm ảnh đầu tiên từ dữ liệu image_urls trong DB
const getFirstImage = (imageUrlsData) => {
  if (!imageUrlsData) return "";

  let parsedImages = imageUrlsData;

  // Nếu dữ liệu trả về dạng chuỗi Text (chưa parse), tiến hành parse sang Mảng
  if (typeof imageUrlsData === "string") {
    try {
      parsedImages = JSON.parse(imageUrlsData);
    } catch (e) {
      parsedImages = [imageUrlsData];
    }
  }

  // Nếu là mảng và có phần tử, lấy phần tử đầu tiên [0]
  if (Array.isArray(parsedImages) && parsedImages.length > 0) {
    return parsedImages[0];
  }

  // Trường hợp dữ liệu sau khi xử lý vẫn là chuỗi URL đơn thuần
  if (typeof parsedImages === "string") {
    return parsedImages;
  }

  return "";
};

// Lấy tất cả sản phẩm cho customer
export const getAllProduct = async (options = {}) => {
  try {
    // 1. Cấu hình phân trang (Pagination)
    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 12;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 2. Gọi Model lấy dữ liệu từ DB
    const { data, count } = await ProductModel.getProductsWithPagination(
      from,
      to,
    );

    const formattedProducts = data.map((product) => ({
      product_id: product.product_id,
      product_name: product.product_name,
      image_url: getFirstImage(product.image_urls),
      discount_price: product.discount_price,
      original_price: product.original_price,
    }));

    const totalPages = Math.ceil(count / limit);

    return {
      products: formattedProducts,
      pagination: {
        currentPage: page,
        limit,
        totalItems: count,
        totalPages,
      },
    };
  } catch (error) {
    console.error("Lỗi tại getAllProducts:", error.message);
    throw new Error(
      "Không thể kết nối đến Supabase để lấy danh sách sản phẩm!",
    );
  }
};

// xem chi tiết sản phẩm
export const getProductDetail = async (productId) => {
  try {
    // 1. Gọi Model lấy chi tiết sản phẩm
    const product = await ProductModel.getProductById(productId);
    if (!product) throw new Error("Sản phẩm không tồn tại!");

    // 2. Gọi Model lấy các biến thể kích thước / màu sắc
    const variants = await ProductModel.getProductVariants(productId);

    // Xử lý parse mảng ảnh an toàn
    let images = product.image_urls;
    if (typeof product.image_urls === "string") {
      try {
        images = JSON.parse(product.image_urls);
      } catch (e) {
        images = [product.image_urls];
      }
    }

    // Trả về cục data tổng hợp hoàn chỉnh
    return {
      product_id: product.product_id,
      product_name: product.product_name,
      images: images,
      original_price: product.original_price,
      discount_price: product.discount_price,
      description: product.description,
      brand_name: product.brands?.name || null,
      variants: variants,
    };
  } catch (error) {
    console.error("Lỗi tại getProductDetailService:", error.message);
    // Giữ nguyên logic throw error gốc hoặc câu thông báo lỗi tùy biến
    if (
      error.message === "Sản phẩm không tồn tại!" ||
      error.code === "PGRST116"
    ) {
      throw new Error("Sản phẩm không tồn tại!");
    }
    throw error;
  }
};

// Tìm kiếm sản phẩm theo tên
export const searchProductsByName = async (options = {}) => {
  try {
    const { keyword = "", page = 1, limit = 12 } = options;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Truy vấn thông qua Model
    const { data, count } = await ProductModel.searchProductsByName(
      keyword,
      from,
      to,
    );

    const formattedProducts = data.map((product) => ({
      product_id: product.product_id,
      product_name: product.product_name,
      image_url: getFirstImage(product.image_urls),
      discount_price: product.discount_price,
      original_price: product.original_price,
    }));

    const totalPages = Math.ceil(count / limit);

    return {
      products: formattedProducts,
      pagination: {
        currentPage: parseInt(page),
        limit: parseInt(limit),
        totalItems: count,
        totalPages,
      },
    };
  } catch (error) {
    console.error("Lỗi tại searchProductsService:", error.message);
    throw new Error("Không thể tìm kiếm sản phẩm từ Supabase!");
  }
};

// tìm kiếm sp theo danh mục
export const searchProductsByCategoryName = async (options = {}) => {
  try {
    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 12;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const categoryName = options.categoryName
      ? options.categoryName.trim()
      : "";

    // Truy vấn lọc theo danh mục thông qua Model
    const { data, count } = await ProductModel.searchProductsByCategory(
      categoryName,
      from,
      to,
    );

    const formattedProducts = data.map((product) => ({
      product_id: product.product_id,
      product_name: product.product_name,
      image_url: getFirstImage(product.image_urls),
      discount_price: product.discount_price,
      original_price: product.original_price,
      category_name: product.categories?.name || null,
    }));

    const totalPages = Math.ceil(count / limit);

    return {
      products: formattedProducts,
      pagination: {
        currentPage: page,
        limit,
        totalItems: count,
        totalPages,
      },
    };
  } catch (error) {
    console.error(
      "Lỗi tại searchProductsByCategoryName Service:",
      error.message,
    );
    throw new Error("Không thể tìm kiếm sản phẩm theo danh mục!");
  }
};

// thêm sp
export const createProductWithVariants = async (inputData, files) => {
  try {
    const {
      category_id,
      brand_id,
      product_name,
      price,
      original_price,
      discount_price,
      description,
      status,
      variants,
    } = inputData;

    // Ép kiểu mảng cho variants vì khi gửi qua FormData nó có thể bị chuyển thành chuỗi JSON
    const parsedVariants =
      typeof variants === "string" ? JSON.parse(variants) : variants;
    if (
      !parsedVariants ||
      !Array.isArray(parsedVariants) ||
      parsedVariants.length === 0
    ) {
      throw new Error("Sản phẩm phải có ít nhất một biến thể (Size/Color)!");
    }

    // lấy tên thương hiệu
    const dbBrandName = await BrandModel.getBrandNameById(brand_id);
    if (!dbBrandName) {
      throw new Error(
        `Mã thương hiệu (brand_id) '${brand_id}' không tồn tại trên hệ thống!`,
      );
    }

    // 3. Xử lý upload N hình ảnh lên Supabase Storage
    const uploadedImageUrls =
      await ProductModel.uploadMultipleFilesToStorage(files);

    const currentTime = new Date().toISOString();
    const productId = generateId();
    const cleanBrandName = dbBrandName.trim().toUpperCase();

    // 4. Chuẩn bị dữ liệu cho bảng Product
    const productData = {
      product_id: productId,
      category_id,
      brand_id,
      product_name: product_name.trim(),
      image_urls: JSON.stringify(uploadedImageUrls),
      product_url: null,
      price,
      original_price,
      discount_price,
      description,
      status: status || "active",
      created_at: currentTime,
      updated_at: currentTime,
    };

    // 5. Chuẩn bị dữ liệu cho bảng Variants (Tự động tạo SKU)
    const variantsData = parsedVariants.map((v) => {
      const cleanSize = v.size.trim();
      const cleanColor = v.color.trim();
      const variant_id =
        `${cleanBrandName}-${productId}-${cleanSize}-${cleanColor.toUpperCase()}`.replace(
          /\s+/g,
          "",
        );

      return {
        variant_id,
        product_id: productId,
        size: v.size,
        color: v.color,
        stock_quantity: v.stock_quantity || 0,
        status: v.status || "active",
        created_at: currentTime,
        updated_at: currentTime,
      };
    });

    // 6. Thực thi lưu vào Database
    const newProduct = await ProductModel.createProduct(productData);
    const newVariants = await ProductModel.createVariants(variantsData);

    return {
      ...newProduct,
      image_urls: uploadedImageUrls,
      variants: newVariants,
    };
  } catch (error) {
    console.error("Lỗi tại createProductWithVariants Service:", error.message);
    throw error;
  }
};

// cập nhật sản phẩm
export const updateProductWithVariants = async (
  productId,
  inputData,
  files,
) => {
  try {
    const {
      category_id,
      brand_id,
      product_name,
      price,
      original_price,
      discount_price,
      description,
      status,
      variants,
      old_image_urls,
    } = inputData;

    // 1. Kiểm tra xem sản phẩm có thực sự tồn tại trong DB không
    const existingProduct = await ProductModel.getProductById(productId);
    if (!existingProduct) {
      throw new Error(`Sản phẩm với ID '${productId}' không tồn tại!`);
    }

    // 2. Ép kiểu mảng cho biến thể
    const parsedVariants =
      typeof variants === "string" ? JSON.parse(variants) : variants;
    if (
      !parsedVariants ||
      !Array.isArray(parsedVariants) ||
      parsedVariants.length === 0
    ) {
      throw new Error("Sản phẩm phải có ít nhất một biến thể (Size/Color)!");
    }

    // Xử lý gom ảnh cũ và ảnh mới từ Multer
    let finalImageUrls = [];
    if (old_image_urls) {
      finalImageUrls =
        typeof old_image_urls === "string"
          ? JSON.parse(old_image_urls)
          : old_image_urls;
    }

    // LOGIC XỬ LÝ XÓA ẢNH RÁC TRÊN STORAGE
    if (existingProduct.image_urls) {
      // Parse danh sách ảnh hiện tại đang có trong DB
      const currentUrlsInDb =
        typeof existingProduct.image_urls === "string"
          ? JSON.parse(existingProduct.image_urls)
          : existingProduct.image_urls;

      // Tìm các ảnh có trong DB nhưng KHÔNG có trong danh sách giữ lại của Frontend
      const urlsToDelete = currentUrlsInDb.filter(
        (url) => !finalImageUrls.includes(url),
      );

      // Tiến hành xóa các file bị loại bỏ này khỏi Storage
      if (urlsToDelete.length > 0) {
        await ProductModel.deleteFilesFromStorage(urlsToDelete);
      }
    }

    // Tiếp tục xử lý upload file mới từ `files` và cập nhật DB như cũ...
    if (files && files.length > 0) {
      const newUploadedUrls =
        await ProductModel.uploadMultipleFilesToStorage(files);
      finalImageUrls = [...finalImageUrls, ...newUploadedUrls];
    }

    if (finalImageUrls.length === 0) {
      throw new Error("Sản phẩm phải có ít nhất một hình ảnh!");
    }

    // 3. Kiểm tra thương hiệu hợp lệ
    const dbBrandName = await BrandModel.getBrandNameById(brand_id);
    if (!dbBrandName) {
      throw new Error(`Mã thương hiệu (brand_id) '${brand_id}' không tồn tại!`);
    }

    const currentTime = new Date().toISOString();
    const cleanBrandName = dbBrandName.trim().toUpperCase();

    // 4. Chuẩn bị mảng dữ liệu biến thể để nạp vào DB
    const variantsData = parsedVariants.map((v) => {
      const cleanSize = v.size.trim();
      const cleanColor = v.color.trim();

      // Nếu có variant_id (hàng cũ) -> giữ nguyên.
      // Nếu không có variant_id (Admin vừa bấm thêm dòng mới) -> Tự tạo mã ID mới
      const variant_id =
        v.variant_id ||
        `${cleanBrandName}-${productId}-${cleanSize}-${cleanColor.toUpperCase()}`.replace(
          /\s+/g,
          "",
        );

      return {
        variant_id,
        product_id: productId,
        size: v.size,
        color: v.color,
        stock_quantity: Number(v.stock_quantity) || 0,
        status: v.status || "active",
        updated_at: currentTime,
      };
    });

    // 5. Tiến hành cập nhật bảng thông tin sản phẩm chính
    const productUpdateData = {
      category_id,
      brand_id,
      product_name: product_name.trim(),
      image_urls: JSON.stringify(finalImageUrls),
      price,
      original_price,
      discount_price,
      description,
      status: status || "active",
      updated_at: currentTime,
    };
    const updatedProduct = await ProductModel.updateProduct(
      productId,
      productUpdateData,
    );

    // 6. Thực thi cập nhật/thêm mới các biến thể song song (Upsert)
    const savedVariants = await ProductModel.upsertVariants(variantsData);

    return {
      ...updatedProduct,
      image_urls: finalImageUrls,
      variants: savedVariants,
    };
  } catch (error) {
    console.error("Lỗi tại updateProductWithVariants Service:", error.message);
    throw error;
  }
};

// lấy tất cả sản phẩm cho admin
export const getAllProductsAdmin = async (page = 1, limit = 10) => {
  try {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;

    // Tính toán dải range cắt dữ liệu cho Supabase (bắt đầu từ 0)
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    // Gọi dữ liệu từ Model
    const { data, count } = await ProductModel.getAllProductsWithPagination(
      from,
      to,
    );

    // Tính tổng số trang
    const totalPages = Math.ceil(count / limitNum);

    // Chuẩn hóa lại dữ liệu trước khi gửi về client
    const formattedProducts = data.map((product) => {
      // Tính tổng tồn kho của tất cả variant
      const totalStock = (product.product_variants || []).reduce(
        (total, variant) => total + (Number(variant.stock_quantity) || 0),
        0,
      );

      return {
        product_id: product.product_id,
        product_name: product.product_name,
        image_url: getFirstImage(product.image_urls),
        price: product.price,
        original_price: product.original_price,
        discount_price: product.discount_price,
        status: product.status,
        category_name: product.categories ? product.categories.name : null,
        stock_quantity: totalStock,
      };
    });

    return {
      products: formattedProducts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total_items: count,
        total_pages: totalPages,
      },
    };
  } catch (error) {
    console.error("Lỗi tại getAllProductsAdminService:", error.message);
    throw error;
  }
};

// / Lấy chi tiết 1 sản phẩm kèm toàn bộ biến thể của nó
export const getProductDetailForAdmin = async (productId) => {
  try {
    if (!productId) {
      throw new Error("Mã ID sản phẩm không được để trống!");
    }

    // 1. Gọi Model lấy dữ liệu tổng hợp từ DB
    const rawProduct =
      await ProductModel.getProductDetailWithVariants(productId);

    if (!rawProduct) {
      throw new Error(`Không tìm thấy sản phẩm nào có ID là '${productId}'`);
    }

    // 2. Chuẩn hóa mảng ảnh image_urls từ chuỗi JSON
    let processedImages = rawProduct.image_urls;
    if (typeof rawProduct.image_urls === "string") {
      try {
        processedImages = JSON.parse(rawProduct.image_urls);
      } catch {
        processedImages = [];
      }
    }

    // 3. Khớp định dạng dữ liệu trả về gọn gàng nhất
    return {
      product_id: rawProduct.product_id,
      category_name: rawProduct.categories
        ? rawProduct.categories.name
        : null,
      brand_name: rawProduct.brands
        ? rawProduct.brands.name
        : null,
      product_name: rawProduct.product_name,
      product_url: rawProduct.product_url,
      image_urls: processedImages,
      price: Number(rawProduct.price),
      original_price: Number(rawProduct.original_price),
      discount_price: Number(rawProduct.discount_price),
      description: rawProduct.description,
      status: rawProduct.status,
      created_at: rawProduct.created_at,
      updated_at: rawProduct.updated_at,

      // Đổi tên trường từ product_variants thành variants ngắn gọn
      variants: rawProduct.product_variants || [],
    };
  } catch (error) {
    console.error("Lỗi tại getProductDetailService:", error.message);
    throw error;
  }
};
