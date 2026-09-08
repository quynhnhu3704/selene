// backend\product-service\src\models\product.model.js
import { supabase } from "../configs/supabase.js";

export const ProductModel = {
  // Lấy tất cả sản phẩm cho customer (Có phân trang)
  getProductsWithPagination: async (filters, from, to) => {
    const hasVariantFilter =
      filters.sizes.length > 0 || filters.colors.length > 0;

    let query = supabase
      .from("products")
      .select(
        `
        product_id,
        product_name,
        image_urls,
        original_price,
        discount_price,
        categories!inner (
          status
        )
        ${
          hasVariantFilter
            ? `,
        product_variants!inner (
          variant_id
        )`
            : ""
        }
      `,
        { count: "exact" },
      )
      .eq("status", "active")
      .eq("categories.status", "active"); // Chỉ hiển thị các sản phẩm đang mở bán công khai và thuộc danh mục đang hoạt động

    if (filters.q) {
      query = query.or(
        `product_name.ilike.%${filters.q}%,product_id.ilike.%${filters.q}%`,
      );
    }

    if (filters.categoryIds.length > 0) {
      query = query.in("category_id", filters.categoryIds);
    }

    if (filters.minPrice !== undefined) {
      query = query.gte("discount_price", filters.minPrice);
    }

    if (filters.maxPrice !== undefined) {
      query = query.lte("discount_price", filters.maxPrice);
    }

    if (hasVariantFilter) {
      query = query
        .eq("product_variants.status", "active")
        .gt("product_variants.stock_quantity", 0);

      if (filters.sizes.length > 0) {
        query = query.in("product_variants.size", filters.sizes);
      }

      if (filters.colors.length > 0) {
        query = query.in("product_variants.color", filters.colors);
      }
    }

    if (filters.sort === "az") {
      query = query.order("product_name", { ascending: true });
    } else if (filters.sort === "za") {
      query = query.order("product_name", { ascending: false });
    } else if (filters.sort === "price_asc") {
      query = query.order("discount_price", { ascending: true });
    } else if (filters.sort === "price_desc") {
      query = query.order("discount_price", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error, count } = await query
      .order("product_id", { ascending: true })
      .range(from, to); // Cắt dữ liệu theo trang

    if (error) throw error;
    return { data, count };
  },

  // Lấy chi tiết sản phẩm cho customer, chỉ chấp nhận sản phẩm đang mở bán
  getPublicProductById: async (productId) => {
    const { data: product, error: productError } = await supabase
      .from("products")
      .select(
        `
        product_id,
        product_name,
        image_urls,
        original_price,
        discount_price,
        description,
        brands:brand_id ( name ),
        categories!inner ( status )
      `,
      )
      .eq("product_id", productId)
      .eq("status", "active")
      .eq("categories.status", "active")
      .single();

    if (productError) throw productError;
    return product;
  },

  // Lấy thông tin chi tiết sản phẩm & tên thương hiệu
  getProductById: async (productId) => {
    const { data: product, error: productError } = await supabase
      .from("products")
      .select(
        `
        product_id,
        product_name,
        image_urls,
        original_price,
        discount_price,
        description,
        status,
        brands:brand_id ( name )
      `,
      )
      .eq("product_id", productId)
      .single();

    if (productError) {
      if (productError.code === "PGRST116") return null;
      throw productError;
    }
    return product;
  },

  // Lấy tất cả các biến thể kích thước / màu sắc của sản phẩm
  getProductVariants: async (productId) => {
    const { data: variants, error: variantError } = await supabase
      .from("product_variants")
      .select("variant_id, size, color, stock_quantity, status")
      .eq("product_id", productId)
      .eq("status", "active");

    if (variantError) throw variantError;
    return variants;
  },

  // Lấy các biến thể còn hàng để dựng dữ liệu sidebar filter cho customer
  getAvailableVariantsForFilter: async (from, to) => {
    const { data, error } = await supabase
      .from("products")
      .select(
        `
        image_urls,
        categories!inner ( status ),
        product_variants!inner (
          size,
          color
        )
      `,
      )
      .eq("status", "active")
      .eq("categories.status", "active")
      .eq("product_variants.status", "active")
      .gt("product_variants.stock_quantity", 0)
      .order("product_id", { ascending: true })
      .range(from, to);

    if (error) throw error;
    return data;
  },

  // Lấy giá thấp nhất / cao nhất từ sản phẩm public thực tế
  getCustomerPriceBounds: async () => {
    const [minResult, maxResult] = await Promise.all([
      supabase
        .from("products")
        .select("discount_price, categories!inner ( status )")
        .eq("status", "active")
        .eq("categories.status", "active")
        .not("discount_price", "is", null)
        .order("discount_price", { ascending: true })
        .limit(1),
      supabase
        .from("products")
        .select("discount_price, categories!inner ( status )")
        .eq("status", "active")
        .eq("categories.status", "active")
        .not("discount_price", "is", null)
        .order("discount_price", { ascending: false })
        .limit(1),
    ]);

    if (minResult.error) throw minResult.error;
    if (maxResult.error) throw maxResult.error;

    return {
      min: minResult.data?.[0]?.discount_price ?? 0,
      max: maxResult.data?.[0]?.discount_price ?? 0,
    };
  },

  // Tìm kiếm sản phẩm theo tên sử dụng ilike
  searchProductsByName: async (keyword, from, to) => {
    const { data, error, count } = await supabase
      .from("products")
      .select(
        `
        product_id,
        product_name,
        image_urls,
        original_price,
        discount_price,
        categories!inner ( status )
      `,
        { count: "exact" },
      )
      .eq("status", "active")
      .eq("categories.status", "active")
      .or(`product_name.ilike.%${keyword}%,product_id.ilike.%${keyword}%`)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { data, count };
  },

  // Tìm kiếm sản phẩm kèm filter theo danh mục
  searchProductsByCategory: async (categoryName, from, to) => {
    let query = supabase
      .from("products")
      .select(
        `
        product_id,
        product_name,
        image_urls,
        original_price,
        discount_price,
        categories!inner (
          name,
          status
        )
      `,
        { count: "exact" },
      )
      .eq("status", "active")
      .eq("categories.status", "active");

    if (categoryName) {
      query = query.ilike("categories.name", `%${categoryName}%`);
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { data, count };
  },

  // Upload nhiều file lên Supabase Storage
  uploadMultipleFilesToStorage: async (files) => {
    if (!files || files.length === 0) return [];

    const uploadPromises = files.map(async (file) => {
      const fileExt = file.originalname.split(".").pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { data, error } = await supabase.storage
        .from("products")
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (error)
        throw new Error(`Lỗi upload ảnh lên Storage: ${error.message}`);

      const { data: publicUrlData } = supabase.storage
        .from("products")
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    });

    return await Promise.all(uploadPromises); // Thực thi upload song song
  },

  // Hàm xóa danh sách file trên Supabase Storage dựa vào URL công khai
  deleteFilesFromStorage: async (urls) => {
    if (!urls || urls.length === 0) return;

    const filePaths = urls
      .map((url) => {
        const parts = url.split("/storage/v1/object/public/products/");
        return parts[1]; // Lấy phần sau tên bucket
      })
      .filter(Boolean);

    if (filePaths.length === 0) return;

    const { error } = await supabase.storage.from("products").remove(filePaths);

    if (error) {
      console.error("Lỗi khi xóa file cũ trên Storage:", error.message);
    }
  },

  // Chèn thông tin vào bảng products
  createProduct: async (productData) => {
    const { data, error } = await supabase
      .from("products")
      .insert([productData])
      .select();

    if (error) throw error;
    return data[0];
  },

  // Chèn hàng loạt biến thể vào bảng product_variants
  createVariants: async (variantsArray) => {
    const { data, error } = await supabase
      .from("product_variants")
      .insert(variantsArray)
      .select();

    if (error) throw error;
    return data;
  },

  // Cập nhật thông tin bảng products chính
  updateProduct: async (productId, productData) => {
    const { data, error } = await supabase
      .from("products")
      .update(productData)
      .eq("product_id", productId)
      .select();

    if (error) throw error;
    if (!data || data.length === 0)
      throw new Error("Không tìm thấy sản phẩm để cập nhật!");
    return data[0];
  },

  // Cập nhật riêng trạng thái hiển thị của sản phẩm
  updateProductStatus: async (productId, status, updatedAt) => {
    const { data, error } = await supabase
      .from("products")
      .update({
        status,
        updated_at: updatedAt,
      })
      .eq("product_id", productId)
      .select();

    if (error) throw error;
    if (!data || data.length === 0)
      throw new Error("Không tìm thấy sản phẩm để cập nhật!");
    return data[0];
  },

  // Cập nhật trạng thái cho tất cả các biến thể của một sản phẩm
  updateVariantsStatusByProductId: async (productId, status, updatedAt) => {
    const { data, error } = await supabase
      .from("product_variants")
      .update({
        status,
        updated_at: updatedAt,
      })
      .eq("product_id", productId)
      .select();

    if (error) throw error;
    return data;
  },

  // Lấy thông tin 1 biến thể sản phẩm theo ID
  getVariantById: async (variantId) => {
    const { data: variant, error } = await supabase
      .from("product_variants")
      .select("variant_id, product_id, size, color, stock_quantity, status, updated_at")
      .eq("variant_id", variantId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return variant;
  },

  // Cập nhật trạng thái của 1 biến thể sản phẩm
  updateVariantStatus: async (variantId, status, updatedAt) => {
    const { data, error } = await supabase
      .from("product_variants")
      .update({
        status,
        updated_at: updatedAt,
      })
      .eq("variant_id", variantId)
      .select();

    if (error) throw error;
    if (!data || data.length === 0)
      throw new Error("Không tìm thấy biến thể sản phẩm để cập nhật!");
    return data[0];
  },

  // Cập nhật trạng thái của tất cả sản phẩm thuộc một category
  updateProductsStatusByCategory: async (categoryId, status, updatedAt) => {
    const { data, error } = await supabase
      .from("products")
      .update({
        status,
        updated_at: updatedAt,
      })
      .eq("category_id", categoryId)
      .select();

    if (error) throw error;
    return data;
  },

  // Cập nhật trạng thái cho tất cả các biến thể của tất cả các sản phẩm thuộc một category
  updateVariantsStatusByCategory: async (categoryId, status, updatedAt) => {
    // 1. Lấy danh sách product_id thuộc category
    const { data: products, error: prodError } = await supabase
      .from("products")
      .select("product_id")
      .eq("category_id", categoryId);

    if (prodError) throw prodError;
    if (!products || products.length === 0) return [];

    const productIds = products.map((p) => p.product_id);

    // 2. Cập nhật trạng thái của tất cả các biến thể có product_id nằm trong danh sách
    const { data, error } = await supabase
      .from("product_variants")
      .update({
        status,
        updated_at: updatedAt,
      })
      .in("product_id", productIds)
      .select();

    if (error) throw error;
    return data;
  },

  // Chỉ cần duy nhất hàm này để vừa Update vừa Insert biến thể
  upsertVariants: async (variantsArray) => {
    const { data, error } = await supabase
      .from("product_variants")
      .upsert(variantsArray, {
        onConflict: ["variant_id", "product_id"],
      })
      .select();

    if (error) throw error;
    return data;
  },

  // lấy tất cả sản phẩm cho admin kèm các điều kiện lọc
  getAllProductsWithPagination: async (filters, from, to) => {
    let query = supabase.from("products").select(
      `
        product_id,
        product_name,
        image_urls,
        price,
        original_price,
        discount_price,
        category_id,
        categories: category_id (
          category_id,
          name
        ),
        product_variants (
          stock_quantity
        ),
        status
      `,
      { count: "exact" },
    ); // Đếm tổng số bản ghi thực tế trong DB

    if (filters.q) {
      query = query.or(
        `product_name.ilike.%${filters.q}%,product_id.ilike.%${filters.q}%`,
      );
    }

    if (filters.category) {
      query = query.eq("category_id", filters.category);
    }

    if (filters.price?.min !== undefined) {
      query = query.gte("price", filters.price.min);
    }

    if (filters.price?.max !== undefined) {
      query = query.lt("price", filters.price.max);
    }

    if (filters.status === "inactive" || filters.status === "archived") {
      // Hỗ trợ cả dữ liệu cũ dùng `inactive` và dữ liệu mới dùng `archived`
      query = query.in("status", ["inactive", "archived"]);
    }

    if (filters.status === "active") {
      query = query.eq("status", "active");
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false }) // Sản phẩm mới nhất xếp lên đầu
      .order("product_id", { ascending: true }) // Nếu cùng ngày tạo thì sắp xếp theo product_id tăng dần
      .range(from, to); // Cắt dữ liệu theo trang

    if (error) throw error;
    return { data, count };
  },

  // Lấy chi tiết 1 sản phẩm kèm toàn bộ biến thể của nó
  getProductDetailWithVariants: async (productId) => {
    const { data, error } = await supabase
      .from("products")
      .select(
        `
        product_id,
        product_name,
        image_urls,
        product_url,
        price,
        original_price,
        discount_price,
        description,
        status,
        product_variants (
          variant_id,
          size,
          color,
          stock_quantity,
          status
        ),
        categories:category_id (
          name
        ),
        brands:brand_id (
          name
        )
      `,
      )
      .eq("product_id", productId)
      .single(); // Trả về 1 Object duy nhất thay vì mảng dữ liệu

    if (error) {
      // Nếu không tìm thấy bản ghi nào (PostgreSQL trả mã PGRST116)
      if (error.code === "PGRST116") return null;
      throw error;
    }

    return data;
  },
};
