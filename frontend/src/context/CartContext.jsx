// frontend\src\context\CartContext.jsx
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  getCart,
  addToCart as addToCartApi,
  removeFromCart as removeFromCartApi,
  updateCartItemQuantity,
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
  const cartRef = useRef(cart);
  cartRef.current = cart;

  // Quản lý debounce cập nhật số lượng theo từng cart_item_id:
  // { [cartItemId]: { prevQuantity, targetQuantity, timer } }
  const pendingUpdatesRef = useRef({});

  // Dọn dẹp timers khi unmount
  useEffect(() => {
    return () => {
      Object.values(pendingUpdatesRef.current).forEach((p) => {
        if (p?.timer) clearTimeout(p.timer);
      });
    };
  }, []);

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
      const serverCart = res.data || {
        items: [],
        total_quantity: 0,
        total_price: 0,
      };

      setCart((prev) => {
        // Nếu đang có sản phẩm chờ debounce cập nhật số lượng, bảo lưu số lượng mới nhất trên UI
        const pending = pendingUpdatesRef.current;
        const pendingIds = Object.keys(pending);
        if (pendingIds.length > 0) {
          const mergedItems = (serverCart.items || []).map((it) => {
            if (pending[it.cart_item_id]) {
              return {
                ...it,
                quantity: pending[it.cart_item_id].targetQuantity,
              };
            }
            return it;
          });
          const mergedTotalQty = mergedItems.reduce(
            (sum, it) => sum + (it.quantity || 0),
            0,
          );
          return {
            ...serverCart,
            items: mergedItems,
            total_quantity: mergedTotalQty,
          };
        }
        return serverCart;
      });
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

  // thêm sản phẩm vào giỏ hàng: Optimistic UI phản hồi tức thì 0ms
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

  // xóa 1 sản phẩm khỏi giỏ hàng: Optimistic UI phản hồi tức thì 0ms
  const removeFromCart = async (cartItemId) => {
    // Hủy bỏ bất kỳ timer cập nhật đang chờ nào cho item này
    if (pendingUpdatesRef.current[cartItemId]) {
      clearTimeout(pendingUpdatesRef.current[cartItemId].timer);
      delete pendingUpdatesRef.current[cartItemId];
    }

    // 1. Cập nhật lạc quan (0ms): Xoá ngay khỏi giao diện và trừ tổng số lượng, tổng tiền
    setCart((prev) => {
      const items = prev.items || [];
      const itemToDelete = items.find((i) => i.cart_item_id === cartItemId);
      if (!itemToDelete) return prev;

      const newItems = items.filter((i) => i.cart_item_id !== cartItemId);
      const itemQty = Number(itemToDelete.quantity || 0);
      const itemPrice = Number(
        itemToDelete.product?.discount_price ??
          itemToDelete.product?.original_price ??
          0,
      );

      return {
        ...prev,
        items: newItems,
        total_quantity: Math.max(0, (prev.total_quantity || 0) - itemQty),
        total_price: Math.max(0, (prev.total_price || 0) - itemPrice * itemQty),
      };
    });

    // 2. Gửi API lên server ngầm
    try {
      const res = await removeFromCartApi(cartItemId);
      const serverTotal =
        res?.data?.total_quantity ??
        (typeof res?.total_quantity === "number" ? res.total_quantity : null);

      if (serverTotal !== null) {
        setCart((prev) => ({
          ...prev,
          total_quantity: serverTotal,
        }));
      }

      fetchCart({ silent: true }).catch(() => {});
      return res;
    } catch (error) {
      console.error("Lỗi khi xóa sản phẩm từ server, hoàn tác:", error);
      await fetchCart({ silent: true }).catch(() => {});
      throw error;
    }
  };

  // xóa nhiều sản phẩm khỏi giỏ hàng cùng lúc: Optimistic UI tức thì 0ms
  const removeMultipleFromCart = async (cartItemIds) => {
    if (!cartItemIds || cartItemIds.length === 0) return;
    const idsSet = new Set(cartItemIds);

    // Hủy các timer cập nhật đang chờ
    cartItemIds.forEach((id) => {
      if (pendingUpdatesRef.current[id]) {
        clearTimeout(pendingUpdatesRef.current[id].timer);
        delete pendingUpdatesRef.current[id];
      }
    });

    // 1. Cập nhật lạc quan (0ms)
    setCart((prev) => {
      const items = prev.items || [];
      const remainingItems = items.filter((i) => !idsSet.has(i.cart_item_id));
      const removedItems = items.filter((i) => idsSet.has(i.cart_item_id));

      const removedQty = removedItems.reduce(
        (sum, i) => sum + (Number(i.quantity) || 0),
        0,
      );
      const removedPrice = removedItems.reduce(
        (sum, i) =>
          sum +
          Number(i.product?.discount_price ?? i.product?.original_price ?? 0) *
            (Number(i.quantity) || 0),
        0,
      );

      return {
        ...prev,
        items: remainingItems,
        total_quantity: Math.max(0, (prev.total_quantity || 0) - removedQty),
        total_price: Math.max(0, (prev.total_price || 0) - removedPrice),
      };
    });

    // 2. Gửi các request xóa song song lên server
    try {
      await Promise.all(cartItemIds.map((id) => removeFromCartApi(id)));
      fetchCart({ silent: true }).catch(() => {});
    } catch (error) {
      console.error("Lỗi khi xóa nhiều sản phẩm từ server, hoàn tác:", error);
      await fetchCart({ silent: true }).catch(() => {});
      throw error;
    }
  };

  // cập nhật trực tiếp số lượng sản phẩm có debounce chống giật lag & race condition
  const updateQuantity = (cartItemId, newQuantity) => {
    const items = cartRef.current.items || [];
    const item = items.find((i) => i.cart_item_id === cartItemId);
    if (!item) return;

    if (newQuantity <= 0) {
      return removeFromCart(cartItemId);
    }

    const maxStock =
      typeof item.product?.stock_quantity === "number"
        ? item.product.stock_quantity
        : Infinity;

    if (newQuantity > maxStock) {
      toast.error("Sản phẩm bạn chọn đã hết");
      return;
    }

    const clampedQty = Math.max(1, Math.min(newQuantity, maxStock));

    // Lấy số lượng hiện tại đang hiển thị (bao gồm cả các lần bấm trước đang chờ debounce)
    const currentEffectiveQty =
      pendingUpdatesRef.current[cartItemId]?.targetQuantity ?? item.quantity;

    if (clampedQty === currentEffectiveQty) return;

    const delta = clampedQty - currentEffectiveQty;

    // 1. Cập nhật lạc quan (Optimistic Update) tức thì 0ms trên UI
    setCart((prev) => {
      const nextItems = (prev.items || []).map((it) => {
        if (it.cart_item_id === cartItemId) {
          return { ...it, quantity: clampedQty };
        }
        return it;
      });
      return {
        ...prev,
        items: nextItems,
        total_quantity: Math.max(0, (prev.total_quantity || 0) + delta),
      };
    });

    // 2. Debounce gửi API lên server (400ms sau lần bấm cuối cùng)
    if (!pendingUpdatesRef.current[cartItemId]) {
      pendingUpdatesRef.current[cartItemId] = {
        prevQuantity: item.quantity,
        targetQuantity: clampedQty,
        timer: null,
      };
    } else {
      pendingUpdatesRef.current[cartItemId].targetQuantity = clampedQty;
      if (pendingUpdatesRef.current[cartItemId].timer) {
        clearTimeout(pendingUpdatesRef.current[cartItemId].timer);
      }
    }

    pendingUpdatesRef.current[cartItemId].timer = setTimeout(async () => {
      const pending = pendingUpdatesRef.current[cartItemId];
      if (!pending) return;
      const target = pending.targetQuantity;
      const original = pending.prevQuantity;
      delete pendingUpdatesRef.current[cartItemId];

      // Nếu số lượng bấm qua lại cuối cùng bằng số lượng ban đầu thì không cần gọi API
      if (target === original) return;

      try {
        const res = await updateCartItemQuantity(cartItemId, target);
        // Đồng bộ tổng số lượng từ server nếu không còn yêu cầu nào đang chờ
        if (
          Object.keys(pendingUpdatesRef.current).length === 0 &&
          res?.data?.total_quantity !== undefined
        ) {
          setCart((prev) => ({
            ...prev,
            total_quantity: res.data.total_quantity,
          }));
        }
      } catch (error) {
        console.error("Lỗi khi cập nhật số lượng:", error);
        toast.error(
          error?.response?.data?.message ||
            "Không thể cập nhật số lượng sản phẩm!",
        );
        // Hoàn tác về giỏ hàng thực tế từ server
        await fetchCart({ silent: true }).catch(() => {});
      }
    }, 400);
  };

  // tăng số lượng sản phẩm: Optimistic UI tức thì 0ms kết hợp Debounce
  const increaseQuantity = async (cartItemId) => {
    const items = cartRef.current.items || [];
    const item = items.find((i) => i.cart_item_id === cartItemId);
    if (!item) return;

    const currentEffectiveQty =
      pendingUpdatesRef.current[cartItemId]?.targetQuantity ?? item.quantity;
    const maxStock =
      typeof item.product?.stock_quantity === "number"
        ? item.product.stock_quantity
        : Infinity;

    if (currentEffectiveQty >= maxStock) {
      toast.error("Sản phẩm bạn chọn đã hết");
      return;
    }

    updateQuantity(cartItemId, currentEffectiveQty + 1);
  };

  // giảm số lượng sản phẩm: Optimistic UI tức thì 0ms kết hợp Debounce
  const decreaseQuantity = async (cartItemId) => {
    const items = cartRef.current.items || [];
    const item = items.find((i) => i.cart_item_id === cartItemId);
    if (!item) return;

    const currentEffectiveQty =
      pendingUpdatesRef.current[cartItemId]?.targetQuantity ?? item.quantity;

    // Khi số lượng hiện tại là 1 (hoặc nhỏ hơn), bấm '-' sẽ xóa sản phẩm khỏi giỏ hàng
    if (currentEffectiveQty <= 1) {
      return removeFromCart(cartItemId);
    }

    updateQuantity(cartItemId, currentEffectiveQty - 1);
  };

  // Đẩy ngay tất cả thay đổi số lượng đang chờ debounce lên server (dùng khi bấm Thanh toán)
  const flushPendingUpdates = async () => {
    const pendingIds = Object.keys(pendingUpdatesRef.current);
    if (pendingIds.length === 0) return;

    const promises = pendingIds.map(async (cartItemId) => {
      const pending = pendingUpdatesRef.current[cartItemId];
      if (!pending) return;
      clearTimeout(pending.timer);
      const target = pending.targetQuantity;
      const original = pending.prevQuantity;
      delete pendingUpdatesRef.current[cartItemId];

      if (target === original) return;
      return updateCartItemQuantity(cartItemId, target);
    });

    try {
      await Promise.all(promises);
    } catch (err) {
      console.error("Lỗi đồng bộ giỏ hàng trước khi tiếp tục:", err);
      await fetchCart({ silent: true }).catch(() => {});
    }
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
        removeMultipleFromCart,
        decreaseQuantity,
        increaseQuantity,
        updateQuantity,
        flushPendingUpdates,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
