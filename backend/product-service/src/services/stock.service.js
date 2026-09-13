import { supabase } from "../configs/supabase.js";

// Compare-and-swap prevents concurrent orders from overwriting each other's stock.
export async function changeVariantStock(variantId, quantity) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const { data: variant, error } = await supabase
      .from("product_variants")
      .select("stock_quantity")
      .eq("variant_id", variantId)
      .single();
    if (error) throw error;
    const stock = Number(variant.stock_quantity);
    if (!Number.isInteger(stock) || stock + quantity < 0) {
      throw new Error(
        `Biến thể ${variantId} đã hết hàng hoặc không đủ tồn kho.`,
      );
    }
    const result = await supabase
      .from("product_variants")
      .update({ stock_quantity: stock + quantity })
      .eq("variant_id", variantId)
      .eq("stock_quantity", stock)
      .select("variant_id")
      .maybeSingle();
    if (result.error) throw result.error;
    if (result.data) return;
  }
  throw new Error("Tồn kho đang thay đổi. Vui lòng thử lại.");
}

export async function restoreStock(items) {
  const results = await Promise.allSettled(
    items.map((item) => changeVariantStock(item.variant_id, item.quantity)),
  );
  const failures = results.filter((result) => result.status === "rejected");
  if (failures.length) {
    console.error("STOCK_COMPENSATION_FAILED", items, failures);
    throw new Error("Không thể hoàn lại tồn kho, cần kiểm tra đơn hàng.");
  }
}

export async function reserveStock(items) {
  const reserved = [];
  try {
    for (const item of items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0)
        throw new Error("Số lượng sản phẩm không hợp lệ.");
      await changeVariantStock(item.variant_id, -item.quantity);
      reserved.push(item);
    }
  } catch (error) {
    await restoreStock(reserved);
    throw error;
  }
}
