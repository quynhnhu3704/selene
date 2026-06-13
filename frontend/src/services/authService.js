import api from './axios';

export const login = async (username, password) => {
  return await api.post("/api/auth/login", {
    username,
    password,
  });
};