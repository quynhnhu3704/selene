import dotenv from 'dotenv';
dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET environment variable.');
  process.exit(1);
}

export const config = {
  port: process.env.PORT || 8002,
  jwtSecret: process.env.JWT_SECRET
};
