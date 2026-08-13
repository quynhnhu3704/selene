import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Cấu hình transporter với Google SMTP
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
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
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
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
  let itemsHtml = '';
  if (items && items.length > 0) {
    items.forEach(item => {
      itemsHtml += `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.product_name} <br>
            <small style="color: #666;">Size: ${item.size} | Màu: ${item.color}</small>
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(item.unit_price)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">${formatCurrency(item.unit_price * item.quantity)}</td>
        </tr>
      `;
    });
  }

  const mailOptions = {
    from: `"Selene Shop" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: `[Selene Shop] Hóa đơn điện tử - Đơn hàng #${orderCode}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border: 1px solid #ddd;">
        <h2 style="color: #333; text-align: center;">CẢM ƠN BẠN ĐÃ ĐẶT HÀNG!</h2>
        <p>Xin chào <strong>${recipientName}</strong>,</p>
        <p>Đơn hàng <strong>#${orderCode}</strong> của bạn đã được đặt thành công. Dưới đây là thông tin chi tiết (Hóa đơn điện tử):</p>
        
        <div style="background-color: #fff; padding: 15px; margin-bottom: 20px; border: 1px solid #eee;">
          <h3 style="margin-top: 0; color: #555;">Thông tin giao hàng</h3>
          <p style="margin: 5px 0;"><strong>Người nhận:</strong> ${recipientName}</p>
          <p style="margin: 5px 0;"><strong>Số điện thoại:</strong> ${recipientPhone}</p>
          <p style="margin: 5px 0;"><strong>Địa chỉ:</strong> ${recipientAddress}</p>
          <p style="margin: 5px 0;"><strong>Phương thức thanh toán:</strong> ${paymentMethod}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; background-color: #fff; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #f1f1f1;">
              <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Sản phẩm</th>
              <th style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">SL</th>
              <th style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">Đơn giá</th>
              <th style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding: 10px; text-align: right; border-top: 2px solid #ddd;"><strong>Tổng tiền sản phẩm:</strong></td>
              <td style="padding: 10px; text-align: right; border-top: 2px solid #ddd;">${formatCurrency(totalOriginalPrice)}</td>
            </tr>
            <tr>
              <td colspan="3" style="padding: 10px; text-align: right;"><strong>Khuyến mãi (Voucher):</strong></td>
              <td style="padding: 10px; text-align: right; color: red;">- ${formatCurrency(totalDiscountPrice)}</td>
            </tr>
            <tr>
              <td colspan="3" style="padding: 10px; text-align: right;"><strong>Phí vận chuyển:</strong></td>
              <td style="padding: 10px; text-align: right;">${formatCurrency(shippingFee || 0)}</td>
            </tr>
            <tr>
              <td colspan="3" style="padding: 10px; text-align: right; font-size: 1.2em;"><strong>Tổng thanh toán:</strong></td>
              <td style="padding: 10px; text-align: right; font-size: 1.2em; font-weight: bold; color: #28a745;">${formatCurrency(finalAmount)}</td>
            </tr>
          </tfoot>
        </table>

        <p style="text-align: center; color: #888; font-size: 0.9em;">
          Nếu bạn có bất kỳ thắc mắc nào, vui lòng liên hệ với chúng tôi qua email này hoặc gọi hotline 1900 xxxx.<br>
          Trân trọng,<br>
          <strong>Đội ngũ Selene Shop</strong>
        </p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);
    return info;
  } catch (error) {
    console.error('Lỗi khi gửi email:', error);
    throw error;
  }
};
