// frontend\src\context\CartContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import {
  getCart,
  addToCart as addToCartApi,
  removeFromCart as removeFromCartApi,
  decreaseQuantity as decreaseQuantityApi,
  increaseQuantity as increaseQuantityApi,
} from "../services/cart.service";
import { isLoggedIn } from "../utils/auth";

export const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState({
    items: [],
    total_quantity: 0,
    total_price: 0,
  });

  const [loading, setLoading] = useState(isLoggedIn);

  // lấy giỏ hàng
  const fetchCart = async (options = {}) => {
    const { silent = false } = options;
    if (!isLoggedIn()) {
      setCart({
        items: [],
        total_quantity: 0,
        total_price: 0,
      });
      return;
    }

    try {
      if (!silent) setLoading(true);

      const res = await getCart();

      setCart(
        res.data || {
          items: [],
          total_quantity: 0,
          total_price: 0,
        },
      );
    } catch (error) {
      console.error("Lỗi khi lấy giỏ hàng:", error);

      if (!silent) {
        setCart({
          items: [],
          total_quantity: 0,
          total_price: 0,
        });
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // thêm sản phẩm vào giỏ hàng: Cách 1 - Optimistic UI phản hồi tức thì 0ms
  const addToCart = async (
    product_id,
    variant_id,
    quantity = 1,
    productSnapshot = null,
  ) => {
    // 1. Cập nhật lạc quan (Optimistic Update) ngay lập tức (0ms)
    setCart((prev) => {
      const items = [...(prev.items || [])];
      const idx = items.findIndex(
        (i) =>
          i.product?.variant_id === variant_id ||
          i.variant_id === variant_id ||
          (i.product_id === product_id && i.variant_id === variant_id),
      );

      if (idx >= 0) {
        items[idx] = {
          ...items[idx],
          quantity: (items[idx].quantity || 0) + quantity,
        };
      } else if (productSnapshot) {
        items.push({
          cart_item_id: `temp-${Date.now()}`,
          product_id,
          variant_id,
          quantity,
          product: productSnapshot,
        });
      }

      return {
        ...prev,
        total_quantity: (prev.total_quantity || 0) + quantity,
        items,
      };
    });

    // 2. Gửi API lên server chạy ngầm
    try {
      const res = await addToCartApi({
        product_id,
        variant_id,
        quantity,
      });

      const newTotal =
        res?.data?.total_quantity ??
        (typeof res?.total_quantity === "number" ? res.total_quantity : null);
      const serverCartItemId = res?.data?.cart_item_id;

      setCart((prev) => ({
        ...prev,
        total_quantity: newTotal !== null ? newTotal : prev.total_quantity,
        items: serverCartItemId
          ? (prev.items || []).map((it) => {
              if (
                typeof it.cart_item_id === "string" &&
                it.cart_item_id.startsWith("temp-") &&
                (it.variant_id === variant_id ||
                  it.product?.variant_id === variant_id)
              ) {
                return { ...it, cart_item_id: serverCartItemId };
              }
              return it;
            })
          : prev.items,
      }));

      // Đồng bộ chi tiết danh sách items và tổng tiền ngầm
      fetchCart({ silent: true }).catch((err) => {
        console.error("Lỗi đồng bộ giỏ hàng ngầm:", err);
      });

      return res;
    } catch (error) {
      console.error("Lỗi thêm giỏ hàng từ server, hoàn tác:", error);
      // Hoàn tác (Rollback) lại giỏ hàng thực tế từ server
      await fetchCart({ silent: true }).catch(() => {});
      throw error;
    }
  };

  // xóa sản phẩm khỏi giỏ hàng
  const removeFromCart = async (cartItemId) => {
    const res = await removeFromCartApi(cartItemId);
    await fetchCart({ silent: true });
    return res;
  };

  // giảm số lượng sản phẩm
  const decreaseQuantity = async (cartItemId) => {
    const res = await decreaseQuantityApi(cartItemId);
    await fetchCart({ silent: true });
    return res;
  };

  // tăng số lượng sản phẩm
  const increaseQuantity = async (cartItemId) => {
    const res = await increaseQuantityApi(cartItemId);
    await fetchCart({ silent: true });
    return res;
  };

  // tổng số lượng sản phẩm
  const cartCount = cart.total_quantity;

  useEffect(() => {
    if (!isLoggedIn()) return;
    let isCurrentRequest = true;
    const controller = new AbortController();
    getCart({ signal: controller.signal })
      .then((res) => {
        if (isCurrentRequest) {
          setCart(res.data || { items: [], total_quantity: 0, total_price: 0 });
        }
      })
      .catch((error) => {
        if (isCurrentRequest) console.error("Lỗi khi lấy giỏ hàng:", error);
      })
      .finally(() => {
        if (isCurrentRequest) setLoading(false);
      });
    return () => {
      isCurrentRequest = false;
      controller.abort();
    };
  }, []);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartCount,
        loading,
        fetchCart,
        addToCart,
        removeFromCart,
        decreaseQuantity,
        increaseQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
