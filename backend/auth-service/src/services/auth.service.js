import { supabase } from '../configs/supabase.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../configs/index.js';
import nodemailer from 'nodemailer';

const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
};

// Đăng ký tài khoản
export const registerUser = async ({ email, phone, password, full_name }) => {

  const now = new Date().toISOString();

  // Kiểm tra email hoặc số điện thoại có tồn tại chưa
  const { data: existingAccount } = await supabase
    .from('accounts')
    .select('account_id')
    .or(`email.eq.${email},phone.eq.${phone}`)
    .single();

  if (existingAccount) {
    throw new Error('Email hoặc số điện thoại đã được đăng ký!');
  }

  // Tìm Role customer
  const { data: roleData } = await supabase
    .from('roles')
    .select('role_id')
    .eq('name', 'customer')
    .single();


  if (!roleData) throw new Error('Hệ thống chưa cấu hình vai trò customer!');

  const hashedPassword = await bcrypt.hash(password, 10);
  const accountId = 'acc-' + generateId();

  // Lưu vào bảng accounts
  const { error: accError } = await supabase
    .from('accounts')
    .insert([{
      account_id: accountId,
      email,
      phone,
      password: hashedPassword,
      role_id: roleData.role_id,
      role_name: 'customer',
      status: 'active',
      created_at: now,
      updated_at: now
    }]);

  if (accError) throw new Error(accError.message);

  // Lưu vào bảng user_profiles
  const { error: profileError } = await supabase
    .from('user_profiles')
    .insert([{
      profile_id: 'user_' + generateId(),
      account_id: accountId,
      full_name,
      phone_number: phone,
      status: 'active',
      created_at: now,
      updated_at: now
    }]);

  if (profileError) throw new Error(profileError.message);

  return { message: 'Đăng ký tài khoản thành công!' };
};

// Đăng nhập
export const loginUser = async (email, password) => {

  // Tìm tài khoản
  const { data: account, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('email', email)
    .single();

  // Sai tài khoản
  if (error || !account) {
    throw new Error('Email hoặc mật khẩu không chính xác!');
  }

  // Tài khoản không hoạt động
  if (account.status === 'inactive') {
    throw new Error('Tài khoản đã bị khóa hoặc chưa kích hoạt!');
  }

  // Sai mật khẩu
  const isMatch = await bcrypt.compare(password, account.password);
  if (!isMatch) {
    throw new Error('Email hoặc mật khẩu không chính xác!');
  }

  // lấy quyền
  const { data: permissionLinks } = await supabase
    .from('role_permissions')
    .select('permissions(name)')
    .eq('role_id', account.role_id);

  // chuyển quyền thành mảng
  const permissions = permissionLinks ? permissionLinks.map(p => p.permissions.name) : [];

  // dữ liệu được nhúng vào jwt
  const payload = {
    accountId: account.account_id,
    role: account.role_name,
    permissions
  };

  const accessToken = jwt.sign(payload, config.jwtAccessSecret, { expiresIn: '1h' });
  const refreshToken = jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: '7d' });

  return {
    message: 'Đăng nhập thành công!',
    accessToken,
    refreshToken,
    user: {
      accountId: account.account_id,
      email: account.email,
      role: account.role_name
    }
  };
};

// Quên mật khẩu
// Cấu hình kết nối trực tiếp đến server SMTP của Google
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT) || 465,
  secure: true, // Sử dụng SSL/TLS bắt buộc cho cổng 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Hàm tự động sinh chuỗi ký tự ngẫu nhiên gồm 8 ký tự viết hoa để làm mật khẩu mới
const generateRandomPassword = () => {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
};

export const forgotPasswordService = async (email) => {
  // Bước A: Kiểm tra email đầu vào xem có tài khoản nào sở hữu chưa
  const { data: account, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('email', email)
    .single();

  if (!account || error) {
    throw new Error('Địa chỉ email này không tồn tại trong hệ thống!');
  }

  // Bước B: Tạo ra mật khẩu chữ thô ngẫu nhiên (Ví dụ: R5T9M2XQ)
  const newRawPassword = generateRandomPassword();

  // Bước C: Mã hóa mật khẩu thô này thành chuỗi Bcrypt bảo mật để lưu vào DB
  const hashedNewPassword = await bcrypt.hash(newRawPassword, 10);
  const now = new Date().toISOString();

  // Bước D: Tiến hành cập nhật đè mật khẩu cũ trong bảng accounts bằng mật khẩu mới đã mã hóa
  const { error: updateError } = await supabase
    .from('accounts')
    .update({ 
      password: hashedNewPassword,
      updated_at: now
    })
    .eq('email', email);

  if (updateError) {
    throw new Error(`Lỗi cập nhật mật khẩu vào Database: ${updateError.message}`);
  }

  // Bước E: Thiết kế mẫu email gửi đi (Định dạng HTML giúp hiển thị giao diện đẹp mắt)
  const mailOptions = {
    from: `"Selene Shop Hỗ Trợ" <${process.env.EMAIL_USER}>`, // Tên hiển thị người gửi
    to: email, // Địa chỉ email nhận (chính là email của người dùng)
    subject: '[Selene Shop] Yêu cầu khôi phục mật khẩu thành công',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; border: 1px solid #e0e0e0; max-width: 550px; margin: 0 auto; border-radius: 8px;">
        <div style="text-align: center; border-bottom: 2px solid #ff4d4f; padding-bottom: 15px;">
          <h2 style="color: #ff4d4f; margin: 0;">SELENE SHOP SECURITY</h2>
        </div>
        <div style="padding: 20px 0;">
          <p style="font-size: 16px; color: #333;">Xin chào bạn,</p>
          <p style="font-size: 14px; color: #555; line-height: 1.5;">Hệ thống đã xử lý yêu cầu quên mật khẩu của bạn. Mật khẩu cũ của tài khoản này đã bị hủy bỏ và được thay thế bằng một mật khẩu tạm thời do hệ thống tự sinh dưới đây:</p>
          
          <div style="background-color: #fff2f0; border: 1px dashed #ffccc7; padding: 15px; border-radius: 6px; font-size: 24px; font-weight: bold; text-align: center; color: #ff4d4f; letter-spacing: 3px; margin: 25px 0;">
            ${newRawPassword}
          </div>
          
          <p style="font-size: 13px; color: #fa8c16; font-weight: 500;">⚠️ Lưu ý bảo mật:</p>
          <ul style="font-size: 13px; color: #666; padding-left: 20px; line-height: 1.6;">
            <li>Bạn phải sử dụng chính xác chuỗi ký tự viết hoa ở trên để đăng nhập lại.</li>
            <li>Sau khi vào được hệ thống, vui lòng đổi ngay mật khẩu cá nhân mới tại mục Cài đặt tài khoản để đảm bảo an toàn tuyệt đối.</li>
          </ul>
        </div>
        <div style="border-top: 1px solid #e8e8e8; padding-top: 15px; text-align: center; font-size: 12px; color: #999;">
          <p>Đây là email gửi tự động từ hệ thống Selene Shop, vui lòng không phản hồi thư này.</p>
        </div>
      </div>
    `,
  };

  // Bước F: Gọi lệnh thực hiện bắn email ra môi trường Internet
  try {
    await transporter.sendMail(mailOptions);
    return { message: 'Hệ thống đã cấp mật khẩu mới và gửi email khôi phục thành công!' };
  } catch (mailError) {
    console.error('❌ Thực tế lỗi gửi Mail của Google:', mailError);
    throw new Error('Cập nhật DB thành công nhưng server Mail bị từ chối gửi thư!');
  }
};
