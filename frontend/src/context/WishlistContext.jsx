import { createContext, useContext, useEffect, useState } from "react";

const WishlistContext = createContext();
const STORAGE_KEY = "selene-wishlist";

function readWishlist() {
  try {
    const items = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(items)
      ? items.filter((item) => item && typeof item.product_id === "string")
      : [];
  } catch {
    return [];
  }
}

export function WishlistProvider({ children }) {
  const [wishlist, setWishlist] = useState(readWishlist);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlist));
    } catch {
      // Vẫn cho phép yêu thích trong phiên khi trình duyệt không cho lưu trữ.
    }
  }, [wishlist]);

  const isFavorite = (id) =>
    wishlist.some((item) => item.product_id === String(id));

  const toggleWishlist = (product) => {
    const id = String(product.product_id);
    setWishlist((items) =>
      items.some((item) => item.product_id === id)
        ? items.filter((item) => item.product_id !== id)
        : [
            ...items,
            {
              product_id: id,
              product_name: product.product_name,
              image_url: product.image_url || product.images?.[0],
              second_image_url: product.second_image_url,
              discount_price: product.discount_price,
              original_price: product.original_price,
            },
          ],
    );
  };

  return (
    <WishlistContext.Provider value={{ wishlist, isFavorite, toggleWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}

// Giữ provider và hook chung file theo CartContext của dự án.
// eslint-disable-next-line react-refresh/only-export-components
export function useWishlist() {
  return useContext(WishlistContext);
}
