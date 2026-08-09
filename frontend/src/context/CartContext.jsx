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

    const [loading, setLoading] = useState(false);

    // lấy giỏ hàng
    const fetchCart = async () => {
        if (!isLoggedIn()) {
            setCart({
                items: [],
                total_quantity: 0,
                total_price: 0,
            });
            return;
        }

        try {
            setLoading(true);

            const res = await getCart();

            setCart(
                res.data || {
                    items: [],
                    total_quantity: 0,
                    total_price: 0,
                }
            );
        } catch (error) {
            console.error("Lỗi khi lấy giỏ hàng:", error);

            setCart({
                items: [],
                total_quantity: 0,
                total_price: 0,
            });
        } finally {
            setLoading(false);
        }
    };

    // thêm sản phẩm vào giỏ hàng
    const addToCart = async (product_id, variant_id, quantity = 1) => {
        const res = await addToCartApi({
            product_id,
            variant_id,
            quantity,
        });

        // API add hiện tại chỉ trả total_quantity,
        // nên lấy lại cart để đồng bộ danh sách item và tổng tiền.
        await fetchCart();

        return res;
    };

    // xóa sản phẩm khỏi giỏ hàng
    const removeFromCart = async (cartItemId) => {
        const res = await removeFromCartApi(cartItemId);

        // API remove chỉ trả total_quantity,
        // nên lấy lại cart để cập nhật state đầy đủ.
        await fetchCart();

        return res;
    };

    // giảm số lượng sản phẩm
    const decreaseQuantity = async (cartItemId) => {
        const res = await decreaseQuantityApi(cartItemId);

        // API decrease chỉ trả quantity mới và total_quantity.
        await fetchCart();

        return res;
    };

    // tăng số lượng sản phẩm
    const increaseQuantity = async (cartItemId) => {
        const res = await increaseQuantityApi(cartItemId);

        // API increase chỉ trả quantity mới và total_quantity.
        await fetchCart();

        return res;
    };

    // tổng số lượng sản phẩm
    const cartCount = cart.total_quantity;

    useEffect(() => {
        fetchCart();
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