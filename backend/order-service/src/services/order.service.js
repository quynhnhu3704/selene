// backend/order-service/src/services/order.service.js
import { OrderModel } from "../models/order.model.js";
import { CartModel } from "../models/cart.model.js";
import { VoucherModel } from "../models/voucher.model.js";
import {
  requestProductDetails,
  sendUpdateProductStock,
  sendOrderNotificationEvent,
} from "../configs/rabbitmq.js";
import { config } from "../configs/index.js";

const generateId = (prefix) => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
};

const generateId2 = (prefix) => {
  return `${prefix}${Date.now()}${Math.random().toString(36).substring(2, 8)}`;
};

const generateOrderCode = () => {
  return generateId2("HD");
};

const paymentMethods = new Set(["cod", "bank", "sepay"]);

const getBankTransferDetails = (order) => {
  const transferNote = order.order_code;
  const qrParams = new URLSearchParams({
    acc: config.sepayAccountNumber,
    bank: config.sepayBankCode,
    amount: String(Math.round(Number(order.final_amount || 0))),
    des: transferNote,
    template: "",
    showinfo: "false",
    fullacc: "true",
    holder: config.sepayAccountName,
    store: "SELENE",
  });

  return {
    transfer_note: transferNote,
    bank: {
      code: config.sepayBankCode,
      name: config.sepayBankName,
      account_number: config.sepayAccountNumber,
      account_name: config.sepayAccountName,
    },
    qr_url:
      order.payment_method === "sepay"
        ? `https://vietqr.app/img?${qrParams.toString()}`
        : null,
  };
};

