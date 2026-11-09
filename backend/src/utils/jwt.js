import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const SECRET = process.env.JWT_SECRET;

export function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), username: user.username },
    SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}