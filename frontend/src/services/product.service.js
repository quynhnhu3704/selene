// frontend/src/services/product.service.js
import http from "./http";

export const getProducts = async (filters = {}, fallbackLimit = 12, { signal } = {}) => {
  const normalizedFilters =
    typeof filters === "number"
      ? { page: filters, limit: fallbackLimit }
      : filters;
  const {
    q,
    categories = [],
    sizes = [],
    colors = [],
    minPrice,
    maxPrice,
    sort,
    page = 1,
    limit = 12,
  } = normalizedFilters;
  const params = { limit };

  if (q) params.q = q;
  if (categories.length > 0) params.category = categories.join(",");
  if (sizes.length > 0) params.sizes = sizes.join(",");
  if (colors.length > 0) params.colors = colors.join(",");
  if (minPrice !== undefined && minPrice !== null) {
    params.min_price = minPrice;
  }
  if (maxPrice !== undefined && maxPrice !== null) {
    params.max_price = maxPrice;
  }
  if (sort && sort !== "default") params.sort = sort;
  if (Number(page) > 1) params.page = page;

  const res = await http.get("/products/product-list", {
    signal,
    params,
    withCredentials: false,
  });

  return res.data;
};

// Lấy dữ liệu thật để dựng sidebar filter cho customer
export const getProductFilterOptions = async ({ signal } = {}) => {
  const res = await http.get("/products/product-filters", {
    signal,
    withCredentials: false,
  });

  return res.data;
};

const productCache = new Map();
const pendingProducts = new Map();
const PRODUCT_CACHE_TTL = 60_000;
const PRODUCT_CACHE_LIMIT = 40;

export const getCachedProductById = (id) => {
  const key = String(id);
  const entry = productCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    productCache.delete(key);
    return null;
  }
  return entry.value;
};

export const getProductById = (id) => {
  const key = String(id);
  const cached = getCachedProductById(key);
  if (cached) return Promise.resolve(cached);
  if (pendingProducts.has(key)) return pendingProducts.get(key);

  const request = http
    .get(`/products/product-detail/${encodeURIComponent(key)}`, {
      withCredentials: false,
    })
    .then((res) => {
      if (res.data?.data) {
        productCache.delete(key);
        productCache.set(key, {
          value: res.data,
          expiresAt: Date.now() + PRODUCT_CACHE_TTL,
        });
        if (productCache.size > PRODUCT_CACHE_LIMIT) {
          productCache.delete(productCache.keys().next().value);
        }
      }
      return res.data;
    })
    .finally(() => pendingProducts.delete(key));

  pendingProducts.set(key, request);
  return request;
};

export const prefetchProduct = (id) => {
  if (id == null) return;
  // A failed speculative request must not interrupt navigation; the page retries.
  void getProductById(id).catch(() => {});
};

// Lấy danh sách sản phẩm cho Admin
export const getAdminProducts = async (filters = {}) => {
  const { q, category, price, status, sort, page = 1, limit = 10 } = filters;
  const params = { limit };

  if (q) params.q = q;
  if (category) params.category = category;
  if (price) params.price = price;
  if (status) params.status = status;
  if (sort && sort !== "default") params.sort = sort;
  if (Number(page) > 1) params.page = page;

  const res = await http.get("/products/manage/products", {
    params,
  });

  return res.data;
};

// Lấy danh sách danh mục để hiển thị bộ lọc Admin
export const getAdminProductCategories = async () => {
  const res = await http.get("/products/manage/product-categories");

  return res.data;
};

// Khóa hoặc mở khóa sản phẩm
export const updateAdminProductStatus = async (productId, status) => {
  const res = await http.put(
    `/products/manage/product/change-status/${productId}`,
    {
      status,
    },
  );

  return res.data;
};

// Xuất danh sách sản phẩm ra Excel (trả về Blob)
export const exportProductsToExcel = async () => {
  const res = await http.get("/products/manage/products/export", {
    responseType: "blob",
  });

  return res.data;
};

// Lấy chi tiết sản phẩm cho Admin
export const getAdminProductDetail = async (productId) => {
  const res = await http.get(`/products/manage/product-detail/${productId}`);
  return res.data;
};

// Cập nhật sản phẩm cho Admin (Hỗ trợ gửi FormData chứa cả ảnh và biến thể)
export const updateAdminProduct = async (productId, formData) => {
  const res = await http.put(
    `/products/manage/product/update/${productId}`,
    formData,
  );

  return res.data;
};
