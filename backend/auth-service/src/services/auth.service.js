import { supabase } from '../configs/supabase.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../configs/index.js';

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