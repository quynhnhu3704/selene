// backend\product-service\src\models\promotion.model.js
import { supabase } from "../configs/supabase.js";

export const PromotionModel = {
  // Kiểm tra tên chương trình khuyến mãi đã tồn tại chưa
  checkNameExists: async (name) => {
    const { data, error } = await supabase
      .from("promotions")
      .select("promotion_id")
      .ilike("name", name)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Kiểm tra xem tất cả các product_id trong mảng truyền vào có tồn tại trong bảng products không
  checkProductsExist: async (productIds) => {
    if (!productIds || productIds.length === 0) return [];

    const { data, error } = await supabase
      .from("products")
      .select("product_id, product_name, price, original_price, discount_price, image_urls, status")
      .in("product_id", productIds);

    if (error) throw error;
    return data || [];
  },

  // Tạo mới 1 khuyến mãi vào bảng promotions
  create: async (promotionData) => {
    const { data, error } = await supabase
      .from("promotions")
      .insert([
        {
          promotion_id: promotionData.promotion_id,
          name: promotionData.name,
          description: promotionData.description || null,
          discount_type: promotionData.discount_type,
          discount_value: promotionData.discount_value,
          quantity_limit: promotionData.quantity_limit ?? 0,
          used_quantity: promotionData.used_quantity ?? 0,
          start_date: promotionData.start_date,
          end_date: promotionData.end_date,
          status: promotionData.status || "active",
          created_at: promotionData.created_at,
          updated_at: promotionData.updated_at,
        },
      ])
      .select();

    if (error) throw error;
    return data[0];
  },

  // Thêm danh sách sản phẩm áp dụng vào bảng promotion_items
  createPromotionItems: async (itemsData) => {
    if (!itemsData || itemsData.length === 0) return [];

    const { data, error } = await supabase
      .from("promotion_items")
      .insert(itemsData)
      .select();

    if (error) throw error;
    return data;
  },

  // Lấy danh sách khuyến mãi có phân trang kèm đầy đủ sản phẩm chi tiết
  getPromotionsWithPagination: async (from, to, filters = {}) => {
    let query = supabase
      .from("promotions")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (filters.status) {
      query = query.eq("status", filters.status);
    }

    if (filters.q) {
      query = query.or(`name.ilike.%${filters.q}%,promotion_id.ilike.%${filters.q}%`);
    }

    if (from !== undefined && to !== undefined) {
      query = query.range(from, to);
    }

    const { data: promotions, error, count } = await query;
    if (error) throw error;

    if (!promotions || promotions.length === 0) {
      return { data: [], count: count || 0 };
    }

    // Lấy tất cả promotion_id trong trang này
    const promotionIds = promotions.map((p) => p.promotion_id);

    // Lấy tất cả promotion_items tương ứng
    const { data: items, error: itemsError } = await supabase
      .from("promotion_items")
      .select("*")
      .in("promotion_id", promotionIds);

    if (itemsError) throw itemsError;

    // Lấy danh sách product_id duy nhất
    const productIds = [...new Set((items || []).map((item) => item.product_id).filter(Boolean))];

    let productsMap = {};
    if (productIds.length > 0) {
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("product_id, product_name, image_urls, price, original_price, discount_price, status")
        .in("product_id", productIds);

      if (productsError) throw productsError;

      (productsData || []).forEach((prod) => {
        productsMap[prod.product_id] = prod;
      });
    }

    // Ghép dữ liệu promotion_items và products vào từng promotion
    const result = promotions.map((promo) => {
      const promoItems = (items || [])
        .filter((item) => item.promotion_id === promo.promotion_id)
        .map((item) => ({
          ...item,
          products: productsMap[item.product_id] || null,
        }));

      return {
        ...promo,
        promotion_items: promoItems,
      };
    });

    return { data: result, count };
  },

  // Cập nhật trạng thái khuyến mãi theo ID
  updateStatus: async (promotion_id, status, updated_at) => {
    const { data, error } = await supabase
      .from("promotions")
      .update({
        status,
        updated_at,
      })
      .eq("promotion_id", promotion_id)
      .select();

    if (error) throw error;
    return data[0];
  },

  // Kiểm tra tên muốn sửa có bị trùng với khuyến mãi KHÁC không
  checkNameExistsForUpdate: async (name, currentPromotionId) => {
    const { data, error } = await supabase
      .from("promotions")
      .select("promotion_id")
      .ilike("name", name)
      .neq("promotion_id", currentPromotionId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  // Lấy 1 bản ghi khuyến mãi theo ID (kèm danh sách promotion_items + products)
  getPromotionById: async (promotion_id) => {
    const { data: promo, error } = await supabase
      .from("promotions")
      .select("*")
      .eq("promotion_id", promotion_id)
      .maybeSingle();

    if (error) throw error;
    if (!promo) return null;

    const { data: items, error: itemsError } = await supabase
      .from("promotion_items")
      .select("*")
      .eq("promotion_id", promotion_id);

    if (itemsError) throw itemsError;

    const productIds = [...new Set((items || []).map((item) => item.product_id).filter(Boolean))];

    let productsMap = {};
    if (productIds.length > 0) {
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("product_id, product_name, image_urls, price, original_price, discount_price, status")
        .in("product_id", productIds);

      if (productsError) throw productsError;

      (productsData || []).forEach((prod) => {
        productsMap[prod.product_id] = prod;
      });
    }

    const promoItems = (items || []).map((item) => ({
      ...item,
      products: productsMap[item.product_id] || null,
    }));

    return {
      ...promo,
      promotion_items: promoItems,
    };
  },

  // Cập nhật thông tin bản ghi promotions
  update: async (promotion_id, updateData) => {
    const { data, error } = await supabase
      .from("promotions")
      .update(updateData)
      .eq("promotion_id", promotion_id)
      .select();

    if (error) throw error;
    return data[0];
  },

  // Xóa các sản phẩm áp dụng cũ trong promotion_items của 1 khuyến mãi
  deletePromotionItems: async (promotion_id) => {
    const { error } = await supabase
      .from("promotion_items")
      .delete()
      .eq("promotion_id", promotion_id);

    if (error) throw error;
  },

  // Tính toán lại và cập nhật discount_price trong bảng products cho các sản phẩm
  recalculateProductsDiscountPrice: async (productIds) => {
    if (!productIds || productIds.length === 0) return;

    const uniqueProductIds = [...new Set(productIds.map((id) => String(id).trim()).filter(Boolean))];
    if (uniqueProductIds.length === 0) return;

    // 1. Lấy thông tin giá gốc (original_price) của các sản phẩm cần cập nhật
    const { data: productsList, error: prodErr } = await supabase
      .from("products")
      .select("product_id, original_price")
      .in("product_id", uniqueProductIds);

    if (prodErr) throw prodErr;
    if (!productsList || productsList.length === 0) return;

    const now = new Date();

    for (const prod of productsList) {
      const origPrice = Number(prod.original_price) || 0;

      // 2. Lấy danh sách các promotion_items liên quan đến sản phẩm này
      const { data: pItems, error: pItemsErr } = await supabase
        .from("promotion_items")
        .select("promotion_id")
        .eq("product_id", prod.product_id);

      if (pItemsErr) throw pItemsErr;

      let maxDiscountAmount = 0;

      if (pItems && pItems.length > 0) {
        const promoIds = [...new Set(pItems.map((item) => item.promotion_id))];

        // 3. Lấy thông tin các chương trình khuyến mãi đang active
        const { data: activePromos, error: promoErr } = await supabase
          .from("promotions")
          .select("discount_type, discount_value, start_date, end_date, status")
          .in("promotion_id", promoIds)
          .eq("status", "active");

        if (promoErr) throw promoErr;

        if (activePromos && activePromos.length > 0) {
          for (const promo of activePromos) {
            const startDate = new Date(promo.start_date);
            const endDate = new Date(promo.end_date);

            // Kiểm tra nếu thời gian hiện tại nằm trong khoảng diễn ra khuyến mãi
            if (now >= startDate && now <= endDate) {
              const dValue = Number(promo.discount_value) || 0;
              let currentDiscount = 0;

              if (promo.discount_type === "percentage") {
                currentDiscount = origPrice * (dValue / 100);
              } else if (promo.discount_type === "fixed_amount") {
                currentDiscount = dValue;
              }

              if (currentDiscount > maxDiscountAmount) {
                maxDiscountAmount = currentDiscount;
              }
            }
          }
        }
      }

      // Tính discount_price mới
      const newDiscountPrice = Math.max(0, Math.round(origPrice - maxDiscountAmount));

      // 4. Cập nhật bảng products
      await supabase
        .from("products")
        .update({
          discount_price: newDiscountPrice,
          updated_at: now.toISOString(),
        })
        .eq("product_id", prod.product_id);
    }
  },
};
