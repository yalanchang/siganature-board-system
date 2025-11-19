import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-12345';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';


export function generateToken(payload) {
  try {

    if (!JWT_SECRET || JWT_SECRET.length === 0) {
      throw new Error('JWT_SECRET is not set! Check your .env file.');
    }

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRY,
    });
    
    return token;
  } catch (error) {
    console.error('❌ Generate token error:', error.message);
    throw error;
  }
}

export function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error('Verify token error:', error);
    return null;
  }
}


export function decodeToken(token) {
  try {
    const decoded = jwt.decode(token);
    return decoded;
  } catch (error) {
    console.error('Decode token error:', error);
    return null;
  }
}