// backend\product-service\src\services\product.service.js
import { ProductModel } from "../models/product.model.js";
import { BrandModel } from "../models/brand.model.js";
import { CategoryModel } from "../models/category.model.js";

const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
};

const ADMIN_PRODUCT_PRICE_RANGES = {
  "under-200k": { max: 200000 },
  "200k-500k": { min: 200000, max: 500000 },
  "500k-1m": { min: 500000, max: 1000000 },
  "over-1m": { min: 1000000 },
};

const ADMIN_PRODUCT_STATUSES = ["active", "inactive"];

const CUSTOMER_PRODUCT_SORT_OPTIONS = [
  "",
  "default",
  "az",
  "za",
  "price_asc",
  "price_desc",
];

const AO_CHILD_CATEGORY_NAMES = [
  "Áo cổ",
  "Áo công sở",
  "Áo dài",
  "Áo khoác",
  "Áo ký giả",
  "Áo lụa",
  "Áo sơ mi",
  "Áo thêu",
  "Áo thiết kế",
  "Áo thô",
  "Áo tơ",
  "Áo vest và gile",
  "Áo voan",
];

const CUSTOMER_ROOT_CATEGORY_NAMES = [
  "Áo",
  "Chân váy",
  "Đầm",
  "Quần",
  "Set bộ",
];
const FILTER_VARIANT_BATCH_SIZE = 1000;

const getPositiveInteger = (value, defaultValue) => {
  const parsedValue = parseInt(value, 10);
  return parsedValue > 0 ? parsedValue : defaultValue;
};

const getQueryValue = (value) => {
  return typeof value === "string" ? value.trim() : "";
};

const getQueryValues = (value) => {
  return getQueryValue(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30);
};

const getOptionalPrice = (value, label) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    throw new Error(`${label} không hợp lệ!`);
  }

  return Math.round(parsedValue);
};

const normalizeCategoryName = (name) => {
  return getQueryValue(name).toLocaleLowerCase("vi");
};

const getCustomerProductQueryFilters = (options) => {
  const minPrice = getOptionalPrice(options.min_price, "Giá tối thiểu");
  const maxPrice = getOptionalPrice(options.max_price, "Giá tối đa");
  const sort = getQueryValue(options.sort);

  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new Error("Khoảng giá lọc không hợp lệ!");
  }

  if (!CUSTOMER_PRODUCT_SORT_OPTIONS.includes(sort)) {
    throw new Error("Kiểu sắp xếp không hợp lệ!");
  }

  return {
    q: getQueryValue(options.q).replace(/[(),]/g, " ").slice(0, 100),
    categoryIds: getQueryValues(options.category),
    sizes: getQueryValues(options.sizes),
    colors: getQueryValues(options.colors),
    minPrice,
    maxPrice,
    sort: sort === "default" ? "" : sort,
  };
};

const sortCategoriesByName = (categories, names) => {
  const positionByName = new Map(
    names.map((name, index) => [normalizeCategoryName(name), index]),
  );

  return [...categories].sort((firstCategory, secondCategory) => {
    const firstPosition = positionByName.get(
      normalizeCategoryName(firstCategory.name),
    );
    const secondPosition = positionByName.get(
      normalizeCategoryName(secondCategory.name),
    );

    return (
      (firstPosition ?? Number.MAX_SAFE_INTEGER) -
        (secondPosition ?? Number.MAX_SAFE_INTEGER) ||
      firstCategory.name.localeCompare(secondCategory.name, "vi")
    );
  });
};

