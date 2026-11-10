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

const ADMIN_PRODUCT_SORT_OPTIONS = [
  "",
  "default",
  "az",
  "za",
  "price_asc",
  "price_desc",
  "stock_asc",
  "stock_desc",
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

const resolveVariantStatus = (stockQuantity, currentStatus) => {
  const stock = Number(stockQuantity) || 0;
  if (stock === 0) {
    return "out_of_stock";
  }
  if (!currentStatus || currentStatus === "out_of_stock") {
    return "active";
  }
  return currentStatus;
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
  const sort = getQueryValue(options.sort);

  if (priceKey && !ADMIN_PRODUCT_PRICE_RANGES[priceKey]) {
    throw new Error("Khoảng giá lọc không hợp lệ!");
  }

  if (status && !ADMIN_PRODUCT_STATUSES.includes(status)) {
    throw new Error("Trạng thái lọc không hợp lệ!");
  }

  if (!ADMIN_PRODUCT_SORT_OPTIONS.includes(sort)) {
    throw new Error("Kiểu sắp xếp không hợp lệ!");
  }

  return {
    q,
    category,
    price: priceKey ? ADMIN_PRODUCT_PRICE_RANGES[priceKey] : null,
    status,
    sort: sort === "default" ? "" : sort,
  };
};

// Trích xuất ảnh theo thứ tự từ dữ liệu image_urls trong DB.
const getProductImage = (imageUrlsData, index = 0) => {
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

  // Nếu là mảng, lấy ảnh ở vị trí yêu cầu.
  if (Array.isArray(parsedImages) && parsedImages.length > 0) {
    return parsedImages[index] || "";
  }

  // Trường hợp dữ liệu sau khi xử lý vẫn là chuỗi URL đơn thuần
  if (typeof parsedImages === "string") {
    return index === 0 ? parsedImages : "";
  }

  return "";
};

const getFirstImage = (imageUrlsData) => getProductImage(imageUrlsData);

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

    const formattedProducts = (data || []).map((product) => {
      const activeVariants = (product.product_variants || []).filter(
        (v) => v.status !== "inactive" && v.status !== "archived",
      );
      const totalStock = activeVariants.reduce(
        (total, variant) => total + (Number(variant.stock_quantity) || 0),
        0,
      );

      return {
        product_id: product.product_id,
        product_name: product.product_name,
        image_url: getFirstImage(product.image_urls),
        second_image_url: getProductImage(product.image_urls, 1),
        category_name: product.categories?.name || null,
        discount_price: product.discount_price,
        original_price: product.original_price,
        stock_quantity: totalStock,
        is_out_of_stock: totalStock <= 0,
        variants: product.product_variants || [],
      };
    });

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

    const formattedProducts = data.map((product) => {
      const activeVariants = (product.product_variants || []).filter(
        (v) => v.status !== "inactive" && v.status !== "archived",
      );
      const totalStock = activeVariants.reduce(
        (total, variant) => total + (Number(variant.stock_quantity) || 0),
        0,
      );

      return {
        product_id: product.product_id,
        product_name: product.product_name,
        image_url: getFirstImage(product.image_urls),
        discount_price: product.discount_price,
        original_price: product.original_price,
        stock_quantity: totalStock,
        is_out_of_stock: totalStock <= 0,
        variants: product.product_variants || [],
      };
    });

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

    const formattedProducts = data.map((product) => {
      const activeVariants = (product.product_variants || []).filter(
        (v) => v.status !== "inactive" && v.status !== "archived",
      );
      const totalStock = activeVariants.reduce(
        (total, variant) => total + (Number(variant.stock_quantity) || 0),
        0,
      );

      return {
        product_id: product.product_id,
        product_name: product.product_name,
        image_url: getFirstImage(product.image_urls),
        discount_price: product.discount_price,
        original_price: product.original_price,
        category_name: product.categories?.name || null,
        stock_quantity: totalStock,
        is_out_of_stock: totalStock <= 0,
        variants: product.product_variants || [],
      };
    });

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

// Create validates the complete payload before uploading or writing anything.
export const createProductWithVariants = async (inputData, files = []) => {
  const invalid = (field) => {
    const error = new Error(`${field} không hợp lệ!`);
    error.status = 400;
    throw error;
  };
  const parseArray = (value, field) => {
    try {
      const parsed = typeof value === "string" ? JSON.parse(value) : value;
      if (!Array.isArray(parsed)) invalid(field);
      return parsed;
    } catch { invalid(field); }
  };
  const { product_name, category_id, description = "", status = "active" } = inputData;
  if (typeof product_name !== "string" || !product_name.trim() || product_name.trim().length > 120)
    invalid("Tên sản phẩm");
  if (typeof description !== "string") invalid("Mô tả");
  if (typeof category_id !== "string" || !category_id.trim()) invalid("Danh mục");
  if (!["active", "inactive", "archived"].includes(status)) invalid("Trạng thái sản phẩm");
  const prices = {};
  for (const field of ["price", "original_price", "discount_price"]) {
    const value = field === "discount_price" && (inputData[field] == null || inputData[field] === "")
      ? inputData.price : inputData[field];
    if (!["string", "number"].includes(typeof value) || String(value).trim() === "" ||
        !Number.isFinite(Number(value)) || Number(value) < 0) invalid("Giá sản phẩm");
    prices[field] = Number(value);
  }
  if (prices.discount_price > prices.price) invalid("Giá khuyến mãi vượt giá bán");
  const variants = parseArray(inputData.variants, "Danh sách biến thể");
  if (!variants.length) invalid("Sản phẩm phải có ít nhất một biến thể");
  const keys = new Set();
  const normalizedVariants = variants.map((v) => {
    if (!v || typeof v.size !== "string" || typeof v.color !== "string" ||
        !v.size.trim() || !v.color.trim() || v.size.trim().length > 50 || v.color.trim().length > 50)
      invalid("Kích thước hoặc màu sắc (tối đa 50 ký tự)");
    const size = v.size.trim();
    const color = v.color.trim();
    const key = JSON.stringify([size.toUpperCase(), color.toUpperCase()]);
    if (keys.has(key)) invalid("Biến thể trùng kích thước và màu sắc");
    keys.add(key);
    if (!["string", "number"].includes(typeof v.stock_quantity) || String(v.stock_quantity).trim() === "" ||
        !Number.isInteger(Number(v.stock_quantity)) || Number(v.stock_quantity) < 0 || Number(v.stock_quantity) > 2147483647)
      invalid("Tồn kho");
    if (v.variant_id) invalid("Mã biến thể mới");
    const stock = Number(v.stock_quantity);
    const variantStatus = v.status || "active";
    if (!["active", "inactive", "archived", "out_of_stock"].includes(variantStatus)) invalid("Trạng thái biến thể");
    return { size, color, stock_quantity: stock,
      status: ["inactive", "archived"].includes(variantStatus) ? variantStatus : resolveVariantStatus(stock, variantStatus) };
  });
  if (!Array.isArray(files) || files.length < 1 || files.length > 10) invalid("Số lượng ảnh (1–10)");
  if (files.some((f) => !f.mimetype?.startsWith("image/") || !f.size || f.size > 5 * 1024 * 1024)) invalid("Tệp ảnh (tối đa 5 MB)");
  const order = inputData.image_order === undefined
    ? files.map((_, upload) => ({ upload }))
    : parseArray(inputData.image_order, "Thứ tự ảnh");
  if (order.length !== files.length || new Set(order.map((e) => e?.upload)).size !== files.length ||
      order.some((e) => !e || e.url !== undefined || !Number.isInteger(e.upload) || e.upload < 0 || e.upload >= files.length))
    invalid("Thứ tự ảnh");
  if (inputData.old_image_urls !== undefined && parseArray(inputData.old_image_urls, "Ảnh cũ").length) invalid("Ảnh cũ của sản phẩm mới");
  const category = await CategoryModel.getCategoryById(category_id);
  if (!category || category.status === "inactive" || category.status === "archived") invalid("Danh mục sản phẩm");
  // The existing database requires a brand FK. Keep that internal, without a form field.
  let brandId = inputData.brand_id;
  if (brandId) {
    if (typeof brandId !== "string" || !(await BrandModel.getBrandNameById(brandId))) invalid("Thương hiệu");
  } else {
    brandId = await BrandModel.ensureDefaultBrand();
  }
  const productId = generateId();
  const now = new Date().toISOString();
  const variantData = normalizedVariants.map((v, index) => ({
    ...v, variant_id: `SELENE-${productId}-${index + 1}`, product_id: productId,
    created_at: now, updated_at: now,
  }));
  const uploadedUrls = await ProductModel.uploadMultipleFilesToStorage(files);
  const imageUrls = order.map((entry) => uploadedUrls[entry.upload]);
  let created = false;
  try {
    const product = await ProductModel.createProduct({
      product_id: productId, category_id, brand_id: brandId, product_name: product_name.trim(),
      description, ...prices, status, image_urls: JSON.stringify(imageUrls), product_url: null,
      created_at: now, updated_at: now,
    });
    created = true;
    const savedVariants = await ProductModel.createVariants(variantData);
    return { ...product, image_urls: imageUrls, variants: savedVariants };
  } catch (error) {
    try {
      if (created) await ProductModel.deleteCreatedProduct(productId);
      await ProductModel.deleteFilesFromStorage(uploadedUrls);
    } catch (cleanupError) {
      console.error("Không thể hoàn tác tạo sản phẩm:", cleanupError.message);
    }
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

    const invalid = (message) => {
      throw new Error(`${message} không hợp lệ!`);
    };
    const currentUrls =
      typeof existingProduct.image_urls === "string"
        ? JSON.parse(existingProduct.image_urls)
        : existingProduct.image_urls || [];
    if (
      !Array.isArray(finalImageUrls) ||
      finalImageUrls.some((url) => !currentUrls.includes(url))
    )
      invalid("Ảnh giữ lại");
    if (!product_name?.trim() || product_name.trim().length > 120)
      invalid("Tên sản phẩm");
    for (const value of [price, original_price, discount_price]) {
      if (
        value === undefined ||
        value === null ||
        String(value).trim() === "" ||
        !Number.isFinite(Number(value)) ||
        Number(value) < 0
      )
        invalid("Giá sản phẩm");
    }
    if (!["active", "inactive", "archived"].includes(status))
      invalid("Trạng thái sản phẩm");
    const detail = await ProductModel.getProductDetailWithVariants(productId);
    const existingVariants = detail.product_variants || [];
    const categoryRecord = await CategoryModel.getCategoryById(category_id);
    if (!categoryRecord) invalid("Danh mục sản phẩm");
    const keys = new Set();
    const ids = new Set();
    for (const variant of parsedVariants) {
      if (
        typeof variant.size !== "string" ||
        !variant.size.trim() ||
        typeof variant.color !== "string" ||
        !variant.color.trim()
      )
        invalid("Kích thước hoặc màu sắc");
      const key = JSON.stringify([
        variant.size.trim().toUpperCase(),
        variant.color.trim().toUpperCase(),
      ]);
      if (keys.has(key)) invalid("Biến thể trùng kích thước và màu sắc");
      keys.add(key);
      if (
        variant.stock_quantity == null ||
        String(variant.stock_quantity).trim() === "" ||
        !Number.isSafeInteger(Number(variant.stock_quantity)) ||
        Number(variant.stock_quantity) < 0
      )
        invalid("Tồn kho");
      if (
        !["active", "inactive", "archived", "out_of_stock"].includes(
          variant.status,
        )
      )
        invalid("Trạng thái biến thể");
      if (variant.variant_id) {
        if (
          ids.has(variant.variant_id) ||
          !existingVariants.some(
            (item) => item.variant_id === variant.variant_id,
          )
        )
          invalid("Mã biến thể");
        ids.add(variant.variant_id);
      }
    }
    if (existingVariants.some((variant) => !ids.has(variant.variant_id)))
      invalid("Danh sách biến thể bị thiếu");
    if (
      finalImageUrls.length + (files?.length || 0) < 1 ||
      finalImageUrls.length + (files?.length || 0) > 10
    )
      invalid("Số lượng ảnh (1–10)");
    if (
      (files || []).some(
        (file) =>
          !file.mimetype.startsWith("image/") || file.size > 5 * 1024 * 1024,
      )
    )
      invalid("Tệp ảnh");
    const imageOrder = inputData.image_order
      ? JSON.parse(inputData.image_order)
      : null;
    if (imageOrder) {
      if (
        !Array.isArray(imageOrder) ||
        imageOrder.length !== finalImageUrls.length + (files?.length || 0)
      )
        invalid("Thứ tự ảnh");
      const entries = new Set();
      for (const entry of imageOrder) {
        if (
          !entry ||
          (entry.url === undefined
            ? !Number.isInteger(entry.upload) ||
              entry.upload < 0 ||
              entry.upload >= (files?.length || 0)
            : !finalImageUrls.includes(entry.url))
        )
          invalid("Thứ tự ảnh");
        const key =
          entry.url === undefined ? `upload:${entry.upload}` : entry.url;
        if (entries.has(key)) invalid("Ảnh trùng lặp");
        entries.add(key);
      }
    }
    const urlsToDelete = currentUrls.filter(
      (url) => !finalImageUrls.includes(url),
    );

    // 3. Kiểm tra thương hiệu hợp lệ
    const effectiveBrandId = brand_id || existingProduct.brand_id || await BrandModel.ensureDefaultBrand();
    const dbBrandName = await BrandModel.getBrandNameById(effectiveBrandId);
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

      const stock = Number(v.stock_quantity);
      const variantStatus = ["inactive", "archived"].includes(v.status)
        ? v.status
        : resolveVariantStatus(stock, v.status);

      return {
        variant_id,
        product_id: productId,
        size: cleanSize,
        color: cleanColor,
        stock_quantity: stock,
        status: variantStatus,
        updated_at: currentTime,
      };
    });

    const generatedIds = variantsData.map((variant) => variant.variant_id);
    if (new Set(generatedIds).size !== generatedIds.length)
      invalid("Mã biến thể trùng lặp");
    const uploadedUrls = await ProductModel.uploadMultipleFilesToStorage(
      files || [],
    );
    finalImageUrls = imageOrder
      ? imageOrder.map((entry) => entry.url ?? uploadedUrls[entry.upload])
      : [...finalImageUrls, ...uploadedUrls];

    // 5. Tiến hành cập nhật bảng thông tin sản phẩm chính
    const productUpdateData = {
      category_id,
      brand_id: effectiveBrandId,
      product_name: product_name.trim(),
      image_urls: JSON.stringify(finalImageUrls),
      price: Number(price),
      original_price: Number(original_price),
      discount_price: Number(discount_price),
      description,
      status,
      updated_at: currentTime,
    };
    let updatedProduct;
    let savedVariants;
    try {
      updatedProduct = await ProductModel.updateProduct(
        productId,
        productUpdateData,
      );
      savedVariants = await ProductModel.upsertVariants(variantsData);
    } catch (saveError) {
      // A PostgREST upsert is atomic for the variant batch. Restore the parent
      // only if this request still owns its version; retain images on conflict.
      try {
        let restored = !updatedProduct;
        if (updatedProduct) {
          const snapshot = Object.fromEntries(
            Object.keys(productUpdateData).map((key) => [key, detail[key]]),
          );
          restored = await ProductModel.restoreProductAfterFailedUpdate(
            productId,
            currentTime,
            snapshot,
          );
        }
        if (restored) await ProductModel.deleteFilesFromStorage(uploadedUrls);
      } catch (cleanupError) {
        console.error(
          "Không thể hoàn tác cập nhật sản phẩm:",
          cleanupError.message,
        );
      }
      throw saveError;
    }
    // Storage cleanup must not turn a completed database save into a failed response.
    try {
      await ProductModel.deleteFilesFromStorage(urlsToDelete);
    } catch (cleanupError) {
      console.error("Không thể dọn ảnh cũ:", cleanupError.message);
    }

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

// khóa hoặc mở khóa biến thể sản phẩm (toggle hoặc set trạng thái active/inactive)
export const updateVariantStatus = async (variantId, status) => {
  try {
    if (!variantId) {
      throw new Error("Mã ID biến thể không được để trống!");
    }

    // 1. Lấy thông tin biến thể hiện tại để kiểm tra sự tồn tại và xác định trạng thái cũ
    const variant = await ProductModel.getVariantById(variantId);
    if (!variant) {
      throw new Error("Không tìm thấy biến thể yêu cầu!");
    }

    // 2. Xác định trạng thái mới dựa trên đầu vào (hoặc toggle nếu không truyền)
    let databaseStatus;
    if (status !== undefined && status !== null && status !== "") {
      if (status === "active") {
        databaseStatus = "active";
      } else if (status === "inactive" || status === "archived") {
        databaseStatus = "inactive";
      } else {
        throw new Error("Trạng thái biến thể không hợp lệ!");
      }
    } else {
      // Toggle trạng thái nếu không truyền status cụ thể
      databaseStatus = variant.status === "active" ? "inactive" : "active";
    }

    const updatedAt = new Date().toISOString();

    // 3. Cập nhật trạng thái của biến thể
    const updatedVariant = await ProductModel.updateVariantStatus(
      variantId,
      databaseStatus,
      updatedAt,
    );

    return {
      variant_id: updatedVariant.variant_id,
      product_id: updatedVariant.product_id,
      size: updatedVariant.size,
      color: updatedVariant.color,
      status: databaseStatus === "active" ? "active" : "inactive",
      updated_at: updatedVariant.updated_at,
    };
  } catch (error) {
    console.error("Lỗi tại updateVariantStatus Service:", error.message);
    throw error;
  }
};

// Lấy chi tiết 1 sản phẩm kèm toàn bộ biến thể của nó
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
      category_id: rawProduct.category_id,
      brand_id: rawProduct.brand_id,
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
