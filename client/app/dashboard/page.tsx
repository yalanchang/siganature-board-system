'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Document {
  id: number;
  title: string;
  description: string;
  status: string;
  created_at: string;
  creator_name: string;
  signature_count: number;
  total_signers: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // 後端 API 基礎 URL
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/');
      return;
    }

    setUser(JSON.parse(userData));
    fetchDocuments(token);
  }, [router]);

  const fetchDocuments = async (token: string) => {
    try {
      console.log('📍 Fetching documents from:', `${API_URL}/documents`);
      
      const response = await fetch(`${API_URL}/documents`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      console.log('📊 Response status:', response.status);

      if (!response.ok) {
        throw new Error(`獲取文件失敗: ${response.status}`);
      }

      const data = await response.json();
      console.log('✓ Documents loaded:', data.documents?.length || 0);
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('❌ 獲取文件錯誤:', error);
      alert('無法載入文件，請檢查伺服器連接');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-200 text-gray-800',
      pending: 'bg-yellow-200 text-yellow-800',
      signed: 'bg-green-200 text-green-800',
      rejected: 'bg-red-200 text-red-800',
    };

    const labels: Record<string, string> = {
      draft: '草稿',
      pending: '待簽署',
      signed: '已完成',
      rejected: '已拒絕',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">載入中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頂部導航欄 */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-indigo-600">
                電子簽章系統
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                歡迎, <span className="font-semibold">{user?.username}</span>
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                登出
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 主要內容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">我的文件</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-md"
          >
            + 創建新文件
          </button>
        </div>

        {/* 文件列表 */}
        {documents.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-500 text-lg mb-4">還沒有任何文件</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              創建您的第一個文件
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 cursor-pointer"
                onClick={() => router.push(`/documents/${doc.id}`)}
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex-1">
                    {doc.title}
                  </h3>
                  {getStatusBadge(doc.status)}
                </div>
                
                {doc.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {doc.description}
                  </p>
                )}
                
                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">
                      創建者: {doc.creator_name}
                    </span>
                    <span className="text-gray-500">
                      {doc.signature_count}/{doc.total_signers} 已簽署
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-400">
                    {new Date(doc.created_at).toLocaleDateString('zh-TW')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 創建文件模態框 */}
      {showCreateModal && (
        <CreateDocumentModal
          apiUrl={API_URL}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            const token = localStorage.getItem('token');
            if (token) fetchDocuments(token);
          }}
        />
      )}
    </div>
  );
}

function CreateDocumentModal({
  apiUrl,
  onClose,
  onSuccess,
}: {
  apiUrl: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    signerEmails: [''],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 驗證表單
      if (!formData.title.trim()) {
        throw new Error('請輸入文件標題');
      }

      const validEmails = formData.signerEmails.filter(email => email.trim());
      
      const payload = {
        title: formData.title,
        description: formData.description,
        signerEmails: validEmails,
      };


      const token = localStorage.getItem('token');
      const response = await fetch(`${apiUrl}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        credentials: 'include',
      });


      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '創建失敗');
      }

      onSuccess();
    } catch (err: any) {
      console.error('❌ 創建文件錯誤:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-8 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">創建新文件</h2>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              文件標題 *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="輸入文件標題"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              描述
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="輸入文件描述（可選）"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              簽署者電子郵件
            </label>
            {formData.signerEmails.map((email, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    const newEmails = [...formData.signerEmails];
                    newEmails[index] = e.target.value;
                    setFormData({ ...formData, signerEmails: newEmails });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="user@example.com"
                />
                {formData.signerEmails.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newEmails = formData.signerEmails.filter(
                        (_, i) => i !== index
                      );
                      setFormData({ ...formData, signerEmails: newEmails });
                    }}
                    className="px-4 py-2 text-red-600 hover:text-red-800"
                  >
                    刪除
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setFormData({
                  ...formData,
                  signerEmails: [...formData.signerEmails, ''],
                })
              }
              className="text-sm text-indigo-600 hover:text-indigo-800 mt-2"
            >
              + 添加簽署者
            </button>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {loading ? '創建中...' : '創建文件'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}