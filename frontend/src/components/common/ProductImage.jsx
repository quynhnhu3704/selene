import { useEffect, useState } from "react";
import defaultProduct from "../../assets/images/default-product.png";

export default function ProductImage({ src, ...props }) {
  const [loadedSrc, setLoadedSrc] = useState(null);

  useEffect(() => {
    if (!src) return;

    let active = true;
    const image = new Image();
    image.onload = async () => {
      try {
        await image.decode();
        if (active) setLoadedSrc(src);
      } catch {
        // Keep the placeholder if the image cannot be decoded.
      }
    };
    image.src = src;

    return () => {
      active = false;
      image.onload = null;
    };
  }, [src]);

  return (
    <img
      {...props}
      src={src && loadedSrc === src ? src : defaultProduct}
      alt=""
      onError={(event) => {
        if (event.currentTarget.getAttribute("src") !== defaultProduct) {
          event.currentTarget.src = defaultProduct;
        }
      }}
    />
  );
}
