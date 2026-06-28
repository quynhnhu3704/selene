import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../configs/index.js';
import { AccountModel } from '../models/account.model.js';

const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
};

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URL
);

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

// Đăng ký tài khoản
export const registerUser = async ({ email, phone, password, full_name }) => {
  const now = new Date().toISOString();

  // Kiểm tra email hoặc số điện thoại có tồn tại chưa
  const existingAccount = await AccountModel.findByEmailOrPhone(email, phone);
  if (existingAccount) {
    throw new Error('Email hoặc số điện thoại đã được đăng ký!');
  }

  // Tìm Role customer
  const roleData = await AccountModel.findRoleByName('customer');
  if (!roleData) throw new Error('Hệ thống chưa cấu hình vai trò customer!');

  const hashedPassword = await bcrypt.hash(password, 10);
  const accountId = 'acc-' + generateId();

  // Lưu vào bảng accounts
  await AccountModel.createAccount({
    account_id: accountId,
    email,
    phone,
    password: hashedPassword,
    role_id: roleData.role_id,
    role_name: 'customer',
    status: 'active',
    created_at: now,
    updated_at: now
  });

  // Lưu vào bảng user_profiles
  await AccountModel.createProfile({
    profile_id: 'user-' + generateId(),
    account_id: accountId,
    full_name,
    phone_number: phone,
    status: 'active',
    created_at: now,
    updated_at: now
  });

  return { message: 'Đăng ký tài khoản thành công!' };
};