const buildCustomerCategoryTree = (categories) => {
  const shirtCategory = categories.find(
    (category) => normalizeCategoryName(category.name) === "áo",
  );
  const shirtChildNameSet = new Set(
    AO_CHILD_CATEGORY_NAMES.map(normalizeCategoryName),
  );
  const shirtChildren = sortCategoriesByName(
    categories.filter((category) =>
      shirtChildNameSet.has(normalizeCategoryName(category.name)),
    ),
    AO_CHILD_CATEGORY_NAMES,
  );

  const rootCategories = sortCategoriesByName(
    categories.filter((category) => {
      const normalizedName = normalizeCategoryName(category.name);

      return normalizedName !== "áo" && !shirtChildNameSet.has(normalizedName);
    }),
    CUSTOMER_ROOT_CATEGORY_NAMES,
  );

  return [
    ...(shirtCategory
      ? [
          {
            ...shirtCategory,
            children: shirtChildren,
          },
        ]
      : []),
    ...rootCategories.map((category) => ({ ...category, children: [] })),
  ];
};

const getExpandedCustomerCategoryIds = async (categoryIds) => {
  if (categoryIds.length === 0) return [];

  const categories = await CategoryModel.getActiveCategoriesForProductFilter();
  const shirtCategory = categories.find(
    (category) => normalizeCategoryName(category.name) === "áo",
  );

  if (!shirtCategory || !categoryIds.includes(shirtCategory.category_id)) {
    return categoryIds;
  }

  const shirtChildNameSet = new Set(
    AO_CHILD_CATEGORY_NAMES.map(normalizeCategoryName),
  );
  const shirtChildIds = categories
    .filter((category) =>
      shirtChildNameSet.has(normalizeCategoryName(category.name)),
    )
    .map((category) => category.category_id);

  return [...new Set([...categoryIds, ...shirtChildIds])];
};

