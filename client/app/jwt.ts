'use client'

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ;

export interface TokenPayload {
  userId: number;
  username: string;
  email: string;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}