// Đăng nhập
export const loginUser = async (email, password) => {
  // Tìm tài khoản
  const account = await AccountModel.findByEmail(email);

  // Sai tài khoản
  if (!account) {
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

  // lấy quyền và chuyển quyền thành mảng
  const permissions = await AccountModel.getPermissionsByRoleId(account.role_id);

  // dữ liệu được nhúng vào jwt
  const payload = {
    accountId: account.account_id,
    role: account.role_name,
    permissions
  };

  const accessToken = jwt.sign(payload, config.jwtAccessSecret, { expiresIn: '3h' });
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
export const forgotPasswordService = async (email) => {
  // Kiểm tra email đầu vào xem có tài khoản nào sở hữu chưa
  const account = await AccountModel.findByEmail(email);
  if (!account) {
    throw new Error('Địa chỉ email này không tồn tại trong hệ thống!');
  }

  // Tạo ra mật khẩu chữ thô ngẫu nhiên (Ví dụ: R5T9M2XQ)
  const newRawPassword = generateRandomPassword();

  // Mã hóa mật khẩu thô này thành chuỗi Bcrypt bảo mật để lưu vào DB
  const hashedNewPassword = await bcrypt.hash(newRawPassword, 10);

  // Tiến hành cập nhật đè mật khẩu cũ trong bảng accounts bằng mật khẩu mới đã mã hóa
  try {
    await AccountModel.updateAccount(email, { 
      password: hashedNewPassword,
      updated_at: new Date().toISOString()
    });
  } catch (updateError) {
    throw new Error(`Lỗi cập nhật mật khẩu vào Database: ${updateError.message}`);
  }

  // Thiết kế mẫu email gửi đi (Định dạng HTML giúp hiển thị giao diện đẹp mắt)
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

  // Gọi lệnh thực hiện bắn email ra môi trường Internet
  try {
    await transporter.sendMail(mailOptions);
    return { message: 'Hệ thống đã cấp mật khẩu mới và gửi email khôi phục thành công!' };
  } catch (mailError) {
    console.error('Thực tế lỗi gửi Mail của Google:', mailError);
    throw new Error('Cập nhật DB thành công nhưng server Mail bị từ chối gửi thư!');
  }
};

// đăng nhập với gg
export const loginWithGoogle = async (code) => {
  let payload;
  try {
    // 1. Dùng authorization code nhận từ Frontend để đổi lấy bộ tokens từ Server Google
    const { tokens } = await googleClient.getToken({
      code: code,
      client_id: process.env.GOOGLE_CLIENT_ID,         
      client_secret: process.env.GOOGLE_CLIENT_SECRET, 
      redirectUri: process.env.GOOGLE_REDIRECT_URL
    });
    
    // 2. Xác thực chuỗi id_token nhận được để lấy thông tin tài khoản giải mã
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    console.error('Lỗi kết nối hoặc đổi mã xác thực với Google:', err.message);
    throw new Error('Đổi mã authorization code thất bại hoặc mã đã hết hạn!');
  }

  // Lấy dữ liệu Email, Tên, Ảnh đại diện từ Google cung cấp
  const { email, name, picture } = payload;
  const now = new Date().toISOString();

  // 3. Truy vấn xem tài khoản Email này đã từng tồn tại trong bảng accounts chưa
  let account = await AccountModel.findByEmail(email);

  // 4. Nếu tài khoản chưa tồn tại -> Tự động đăng ký một tài khoản khách hàng mới tinh
  if (!account) {
    const accountId = 'acc-' + generateId();
    const dummyPassword = await bcrypt.hash(Math.random().toString(36), 10);

    // Tìm Role customer động từ DB để tránh fix cứng ID sai lệch
    const roleData = await AccountModel.findRoleByName('customer');
    const finalRoleId = roleData ? roleData.role_id : '3'; // Fallback về '3' nếu DB lỗi

    // Insert thông tin vào bảng accounts
    try {
      account = await AccountModel.createAccount({
        account_id: accountId,
        email,
        password: dummyPassword,
        role_id: finalRoleId, 
        role_name: 'customer',
        status: 'active',
        created_at: now,
        updated_at: now
      });
    } catch (accError) {
      throw new Error(`Lỗi tạo tài khoản từ Google: ${accError.message}`);
    }

    // Insert thông tin chi tiết kèm ảnh đại diện vào bảng user_profiles
    try {
      await AccountModel.createProfile({
        profile_id: 'user-' + generateId(),
        account_id: accountId,
        full_name: name,
        avatar_url: picture,
        status: 'active',
        created_at: now,
        updated_at: now
      });
    } catch (profError) {
      throw new Error(`Lỗi tạo hồ sơ người dùng từ Google: ${profError.message}`);
    }
  }

  // 5. Nếu tài khoản bị quản trị viên khóa thì từ chối cấp quyền đăng nhập
  if (account.status === 'inactive') {
    throw new Error('Tài khoản liên kết Google này hiện đang bị tạm khóa!');
  }

  // 6. Ký cấp bộ mã token nội bộ của riêng hệ thống shop quần áo để người dùng truy cập API
  const jwtPayload = { accountId: account.account_id, role: account.role_name, permissions: [] };
  const accessToken = jwt.sign(jwtPayload, config.jwtAccessSecret, { expiresIn: '1h' });
  const refreshToken = jwt.sign(jwtPayload, config.jwtRefreshSecret, { expiresIn: '7d' });

  return {
    message: 'Đăng nhập bằng tài khoản Google thành công!',
    accessToken,
    refreshToken,
    user: { accountId: account.account_id, email: account.email, role: account.role_name }
  };
};

// cấp lại accessToken
export const refreshAccessToken = async (refreshToken) => {
  try {
    // 1. Xác thực xem refreshToken gửi lên có hợp lệ và còn hạn không
    const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);

    // 2. Lấy thông tin tài khoản từ database để đảm bảo tài khoản vẫn đang active
    const account = await AccountModel.findById(decoded.accountId);

    if (!account || account.status === 'inactive') {
      throw new Error('Tài khoản không tồn tại hoặc đã bị khóa!');
    }

    // 3. Lấy lại danh sách quyền của tài khoản (đề phòng quyền vừa được admin thay đổi)
    const permissions = await AccountModel.getPermissionsByRoleId(account.role_id);

    // 4. Tạo Payload mới (đồng bộ cấu trúc camelCase accountId với hàm Login của bạn)
    const jwtPayload = {
      accountId: account.account_id,
      role: account.role_name,
      permissions
    };

    // 5. Ký cấp một accessToken mới (Hạn dùng 3 giờ giống lúc login)
    const newAccessToken = jwt.sign(jwtPayload, config.jwtAccessSecret, { expiresIn: '3h' });

    return {
      accessToken: newAccessToken
    };
  } catch (err) {
    console.error('Lỗi Refresh Token:', err.message);
    throw new Error('Mã Refresh Token đã hết hạn hoặc không hợp lệ, vui lòng đăng nhập lại!');
  }
};