const getAdminProductFilters = (options) => {
  const q = getQueryValue(options.q);
  const category = getQueryValue(options.category);
  const priceKey = getQueryValue(options.price);
  const status = getQueryValue(options.status);

  if (priceKey && !ADMIN_PRODUCT_PRICE_RANGES[priceKey]) {
    throw new Error("Khoảng giá lọc không hợp lệ!");
  }

  if (status && !ADMIN_PRODUCT_STATUSES.includes(status)) {
    throw new Error("Trạng thái lọc không hợp lệ!");
  }

  return {
    q,
    category,
    price: priceKey ? ADMIN_PRODUCT_PRICE_RANGES[priceKey] : null,
    status,
  };
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
    const page = getPositiveInteger(options.page, 1);
    const limit = getPositiveInteger(options.limit, 12);
    const filters = getCustomerProductQueryFilters(options);
    const categoryIds = await getExpandedCustomerCategoryIds(
      filters.categoryIds,
    );
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 2. Gọi Model lấy dữ liệu từ DB
    const { data, count } = await ProductModel.getProductsWithPagination(
      {
        ...filters,
        categoryIds,
      },
      from,
      to,
    );

    const formattedProducts = (data || []).map((product) => ({
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

    if (error.message.includes("không hợp lệ")) {
      throw error;
    }

    throw new Error(
      "Không thể kết nối đến Supabase để lấy danh sách sản phẩm!",
    );
  }
};

// Lấy toàn bộ dữ liệu thực tế để dựng sidebar filter phía customer
export const getCustomerProductFilters = async () => {
  try {
    const [categories, priceBounds] = await Promise.all([
      CategoryModel.getActiveCategoriesForProductFilter(),
      ProductModel.getCustomerPriceBounds(),
    ]);

    const availableProducts = [];
    let from = 0;

    while (true) {
      const batch = await ProductModel.getAvailableVariantsForFilter(
        from,
        from + FILTER_VARIANT_BATCH_SIZE - 1,
      );

      availableProducts.push(...batch);

      if (batch.length < FILTER_VARIANT_BATCH_SIZE) break;
      from += FILTER_VARIANT_BATCH_SIZE;
    }

    const sizes = new Set();
    const colors = new Map();

    availableProducts.forEach((product) => {
      const imageUrl = getFirstImage(product.image_urls);

      (product.product_variants || []).forEach((variant) => {
        const size = getQueryValue(variant.size);
        const color = getQueryValue(variant.color);

        if (size) sizes.add(size);

        if (color) {
          const existingColor = colors.get(color);

          if (!existingColor || (!existingColor.image_url && imageUrl)) {
            colors.set(color, {
              value: color,
              label: color,
              image_url: imageUrl,
            });
          }
        }
      });
    });

    return {
      categories: buildCustomerCategoryTree(categories),
      sizes: [...sizes]
        .sort((firstSize, secondSize) =>
          firstSize.localeCompare(secondSize, "vi", { numeric: true }),
        )
        .map((size) => ({ value: size, label: size })),
      colors: [...colors.values()].sort((firstColor, secondColor) =>
        firstColor.label.localeCompare(secondColor.label, "vi"),
      ),
      price: {
        min: Number(priceBounds.min) || 0,
        max: Number(priceBounds.max) || 0,
      },
    };
  } catch (error) {
    console.error("Lỗi tại getCustomerProductFilters Service:", error.message);
    throw new Error("Không thể lấy dữ liệu bộ lọc sản phẩm!");
  }
};

// xem chi tiết sản phẩm
export const getProductDetail = async (productId) => {
  try {
    // 1. Gọi Model lấy chi tiết sản phẩm
    const product = await ProductModel.getPublicProductById(productId);
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
export const getAllProductsAdmin = async (options = {}) => {
  try {
    const pageNum = getPositiveInteger(options.page, 1);
    const limitNum = getPositiveInteger(options.limit, 10);
    const filters = getAdminProductFilters(options);

    // Tính toán dải range cắt dữ liệu cho Supabase (bắt đầu từ 0)
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    // Gọi dữ liệu từ Model
    const { data, count } = await ProductModel.getAllProductsWithPagination(
      filters,
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
        price: Number(product.price) || 0,
        original_price: Number(product.original_price) || 0,
        discount_price: Number(product.discount_price) || 0,
        status: product.status === "active" ? "active" : "inactive",
        category_id: product.category_id,
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

// khóa hoặc mở khóa sản phẩm
export const updateProductStatus = async (productId, status) => {
  try {
    if (!productId) {
      throw new Error("Mã ID sản phẩm không được để trống!");
    }

    // 1. Lấy thông tin sản phẩm hiện tại để kiểm tra sự tồn tại và xác định trạng thái cũ
    const product = await ProductModel.getProductById(productId);
    if (!product) {
      throw new Error("Không tìm thấy sản phẩm yêu cầu!");
    }

    // 2. Xác định trạng thái mới dựa trên đầu vào (hoặc toggle nếu không truyền)
    let databaseStatus;
    if (status !== undefined && status !== null && status !== "") {
      if (status === "active") {
        databaseStatus = "active";
      } else if (status === "inactive" || status === "archived") {
        databaseStatus = "inactive";
      } else {
        throw new Error("Trạng thái sản phẩm không hợp lệ!");
      }
    } else {
      // Toggle trạng thái nếu không truyền status cụ thể
      databaseStatus = product.status === "active" ? "inactive" : "active";
    }

    const updatedAt = new Date().toISOString();

    // 3. Cập nhật trạng thái của sản phẩm chính
    const updatedProduct = await ProductModel.updateProductStatus(
      productId,
      databaseStatus,
      updatedAt,
    );

    // 4. Đồng thời cập nhật trạng thái và updated_at của tất cả các biến thể thuộc sản phẩm này
    await ProductModel.updateVariantsStatusByProductId(
      productId,
      databaseStatus,
      updatedAt,
    );

    return {
      product_id: updatedProduct.product_id,
      product_name: updatedProduct.product_name,
      status: databaseStatus === "active" ? "active" : "inactive",
      updated_at: updatedProduct.updated_at,
    };
  } catch (error) {
    console.error("Lỗi tại updateProductStatus Service:", error.message);
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
      category_name: rawProduct.categories ? rawProduct.categories.name : null,
      brand_name: rawProduct.brands ? rawProduct.brands.name : null,
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
