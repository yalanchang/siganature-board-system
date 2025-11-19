import pkg from 'express';
const express = pkg;
import db from '../lib/db.ts';
import { verifyToken } from '../lib/jwt.ts';

const router = express.Router();

// 中間件：驗證 Token
const authenticateToken = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: '未授權' });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Token 無效' });
    }

    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token 驗證失敗' });
  }
};

// 應用認證中間件
router.use(authenticateToken);

// ============ 文件列表路由 ============

// 獲取所有文件
router.get('/', async (req, res) => {
  try {
    const userId = req.user.userId;

    const [documents] = await db.query(`
      SELECT DISTINCT 
        d.id,
        d.title,
        d.description,
        d.status,
        d.created_at,
        d.updated_at,
        u.username as creator_name,
        (SELECT COUNT(*) FROM signatures s WHERE s.document_id = d.id) as signature_count,
        (SELECT COUNT(*) FROM document_signers ds WHERE ds.document_id = d.id) as total_signers
      FROM documents d
      LEFT JOIN users u ON d.creator_id = u.id
      LEFT JOIN document_signers ds ON d.id = ds.document_id
      WHERE d.creator_id = ? OR ds.user_id = ?
      ORDER BY d.created_at DESC
    `, [userId, userId]);

    return res.status(200).json({ documents });
  } catch (error) {
    console.error('獲取文件錯誤:', error);
    return res.status(500).json({
      error: '獲取文件失敗'
    });
  }
});

// 創建新文件
router.post('/', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { title, description, signerEmails } = req.body;

    if (!title) {
      return res.status(400).json({
        error: '標題是必填的'
      });
    }

    const [result] = await db.query(
      'INSERT INTO documents (title, description, creator_id, status) VALUES (?, ?, ?, ?)',
      [title, description || '', userId, 'pending']
    );

    const documentId = result.insertId;

    if (signerEmails && Array.isArray(signerEmails) && signerEmails.length > 0) {
      for (let i = 0; i < signerEmails.length; i++) {
        const email = signerEmails[i];
        
        const [users] = await db.query(
          'SELECT id FROM users WHERE email = ?',
          [email]
        );

        if (Array.isArray(users) && users.length > 0) {
          const signerId = users[0].id;
          
          await db.query(
            'INSERT INTO document_signers (document_id, user_id, order_number) VALUES (?, ?, ?)',
            [documentId, signerId, i + 1]
          );
        }
      }
    }

    await db.query(
      'INSERT INTO audit_logs (document_id, user_id, action, details) VALUES (?, ?, ?, ?)',
      [documentId, userId, 'created', `文件 "${title}" 已創建`]
    );

    return res.status(201).json({
      message: '文件創建成功',
      documentId
    });
  } catch (error) {
    console.error('創建文件錯誤:', error);
    return res.status(500).json({
      error: '創建文件失敗'
    });
  }
});

// ============ 文件詳情路由 ============

// 獲取文件詳情
router.get('/:id', async (req, res) => {
  try {
    const documentId = req.params.id;

    console.log('📍 Getting document details for ID:', documentId);

    // 獲取文件信息
    const [documents] = await db.query(`
      SELECT 
        d.*,
        u.username as creator_name,
        u.email as creator_email
      FROM documents d
      LEFT JOIN users u ON d.creator_id = u.id
      WHERE d.id = ?
    `, [documentId]);

    if (!Array.isArray(documents) || documents.length === 0) {
      return res.status(404).json({ error: '文件不存在' });
    }

    const document = documents[0];
    console.log('✓ Document found:', document.title);

    // 獲取簽署者列表 - 這是關鍵部分
    console.log('🔍 Querying signers for document:', documentId);
    const [signers] = await db.query(`
      SELECT 
        ds.id,
        ds.order_number,
        ds.status,
        ds.invited_at,
        u.id as user_id,
        u.username,
        u.email
      FROM document_signers ds
      LEFT JOIN users u ON ds.user_id = u.id
      WHERE ds.document_id = ?
      ORDER BY ds.order_number
    `, [documentId]);

    console.log('📝 Signers found:', signers?.length || 0);
    if (signers && signers.length > 0) {
      signers.forEach((s, i) => {
        console.log(`  [${i}] ${s.email} - ${s.status}`);
      });
    }

    // 獲取簽章記錄
    const [signatures] = await db.query(`
      SELECT 
        s.id,
        s.signed_at,
        s.ip_address,
        u.username,
        u.email
      FROM signatures s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.document_id = ?
      ORDER BY s.signed_at
    `, [documentId]);

    console.log('✍️ Signatures found:', signatures?.length || 0);

    // 獲取審計日誌
    const [auditLogs] = await db.query(`
      SELECT 
        al.id,
        al.action,
        al.details,
        al.created_at,
        u.username
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.document_id = ?
      ORDER BY al.created_at DESC
      LIMIT 20
    `, [documentId]);

    console.log('📋 Audit logs found:', auditLogs?.length || 0);

    return res.status(200).json({
      document,
      signers: signers || [],
      signatures: signatures || [],
      auditLogs: auditLogs || []
    });
  } catch (error) {
    console.error('❌ 獲取文件詳情錯誤:', error);
    return res.status(500).json({
      error: '獲取文件詳情失敗'
    });
  }
});

// 簽署文件
router.post('/:id/sign', async (req, res) => {
  try {
    const userId = req.user.userId;
    const documentId = req.params.id;
    const { signatureData } = req.body;

    if (!signatureData) {
      return res.status(400).json({
        error: '簽章數據是必需的'
      });
    }

    const [signers] = await db.query(
      'SELECT id, status FROM document_signers WHERE document_id = ? AND user_id = ?',
      [documentId, userId]
    );

    if (!Array.isArray(signers) || signers.length === 0) {
      return res.status(403).json({
        error: '您沒有權限簽署此文件'
      });
    }

    const signer = signers[0];

    if (signer.status === 'signed') {
      return res.status(400).json({
        error: '您已經簽署過此文件'
      });
    }

    const ipAddress = (req.headers['x-forwarded-for']) || 
                      (req.headers['x-real-ip']) || 
                      req.ip || 
                      'unknown';
    const userAgent = (req.headers['user-agent']) || 'unknown';

    await db.query(
      'INSERT INTO signatures (document_id, user_id, signature_data, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)',
      [documentId, userId, signatureData, ipAddress, userAgent]
    );

    await db.query(
      'UPDATE document_signers SET status = ? WHERE id = ?',
      ['signed', signer.id]
    );

    const [allSigners] = await db.query(
      'SELECT COUNT(*) as total, SUM(CASE WHEN status = "signed" THEN 1 ELSE 0 END) as signed FROM document_signers WHERE document_id = ?',
      [documentId]
    );

    const stats = allSigners[0];
    
    if (stats.total === stats.signed) {
      await db.query(
        'UPDATE documents SET status = ? WHERE id = ?',
        ['signed', documentId]
      );
    }

    await db.query(
      'INSERT INTO audit_logs (document_id, user_id, action, details, ip_address) VALUES (?, ?, ?, ?, ?)',
      [documentId, userId, 'signed', '文件已簽署', ipAddress]
    );

    return res.status(200).json({
      message: '簽署成功',
      allSigned: stats.total === stats.signed
    });
  } catch (error) {
    console.error('簽署文件錯誤:', error);
    return res.status(500).json({
      error: '簽署失敗'
    });
  }
});

export default router;