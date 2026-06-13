import { authService } from '../services/auth.service.js';

export const authController = {
  login: async (req, res, next) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Username and password required' });
      }

      const result = await authService.login(username, password);
      res.json(result);
    } catch (error) {
      if (error.message === 'Invalid credentials') {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      next(error);
    }
  }
};
