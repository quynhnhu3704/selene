import jwt from 'jsonwebtoken';
import { config } from '../configs/index.js';

export const authService = {
  login: async (username, password) => {
    // Hardcoded credentials as per requirements
    if (username === 'admin' && password === '123456') {
      const token = jwt.sign({ username }, config.jwtSecret, { expiresIn: '1h' });
      return { token };
    }
    
    throw new Error('Invalid credentials');
  }
};
