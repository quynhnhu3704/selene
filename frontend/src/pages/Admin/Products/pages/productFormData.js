// One multipart contract for both create and edit.
export async function buildProductFormData({
  form, category, brandId, variants, mainImg, thumbs, status,
}) {
  const data = new FormData();
  const fields = {
    product_name: form.name.trim(), description: form.description,
    price: form.basePrice, original_price: form.originalPrice,
    discount_price: form.discount === "" ? form.basePrice : form.discount,
    category_id: category, status,
  };
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  if (brandId) data.append("brand_id", brandId);
  data.append("variants", JSON.stringify(variants.map((variant) => ({
    ...(variant.variant_id ? { variant_id: variant.variant_id } : {}),
    size: variant.size.trim(), color: variant.color.trim(),
    stock_quantity: Number(variant.stock_quantity), status: variant.status,
  }))));
  const images = [mainImg, ...thumbs].filter(Boolean);
  data.append("old_image_urls", JSON.stringify(images.filter((url) => !url.startsWith("data:"))));
  let uploadIndex = 0;
  data.append("image_order", JSON.stringify(images.map((url) =>
    url.startsWith("data:") ? { upload: uploadIndex++ } : { url },
  )));
  for (const [index, url] of images.filter((url) => url.startsWith("data:")).entries()) {
    const response = await fetch(url);
    const blob = await response.blob();
    const extension = blob.type.split("/")[1] || "jpg";
    data.append("images", blob, `product_${index}.${extension}`);
  }
  return data;
}
