import { useEffect, useState, useMemo } from "react";
import defaultProduct from "../../assets/images/default-product.png";

export const sanitizeImageUrl = (val) => {
  if (!val) return null;
  if (Array.isArray(val)) {
    for (const item of val) {
      const found = sanitizeImageUrl(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof val === "object") {
    return sanitizeImageUrl(val.url || val.image_url || val.src);
  }
  if (typeof val === "string") {
    const s = val.trim();
    if (!s || s === "[" || s === "]" || s === "null" || s === "undefined") {
      return null;
    }
    if (s.startsWith("[") || s.startsWith("{")) {
      try {
        const parsed = JSON.parse(s);
        return sanitizeImageUrl(parsed);
      } catch {
        return null;
      }
    }
    const clean = s.replace(/^["']|["']$/g, "").trim();
    if (!clean || clean.length < 5) return null;
    return clean;
  }
  return null;
};

export default function ProductImage({ src, alt = "", ...props }) {
  const cleanSrc = useMemo(() => sanitizeImageUrl(src), [src]);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [cleanSrc]);

  const displaySrc = cleanSrc && !hasError ? cleanSrc : defaultProduct;

  return (
    <img
      {...props}
      src={displaySrc}
      alt={alt}
      onError={(event) => {
        setHasError(true);
        if (event.currentTarget.getAttribute("src") !== defaultProduct) {
          event.currentTarget.src = defaultProduct;
        }
      }}
    />
  );
}