export const createOrder = async (accountId, orderData) => {
  try {
    const {
      recipient_name,
      recipient_phone,
      recipient_address,
      payment_method,
      voucher_code,
      cart_item_ids,
    } = orderData;

    const recipientName = String(recipient_name || "").trim();
    const recipientPhone = String(recipient_phone || "").trim();
    const recipientAddress = String(recipient_address || "").trim();
    const normalizedPaymentMethod = String(payment_method || "")
      .trim()
      .toLowerCase();

    if (
      !recipientName ||
      !recipientPhone ||
      !recipientAddress ||
      !normalizedPaymentMethod
    ) {
      throw new Error("Thiếu thông tin giao hàng hoặc phương thức thanh toán!");
    }

    if (!paymentMethods.has(normalizedPaymentMethod)) {
      throw new Error("Phương thức thanh toán không hợp lệ!");
    }

    if (!Array.isArray(cart_item_ids) || cart_item_ids.length === 0) {
      throw new Error("Vui lòng chọn ít nhất một sản phẩm để đặt hàng!");
    }

    // 1. Lấy giỏ hàng của user
    const cart = await CartModel.findByAccountId(accountId);
    if (!cart) {
      throw new Error("Giỏ hàng trống!");
    }

    const cartItems = await CartModel.getCartItems(cart.cart_id);
    if (!cartItems || cartItems.length === 0) {
      throw new Error("Giỏ hàng trống!");
    }

    const selectedCartItemIds = [
      ...new Set(cart_item_ids.map((cartItemId) => String(cartItemId))),
    ];
    const selectedCartItemIdSet = new Set(selectedCartItemIds);
    const selectedCartItems = cartItems.filter((item) =>
      selectedCartItemIdSet.has(String(item.cart_item_id)),
    );

    if (selectedCartItems.length !== selectedCartItemIds.length) {
      throw new Error(
        "Một hoặc nhiều sản phẩm đã chọn không còn trong giỏ hàng!",
      );
    }

    // 2. Lấy thông tin chi tiết sản phẩm qua RabbitMQ RPC để check giá và tồn kho
    const variantIds = selectedCartItems.map((item) => item.variant_id);
    let productDetails = [];
    try {
      productDetails = await requestProductDetails(variantIds);
    } catch (err) {
      console.error("Lỗi khi gọi RPC RabbitMQ:", err);
      throw new Error(
        "Hệ thống đang bận, không thể kiểm tra thông tin sản phẩm lúc này",
      );
    }

    let total_original_price = 0;
    const finalOrderItems = [];

    // 3. Kiểm tra tồn kho và tính tổng tiền
    for (const item of selectedCartItems) {
      const detail = productDetails.find(
        (p) => p.variant_id === item.variant_id,
      );
      if (!detail) {
        throw new Error(`Sản phẩm không tồn tại (variant: ${item.variant_id})`);
      }

      if (detail.stock_quantity < item.quantity) {
        throw new Error(
          `Sản phẩm ${detail.product_name} không đủ số lượng tồn kho`,
        );
      }

      const unitPrice = detail.discount_price || detail.original_price || 0;
      total_original_price += unitPrice * item.quantity;

      finalOrderItems.push({
        order_item_id: generateId("oi"),
        // order_id sẽ được thêm vào sau
        product_id: detail.product_id,
        variant_id: detail.variant_id,
        product_name: detail.product_name,
        size: detail.size,
        color: detail.color,
        unit_price: unitPrice,
        quantity: item.quantity,
      });
    }

    // 4. Xử lý Voucher (nếu có)
    let total_discount_price = 0;
    let appliedVoucher = null;

    if (voucher_code) {
      appliedVoucher = await VoucherModel.findByCode(voucher_code);

      if (!appliedVoucher) {
        throw new Error("Mã giảm giá không tồn tại!");
      }

      if (appliedVoucher.status !== "active") {
        throw new Error("Mã giảm giá không hoạt động!");
      }

      const now = new Date();
      if (
        now < new Date(appliedVoucher.start_date) ||
        now > new Date(appliedVoucher.end_date)
      ) {
        throw new Error(
          "Mã giảm giá đã hết hạn hoặc chưa đến thời gian sử dụng!",
        );
      }

      if (
        appliedVoucher.total_quantity > 0 &&
        appliedVoucher.used_quantity >= appliedVoucher.total_quantity
      ) {
        throw new Error("Mã giảm giá đã hết lượt sử dụng!");
      }

      if (total_original_price < appliedVoucher.min_order_value) {
        throw new Error(
          `Đơn hàng phải đạt tối thiểu ${appliedVoucher.min_order_value} để áp dụng mã này!`,
        );
      }

      const userUsages = await VoucherModel.countUsagesByVoucherAndAccount(
        appliedVoucher.voucher_id,
        accountId,
      );
      if (userUsages >= appliedVoucher.per_user_limit) {
        throw new Error("Bạn đã hết lượt sử dụng mã giảm giá này!");
      }

      // Tính tiền giảm
      if (appliedVoucher.discount_type === "percentage") {
        total_discount_price =
          (total_original_price * appliedVoucher.discount_value) / 100;
        if (
          appliedVoucher.max_discount_amount &&
          total_discount_price > appliedVoucher.max_discount_amount
        ) {
          total_discount_price = appliedVoucher.max_discount_amount;
        }
      } else if (appliedVoucher.discount_type === "fixed_amount") {
        total_discount_price = appliedVoucher.discount_value;
      }

      if (total_discount_price > total_original_price) {
        total_discount_price = total_original_price;
      }
    }

    // 5. Tính tổng tiền cuối cùng
    const shipping_fee = 0; // Tạm thời set phí ship = 0
    const final_amount =
      total_original_price - total_discount_price + shipping_fee;

    // 6. Tạo đơn hàng
    const orderId = generateId("order");

    let initialPaymentStatus = "unpaid";
    let initialStatus = "pending";

    if (
      normalizedPaymentMethod === "bank" ||
      normalizedPaymentMethod === "sepay"
    ) {
      initialPaymentStatus = "unpaid";
      initialStatus = "unpaid";
    } else if (normalizedPaymentMethod === "cod") {
      initialPaymentStatus = "unpaid";
      initialStatus = "pending";
    }

    const newOrderData = {
      order_id: orderId,
      account_id: accountId,
      order_code: generateOrderCode(),
      voucher_id: appliedVoucher ? appliedVoucher.voucher_id : null,
      recipient_name: recipientName,
      recipient_phone: recipientPhone,
      recipient_address: recipientAddress,
      total_original_price,
      total_discount_price,
      shipping_fee,
      final_amount,
      payment_method: normalizedPaymentMethod,
      payment_status: initialPaymentStatus,
      status: initialStatus,
    };

    const createdOrder = await OrderModel.createOrder(newOrderData);

    // 7. Tạo chi tiết đơn hàng
    const orderItemsToInsert = finalOrderItems.map((item) => ({
      ...item,
      order_id: orderId,
    }));
    await OrderModel.createOrderItems(orderItemsToInsert);

    // 8. Lưu lịch sử dùng voucher (nếu có)
    if (appliedVoucher) {
      await VoucherModel.recordUsage({
        usage_voucher_id: generateId("vu"),
        voucher_id: appliedVoucher.voucher_id,
        account_id: accountId,
        order_id: orderId,
        discount_amount: total_discount_price,
      });

      // Cập nhật số lượng đã dùng của voucher
      await VoucherModel.update(appliedVoucher.voucher_id, {
        used_quantity: appliedVoucher.used_quantity + 1,
      });
    }

    // 9. Chỉ xóa các sản phẩm vừa đặt; các sản phẩm không chọn vẫn ở lại giỏ.
    await CartModel.removeCartItems(cart.cart_id, selectedCartItemIds);

    if (selectedCartItems.length === cartItems.length) {
      await CartModel.deleteCart(cart.cart_id);
    }

    // 10. Trừ số lượng tồn kho của sản phẩm
    try {
      await sendUpdateProductStock(finalOrderItems);
    } catch (stockErr) {
      console.error("Lỗi khi gửi sự kiện cập nhật tồn kho:", stockErr.message);
      // Có thể log lại hoặc xử lý bù trừ sau (retry), không nên fail cả đơn hàng vì lỗi rabbitmq nếu đơn đã lưu
    }

    // 11. Gửi sự kiện thông báo qua email
    try {
      const orderNotificationData = {
        accountId,
        orderId: createdOrder.order_id,
        orderCode: createdOrder.order_code,
        recipientName: createdOrder.recipient_name,
        recipientPhone: createdOrder.recipient_phone,
        recipientAddress: createdOrder.recipient_address,
        totalOriginalPrice: createdOrder.total_original_price,
        totalDiscountPrice: createdOrder.total_discount_price,
        shippingFee: createdOrder.shipping_fee,
        finalAmount: createdOrder.final_amount,
        paymentMethod: createdOrder.payment_method,
        items: finalOrderItems, // Danh sách sản phẩm mua
      };
      await sendOrderNotificationEvent(orderNotificationData);
    } catch (notifyErr) {
      console.error("Lỗi khi gửi sự kiện thông báo email:", notifyErr.message);
    }

    return {
      ...createdOrder,
      payment: getBankTransferDetails(createdOrder),
    };
  } catch (error) {
    console.error("Lỗi tại placeOrder Service:", error.message);
    throw new Error(error.message || "Không thể đặt hàng!");
  }
};

