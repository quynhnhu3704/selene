// backend/order-service/src/services/order.service.js
import { OrderModel } from "../models/order.model.js";
import { CartModel } from "../models/cart.model.js";
import { VoucherModel } from "../models/voucher.model.js";
import {
  requestProductDetails,
  sendOrderNotificationEvent,
} from "../configs/rabbitmq.js";
import { config } from "../configs/index.js";
import { reserveStock, restoreStock } from "./stock.service.js";

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

    await reserveStock(finalOrderItems);
    let createdOrder;

    // 7. Tạo chi tiết đơn hàng
    const orderItemsToInsert = finalOrderItems.map((item) => ({
      ...item,
      order_id: orderId,
    }));
    try {
      createdOrder = await OrderModel.createOrder(newOrderData);
      await OrderModel.createOrderItems(orderItemsToInsert);
    } catch (error) {
      if (createdOrder) await OrderModel.deleteIncompleteOrder(orderId);
      await restoreStock(finalOrderItems);
      throw error;
    }

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

    // Tồn kho từng variant đã được giữ trước khi lưu đơn, không trừ lần hai qua queue.

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
          order.order_items.map((item) => item.variant_id).filter(Boolean),
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

  if (order.payment_status === "paid") {
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

export const getAllOrdersForAdmin = async (query = {}, exportAll = false) => {
  try {
    const orders = await OrderModel.findAllForAdmin();
    const normalize = (value) =>
      String(value || "")
        .trim()
        .toLocaleLowerCase("vi-VN");
    const q = normalize(query.q);
    const status = normalize(query.status);
    const filtered = orders
      .map(({ order_items, ...order }) => ({
        ...order,
        total_quantity: (order_items || []).reduce(
          (total, item) => total + Number(item.quantity || 0),
          0,
        ),
      }))
      .filter(
        (order) =>
          (!q ||
            normalize(order.order_code).includes(q) ||
            normalize(order.recipient_name).includes(q)) &&
          (!status ||
            order.status === status ||
            (status === "cancelled" && order.status === "cancel")),
      );
    const sorts = {
      quantity_asc: (a, b) => a.total_quantity - b.total_quantity,
      quantity_desc: (a, b) => b.total_quantity - a.total_quantity,
      total_asc: (a, b) => Number(a.final_amount) - Number(b.final_amount),
      total_desc: (a, b) => Number(b.final_amount) - Number(a.final_amount),
      az: (a, b) =>
        String(a.recipient_name || "").localeCompare(
          String(b.recipient_name || ""),
          "vi",
        ),
      za: (a, b) =>
        String(b.recipient_name || "").localeCompare(
          String(a.recipient_name || ""),
          "vi",
        ),
    };
    if (sorts[query.sort]) filtered.sort(sorts[query.sort]);
    const requestedLimit = Number(query.limit);
    const limit =
      Number.isInteger(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 100)
        : 12;
    const totalPages = Math.ceil(filtered.length / limit);
    const requestedPage = Number(query.page);
    const page = Math.min(
      Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
      totalPages || 1,
    );
    return {
      orders: exportAll
        ? filtered
        : filtered.slice((page - 1) * limit, page * limit),
      pagination: {
        page,
        limit,
        total_items: filtered.length,
        total_pages: totalPages,
      },
    };
  } catch (error) {
    console.error("Lỗi tại getAllOrdersForAdmin Service:", error.message);
    throw new Error("Không thể lấy danh sách đơn hàng cho admin!");
  }
};

export const updateOrderForAdmin = async (orderId, data, role) => {
  if (!["admin", "staff"].includes(role)) {
    const error = new Error("Bạn không có quyền quản lý đơn hàng!");
    error.status = 403;
    throw error;
  }
  const fields = [
    "status",
    "recipient_name",
    "recipient_phone",
    "recipient_address",
    "payment_method",
    "payment_status",
    "total_discount_price",
    "shipping_fee",
  ];
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Thông tin đơn hàng không hợp lệ!");
  }
  if (
    role !== "admin" &&
    Object.keys(data).some((key) => !["status", "updated_at"].includes(key))
  ) {
    const error = new Error(
      "Nhân viên chỉ được chỉnh sửa trạng thái đơn hàng!",
    );
    error.status = 403;
    throw error;
  }
  if (
    Object.keys(data).some(
      (key) => ![...fields, "updated_at", "order_items"].includes(key),
    )
  ) {
    throw new Error("Thông tin cập nhật đơn hàng không hợp lệ!");
  }
  const order = await OrderModel.findById(orderId);
  if (!order) {
    const error = new Error("Không tìm thấy đơn hàng!");
    error.status = 404;
    throw error;
  }
  if (data.updated_at !== order.updated_at) {
    const error = new Error(
      "Đơn hàng đã thay đổi. Vui lòng tải lại trước khi sửa!",
    );
    error.status = 409;
    throw error;
  }
  const changes = {};
  for (const key of fields) {
    if (Object.hasOwn(data, key)) changes[key] = data[key];
  }
  const statuses = [
    "unpaid",
    "pending",
    "confirmed",
    "processing",
    "shipping",
    "delivered",
    "completed",
    "cancelled",
  ];
  if (changes.status === "cancel") changes.status = "cancelled";
  if (Object.hasOwn(changes, "status") && !statuses.includes(changes.status))
    throw new Error("Trạng thái đơn hàng không hợp lệ!");
  for (const key of [
    "recipient_name",
    "recipient_phone",
    "recipient_address",
  ]) {
    if (!Object.hasOwn(changes, key)) continue;
    if (typeof changes[key] !== "string" || !changes[key].trim()) {
      throw new Error("Vui lòng nhập đầy đủ thông tin người nhận!");
    }
    changes[key] = changes[key].trim();
  }
  if (changes.recipient_phone && !/^0\d{9}$/.test(changes.recipient_phone)) {
    throw new Error("Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0!");
  }
  if (
    Object.hasOwn(changes, "payment_method") &&
    !paymentMethods.has(changes.payment_method)
  ) {
    throw new Error("Phương thức thanh toán không hợp lệ!");
  }
  if (
    Object.hasOwn(changes, "payment_status") &&
    !["unpaid", "paid", "refunded"].includes(changes.payment_status)
  ) {
    throw new Error("Trạng thái thanh toán không hợp lệ!");
  }
  for (const key of ["total_discount_price", "shipping_fee"]) {
    if (!Object.hasOwn(changes, key)) continue;
    if (
      changes[key] === "" ||
      changes[key] === null ||
      !Number.isSafeInteger(Number(changes[key])) ||
      Number(changes[key]) < 0
    ) {
      throw new Error("Số tiền phải là số nguyên không âm!");
    }
    changes[key] = Number(changes[key]);
  }
  const originalItems = order.order_items || [];
  let nextItems = originalItems;
  let itemsChanged = false;
  if (Object.hasOwn(data, "order_items")) {
    if (
      !Array.isArray(data.order_items) ||
      !data.order_items.length ||
      data.order_items.length !== originalItems.length
    ) {
      throw new Error("Danh sách sản phẩm trong đơn hàng không hợp lệ!");
    }
    const ids = new Set();
    nextItems = data.order_items.map((item) => {
      const original = originalItems.find(
        (row) => row.order_item_id === item?.order_item_id,
      );
      if (!original || ids.has(item.order_item_id))
        throw new Error("Sản phẩm không thuộc đơn hàng hoặc bị trùng!");
      ids.add(item.order_item_id);
      const quantity = Number(item.quantity);
      const price = Number(item.unit_price);
      if (
        !Number.isSafeInteger(quantity) ||
        quantity <= 0 ||
        quantity > 2147483647 ||
        item.unit_price === "" ||
        item.unit_price === null ||
        !Number.isSafeInteger(price) ||
        price < 0 ||
        !Number.isSafeInteger(quantity * price)
      ) {
        throw new Error(
          "Số lượng phải là số nguyên dương, đơn giá phải là số nguyên không âm!",
        );
      }
      if (
        quantity !== Number(original.quantity) ||
        price !== Number(original.unit_price)
      )
        itemsChanged = true;
      return { ...original, quantity, unit_price: price };
    });
  }
  if (role === "admin") {
    const discount =
      changes.total_discount_price ?? Number(order.total_discount_price || 0);
    const shipping = changes.shipping_fee ?? Number(order.shipping_fee || 0);
    const subtotal = itemsChanged
      ? nextItems.reduce(
          (total, item) => total + item.quantity * item.unit_price,
          0,
        )
      : Number(order.total_original_price || 0);
    if (
      !Number.isSafeInteger(subtotal) ||
      !Number.isSafeInteger(subtotal - discount + shipping)
    ) {
      throw new Error("Tổng tiền đơn hàng không hợp lệ!");
    }
    if (discount > subtotal)
      throw new Error("Tiền giảm giá không được lớn hơn tiền hàng!");
    changes.final_amount = subtotal - discount + shipping;
    if (itemsChanged) changes.total_original_price = subtotal;
  }

  // Chênh lệch tồn kho theo số lượng mới và việc chuyển vào/ra trạng thái đã hủy.
  const wasCancelled = ["cancel", "cancelled"].includes(order.status);
  const isCancelled = ["cancel", "cancelled"].includes(
    changes.status ?? order.status,
  );
  const differences = new Map();
  for (const item of originalItems) {
    differences.set(
      item.variant_id,
      (differences.get(item.variant_id) || 0) -
        (wasCancelled ? 0 : Number(item.quantity)),
    );
  }
  for (const item of nextItems) {
    differences.set(
      item.variant_id,
      (differences.get(item.variant_id) || 0) +
        (isCancelled ? 0 : Number(item.quantity)),
    );
  }
  const reserveItems = [];
  const restoreItems = [];
  for (const [variant_id, quantity] of differences) {
    if (quantity > 0) reserveItems.push({ variant_id, quantity });
    if (quantity < 0) restoreItems.push({ variant_id, quantity: -quantity });
  }
  const updated = await OrderModel.updateForAdmin(order, changes);
  let reserved = false;
  let itemsUpdated = false;
  try {
    if (reserveItems.length) {
      await reserveStock(reserveItems);
      reserved = true;
    }
    if (itemsChanged) {
      await OrderModel.updateItemsForAdmin(nextItems);
      itemsUpdated = true;
    }
    if (restoreItems.length) await restoreStock(restoreItems);
  } catch (error) {
    if (itemsUpdated) await OrderModel.updateItemsForAdmin(originalItems);
    if (reserved) await restoreStock(reserveItems);
    const previous = Object.fromEntries(
      Object.keys(changes).map((key) => [key, order[key]]),
    );
    await OrderModel.updateForAdmin(updated, previous);
    throw error;
  }
  return updated;
};

