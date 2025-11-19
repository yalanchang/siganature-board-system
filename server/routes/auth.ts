import pkg from 'express';
const express = pkg;
import bcrypt from 'bcryptjs';
import db from '../lib/db.ts';
import { generateToken } from '../lib/jwt.ts';

const router = express.Router();

// 登入
router.post('/login', async (req, res) => {
  try {
    console.log('Login attempt:', { email: req.body.email });
    
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: '電子郵件和密碼都是必填的'
      });
    }

    const [users] = await db.query(
      'SELECT id, username, email, password FROM users WHERE email = ?',
      [email]
    );

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(401).json({
        error: '電子郵件或密碼錯誤'
      });
    }

    const user = users[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: '電子郵件或密碼錯誤'
      });
    }

    const token = generateToken({
      userId: user.id,
      username: user.username,
      email: user.email
    });

    console.log('Login successful:', { userId: user.id });

    return res.status(200).json({
      message: '登入成功',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      token
    });
  } catch (error) {
    console.error('登入錯誤:', error);
    return res.status(500).json({
      error: '登入失敗，請稍後再試',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 註冊
router.post('/register', async (req, res) => {
  try {
    console.log('Register attempt:', { email: req.body.email, username: req.body.username });
    
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        error: '所有欄位都是必填的'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: '密碼至少需要 6 個字符'
      });
    }

    const [existingUsers] = await db.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      return res.status(409).json({
        error: '用戶名或電子郵件已被使用'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    const userId = result.insertId;

    const token = generateToken({
      userId,
      username,
      email
    });

    console.log('Register successful:', { userId });

    return res.status(201).json({
      message: '註冊成功',
      user: { id: userId, username, email },
      token
    });
  } catch (error) {
    console.error('註冊錯誤:', error);
    return res.status(500).json({
      error: '註冊失敗，請稍後再試',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;