import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Cấu hình transporter với Google SMTP
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Định dạng tiền tệ VND
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

export const sendOrderSuccessEmail = async (userEmail, orderData) => {
  const {
    orderCode,
    recipientName,
    recipientPhone,
    recipientAddress,
    totalOriginalPrice,
    totalDiscountPrice,
    shippingFee,
    finalAmount,
    paymentMethod,
    items,
  } = orderData;

  // Tạo dòng HTML cho danh sách sản phẩm
  let itemsHtml = "";
  if (items && items.length > 0) {
    items.forEach((item) => {
      itemsHtml += `
        <tr>
          <td style="padding: 15px 0; border-bottom: 1px solid #f0f0f0; min-width: 200px;">
            <p style="margin: 0; font-weight: 500; color: #111;">${item.product_name}</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #777;">Size: ${item.size} | Màu: ${item.color}</p>
          </td>
          <td style="padding: 15px 15px; border-bottom: 1px solid #f0f0f0; text-align: center; color: #555; white-space: nowrap;">${item.quantity}</td>
          <td style="padding: 15px 15px; border-bottom: 1px solid #f0f0f0; text-align: right; color: #555; white-space: nowrap;">${formatCurrency(item.unit_price)}</td>
          <td style="padding: 15px 20px 15px 0; border-bottom: 1px solid #f0f0f0; text-align: right; font-weight: 600; color: #111; white-space: nowrap;">${formatCurrency(item.unit_price * item.quantity)}</td>
        </tr>
      `;
    });
  }

  const mailOptions = {
    from: `"Selene Shop" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: `[Selene Shop] Xác nhận đơn hàng #${orderCode}`,
    html: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; background-color: #ffffff; color: #333; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.03);">
        <!-- Header -->
        <div style="text-align: center; padding: 40px 0; border-bottom: 1px solid #eaeaea; background-color: #fafafa;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 300; letter-spacing: 4px; color: #000;">SELENE</h1>
          <p style="margin: 10px 0 0; font-size: 12px; letter-spacing: 2px; color: #888; text-transform: uppercase;">Xác nhận đơn hàng</p>
        </div>

        <!-- Greeting -->
        <div style="padding: 40px 30px 20px;">
          <h2 style="margin: 0 0 15px; font-size: 20px; font-weight: 400; color: #111;">Cảm ơn bạn đã mua sắm, ${recipientName}!</h2>
          <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #555;">
            Đơn hàng <strong>#${orderCode}</strong> của bạn đã được xác nhận. Chúng tôi đang chuẩn bị các sản phẩm và sẽ thông báo cho bạn ngay khi đơn hàng được giao cho đơn vị vận chuyển.
          </p>
        </div>
        
        <!-- Order Info -->
        <div style="padding: 0 30px;">
          <div style="background-color: #fcfcfc; padding: 25px; border-radius: 6px; border: 1px solid #f0f0f0;">
            <h3 style="margin: 0 0 15px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #111; border-bottom: 1px solid #eaeaea; padding-bottom: 10px;">Thông tin giao hàng</h3>
            <table style="width: 100%; font-size: 14px; line-height: 1.6; color: #555; border-collapse: collapse;">
              <tr>
                <td style="padding: 4px 0; width: 130px; color: #888;">Người nhận:</td>
                <td style="padding: 4px 0; font-weight: 500; color: #111;">${recipientName}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #888;">Số điện thoại:</td>
                <td style="padding: 4px 0;">${recipientPhone}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #888; vertical-align: top;">Địa chỉ:</td>
                <td style="padding: 4px 0;">${recipientAddress}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #888;">Phương thức:</td>
                <td style="padding: 4px 0;">${paymentMethod}</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Order Items -->
        <div style="padding: 30px;">
          <h3 style="margin: 0 0 15px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #111;">Chi tiết đơn hàng</h3>
          <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
            <table style="width: 100%; min-width: 450px; border-collapse: collapse; font-size: 14px;">
              <thead>
                <tr>
                  <th style="padding: 10px 0; text-align: left; border-bottom: 2px solid #eaeaea; color: #888; font-weight: 500; text-transform: uppercase; font-size: 11px; letter-spacing: 1px;">Sản phẩm</th>
                  <th style="padding: 10px 15px; text-align: center; border-bottom: 2px solid #eaeaea; color: #888; font-weight: 500; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; white-space: nowrap;">SL</th>
                  <th style="padding: 10px 15px; text-align: right; border-bottom: 2px solid #eaeaea; color: #888; font-weight: 500; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; white-space: nowrap;">Đơn giá</th>
                  <th style="padding: 10px 20px 10px 0; text-align: right; border-bottom: 2px solid #eaeaea; color: #888; font-weight: 500; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; white-space: nowrap;">Tổng</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>

          <!-- Totals -->
          <div style="margin-top: 25px; padding-top: 15px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <!-- Empty spacer column to push totals to the right -->
                <td style="padding: 0;"></td>
                <!-- Totals Box -->
                <td style="width: 320px; padding: 0;">
                  <div style="background-color: #f8f9fa; border: 1px solid #eaeaea; border-radius: 8px; padding: 20px;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 6px 0; color: #555;">Tạm tính</td>
                        <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #111;">${formatCurrency(totalOriginalPrice)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #555;">Khuyến mãi</td>
                        <td style="padding: 6px 0; text-align: right; color: #d9534f; font-weight: 500;">- ${formatCurrency(totalDiscountPrice)}</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #555;">Phí vận chuyển</td>
                        <td style="padding: 6px 0; text-align: right; font-weight: 500; color: #111;">${formatCurrency(shippingFee || 0)}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 15px 0 5px;"><div style="border-top: 1px dashed #ccc;"></div></td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0 0; font-size: 13px; font-weight: 600; color: #888; text-transform: uppercase;">Tổng thanh toán</td>
                        <td style="padding: 10px 0 0; text-align: right; font-size: 18px; font-weight: 700; color: #000;">${formatCurrency(finalAmount)}</td>
                      </tr>
                    </table>
                  </div>
                </td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #fafafa; padding: 30px; text-align: center; border-top: 1px solid #eaeaea;">
          <p style="margin: 0 0 10px; font-size: 14px; color: #555;">Bạn cần hỗ trợ?</p>
          <p style="margin: 0 0 20px; font-size: 13px; color: #888;">Vui lòng phản hồi email này hoặc liên hệ hotline: <strong>1900 xxxx</strong></p>
          <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #aaa;">© ${new Date().getFullYear()} SELENE SHOP. ALL RIGHTS RESERVED.</p>
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);
    return info;
  } catch (error) {
    console.error("Lỗi khi gửi email:", error);
    throw error;
  }
};