export const getOrderByIdForAdmin = async (orderId) => {
  try {
    const order = await OrderModel.findById(orderId);

    if (!order) {
      throw new Error("Không tìm thấy đơn hàng!");
    }

    if (Array.isArray(order.order_items) && order.order_items.length > 0) {
      const variantIds = [
        ...new Set(
          order.order_items.map((item) => item.variant_id).filter(Boolean),
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
    console.error("Lỗi tại getOrderByIdForAdmin Service:", error.message);
    throw new Error(
      error.message || "Không thể lấy thông tin chi tiết đơn hàng!",
    );
  }
};

export const confirmAllPendingOrders = async (status = "confirmed") => {
  try {
    const updatedOrders = await OrderModel.confirmAllPendingOrders(status);
    return {
      updatedCount: updatedOrders ? updatedOrders.length : 0,
      updatedOrders: updatedOrders || [],
    };
  } catch (error) {
    console.error("Lỗi tại confirmAllPendingOrders Service:", error.message);
    throw new Error(error.message || "Không thể duyệt tất cả đơn hàng!");
  }
};

export const confirmOrdersBulk = async (
  orderIds,
  status = "confirmed",
  fromStatus = "pending",
) => {
  try {
    const ids = Array.isArray(orderIds)
      ? orderIds.map((id) => String(id).trim()).filter(Boolean)
      : [String(orderIds).trim()].filter(Boolean);

    if (ids.length === 0) {
      throw new Error("Danh sách đơn hàng cần duyệt không được để trống!");
    }

    const updatedOrders = await OrderModel.updateStatusBulk(
      ids,
      status,
      fromStatus,
    );

    return {
      updatedCount: updatedOrders ? updatedOrders.length : 0,
      updatedOrders: updatedOrders || [],
    };
  } catch (error) {
    console.error("Lỗi tại confirmOrdersBulk Service:", error.message);
    throw new Error(error.message || "Không thể duyệt đơn hàng!");
  }
};

export const cancelOrder = async (accountId, orderId) => {
  try {
    const order = await OrderModel.findByIdAndAccountId(orderId, accountId);

    if (!order) {
      throw new Error("Không tìm thấy đơn hàng!");
    }

    const paymentMethod = String(order.payment_method || "").toLowerCase();

    if (paymentMethod === "bank" || paymentMethod === "sepay") {
      throw new Error(
        "Đơn hàng thanh toán qua Ngân hàng hoặc SePay không được phép hủy!",
      );
    }

    if (paymentMethod !== "cod") {
      throw new Error("Phương thức thanh toán này không hỗ trợ hủy đơn hàng!");
    }

    const status = String(order.status || "").toLowerCase();

    if (status !== "pending") {
      throw new Error(
        "Đơn hàng chỉ có thể hủy khi ở trạng thái Chờ xác nhận (pending)!",
      );
    }

    const updatedOrder = await OrderModel.cancelOrder(orderId, accountId);

    // Trả lại tồn kho cho các sản phẩm trong đơn hàng
    if (Array.isArray(order.order_items) && order.order_items.length > 0) {
      const restoreItems = order.order_items.map((item) => ({
        variant_id: item.variant_id,
        quantity: -item.quantity, // Số lượng âm để cộng trả lại tồn kho trong product-service
      }));

      try {
        await sendUpdateProductStock(restoreItems);
      } catch (stockErr) {
        console.error("Lỗi khi gửi sự kiện hoàn tồn kho:", stockErr.message);
      }
    }

    return updatedOrder;
  } catch (error) {
    console.error("Lỗi tại cancelOrder Service:", error.message);
    throw new Error(error.message || "Không thể hủy đơn hàng!");
  }
};

// Thống kê số đơn hàng theo tài khoản
export const getUserOrderCounts = async () => {
  const orders = await OrderModel.getOrderAccounts();
  const counts = {};

  for (const order of orders) {
    counts[order.account_id] = (counts[order.account_id] || 0) + 1;
  }

  return counts;
};

// Admin creates an order directly, without changing a customer's cart.
export const createOrderForAdmin = async (data, authorization) => {
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new Error("Thông tin đơn hàng không hợp lệ!");
  const recipient = {};
  for (const key of [
    "recipient_name",
    "recipient_phone",
    "recipient_address",
  ]) {
    if (typeof data[key] !== "string" || !data[key].trim())
      throw new Error("Vui lòng nhập đầy đủ thông tin người nhận!");
    recipient[key] = data[key].trim();
  }
  if (!/^0\d{9}$/.test(recipient.recipient_phone))
    throw new Error("Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0!");
  if (!paymentMethods.has(data.payment_method))
    throw new Error("Phương thức thanh toán không hợp lệ!");
  if (
    typeof data.account_id !== "string" ||
    typeof data.profile_id !== "string" ||
    !data.profile_id
  )
    throw new Error("Vui lòng chọn tài khoản khách hàng!");
  const customerResponse = await fetch(
    `${config.authServiceUrl.replace(/\/$/, "")}/manage/profiles/${encodeURIComponent(data.profile_id)}`,
    {
      headers: { Authorization: authorization || "" },
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!customerResponse.ok)
    throw new Error(
      "Không thể xác minh khách hàng. Kiểm tra quyền xem khách hàng và thử lại!",
    );
  const { data: customer } = await customerResponse.json();
  if (
    customer?.account_id !== data.account_id ||
    customer?.role_name !== "customer" ||
    customer?.status !== "active"
  )
    throw new Error("Vui lòng chọn tài khoản khách hàng đang hoạt động!");
  if (
    !Array.isArray(data.order_items) ||
    !data.order_items.length ||
    data.order_items.length > 100
  )
    throw new Error("Vui lòng chọn từ 1 đến 100 sản phẩm!");
  const ids = new Set();
  for (const item of data.order_items) {
    if (
      !item ||
      typeof item.variant_id !== "string" ||
      !item.variant_id ||
      ids.has(item.variant_id) ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 2147483647
    )
      throw new Error("Sản phẩm bị trùng hoặc số lượng không hợp lệ!");
    ids.add(item.variant_id);
  }
  const details = await requestProductDetails([...ids]);
  const orderId = generateId("order");
  const items = data.order_items.map((item) => {
    const detail = details.find((row) => row.variant_id === item.variant_id);
    if (!detail || Number(detail.stock_quantity) < item.quantity)
      throw new Error("Sản phẩm không tồn tại hoặc không đủ tồn kho!");
    const price = Number(detail.discount_price || detail.original_price || 0);
    if (!Number.isSafeInteger(price) || price < 0)
      throw new Error("Giá sản phẩm không hợp lệ!");
    return {
      order_item_id: generateId("oi"),
      order_id: orderId,
      product_id: detail.product_id,
      variant_id: detail.variant_id,
      product_name: detail.product_name,
      size: detail.size,
      color: detail.color,
      unit_price: price,
      quantity: item.quantity,
    };
  });
  const subtotal = items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0,
  );
  const money = {};
  for (const key of ["shipping_fee", "total_discount_price"]) {
    const value = data[key] ?? 0;
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)
      throw new Error("Số tiền phải là số nguyên không âm!");
    money[key] = value;
  }
  const total = subtotal - money.total_discount_price + money.shipping_fee;
  if (
    !Number.isSafeInteger(subtotal) ||
    !Number.isSafeInteger(total) ||
    money.total_discount_price > subtotal
  )
    throw new Error("Tổng tiền hoặc giảm giá không hợp lệ!");
  await reserveStock(items);
  let order;
  try {
    order = await OrderModel.createOrder({
      order_id: orderId,
      order_code: generateOrderCode(),
      account_id: data.account_id,
      ...recipient,
      ...money,
      total_original_price: subtotal,
      final_amount: total,
      payment_method: data.payment_method,
      payment_status: "unpaid",
      status: data.payment_method === "cod" ? "pending" : "unpaid",
    });
    await OrderModel.createOrderItems(items);
  } catch (error) {
    try {
      if (order) await OrderModel.deleteIncompleteOrder(orderId);
    } finally {
      await restoreStock(items);
    }
    throw error;
  }
  return { ...order, order_items: items };
};