export const getOrdersByAccountId = async (accountId) => {
  try {
    const orders = await OrderModel.findByAccountId(accountId);

    // Thu thập tất cả variant_id từ các order_items
    const variantIdsSet = new Set();
    orders.forEach((order) => {
      if (order.order_items) {
        order.order_items.forEach((item) => {
          if (item.variant_id) variantIdsSet.add(item.variant_id);
        });
      }
    });

    const variantIds = Array.from(variantIdsSet);

    // Gọi RPC để lấy hình ảnh sản phẩm nếu có variant
    if (variantIds.length > 0) {
      try {
        const productDetails = await requestProductDetails(variantIds);

        const productMap = {};
        productDetails.forEach((p) => {
          productMap[p.variant_id] = p;
        });

        // Gắn image_url vào từng order_item
        orders.forEach((order) => {
          if (order.order_items) {
            order.order_items.forEach((item) => {
              if (productMap[item.variant_id]) {
                item.image_url = productMap[item.variant_id].image_url;
              } else {
                item.image_url = null;
              }
            });
          }
        });
      } catch (err) {
        console.error(
          "Lỗi khi lấy hình ảnh sản phẩm từ RabbitMQ:",
          err.message,
        );
        // Vẫn trả về orders nếu gọi RPC thất bại, chỉ là không có hình ảnh
      }
    }

    return orders;
  } catch (error) {
    console.error("Lỗi tại getOrdersByAccountId Service:", error.message);
    throw new Error("Không thể lấy danh sách đơn hàng!");
  }
};

export const getOrderById = async (accountId, orderId) => {
  try {
    const order = await OrderModel.findByIdAndAccountId(orderId, accountId);

    if (!order) {
      throw new Error("Không tìm thấy đơn hàng!");
    }

    // Lấy hình ảnh sản phẩm từ Product Service qua RabbitMQ RPC nếu có variant
    if (Array.isArray(order.order_items) && order.order_items.length > 0) {
      const variantIds = [
        ...new Set(
          order.order_items
            .map((item) => item.variant_id)
            .filter(Boolean),
        ),
      ];

      if (variantIds.length > 0) {
        try {
          const productDetails = await requestProductDetails(variantIds);

          const productMap = {};
          productDetails.forEach((p) => {
            productMap[p.variant_id] = p;
          });

          order.order_items.forEach((item) => {
            if (productMap[item.variant_id]) {
              item.image_url = productMap[item.variant_id].image_url;
            } else {
              item.image_url = null;
            }
          });
        } catch (err) {
          console.error(
            "Lỗi khi lấy hình ảnh sản phẩm từ RabbitMQ:",
            err.message,
          );
        }
      }
    }

    return {
      ...order,
      payment: getBankTransferDetails(order),
    };
  } catch (error) {
    console.error("Lỗi tại getOrderById Service:", error.message);
    throw new Error(error.message || "Không thể lấy thông tin đơn hàng!");
  }
};

export const confirmSePayPayment = async ({ orderCode, transferAmount }) => {
  const order = await OrderModel.findByOrderCode(orderCode);

  // Trả về null để webhook vẫn phản hồi thành công cho các giao dịch không thuộc đơn SePay/Bank.
  if (
    !order ||
    (order.payment_method !== "sepay" && order.payment_method !== "bank")
  ) {
    return null;
  }

  if (order.payment_status === "paid" && order.status === "pending") {
    return order;
  }

  const receivedAmount = Number(transferAmount);
  const expectedAmount = Number(order.final_amount);

  if (!Number.isFinite(receivedAmount) || receivedAmount < expectedAmount) {
    return null;
  }

  return OrderModel.markSePayPaymentAsPaid(order.order_id);
};

export const markOrderAsPaid = async (orderId) => {
  const order = await OrderModel.findById(orderId);
  if (!order) {
    throw new Error("Không tìm thấy đơn hàng!");
  }
  return OrderModel.markPaymentAsPaid(orderId);
};
