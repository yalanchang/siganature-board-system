'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import SignatureCanvas from 'signature_pad';

interface DocumentData {
  document: any;
  signers: any[];
  signatures: any[];
  auditLogs: any[];
}

export default function DocumentPage() {
  const router = useRouter();
  const params = useParams();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignatureCanvas | null>(null);

  const [data, setData] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);

  // 後端 API 基礎 URL
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/');
      return;
    }

    fetchDocumentData(token);
  }, [params.id, router]);

  useEffect(() => {
    if (showSignModal && canvasRef.current) {
      signaturePadRef.current = new SignatureCanvas(canvasRef.current, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'rgb(0, 0, 0)',
      });

      const resizeCanvas = () => {
        if (canvasRef.current && signaturePadRef.current) {
          const ratio = Math.max(window.devicePixelRatio || 1, 1);
          canvasRef.current.width = canvasRef.current.offsetWidth * ratio;
          canvasRef.current.height = canvasRef.current.offsetHeight * ratio;
          canvasRef.current.getContext('2d')?.scale(ratio, ratio);
          signaturePadRef.current.clear();
        }
      };

      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);

      return () => {
        window.removeEventListener('resize', resizeCanvas);
      };
    }
  }, [showSignModal]);

  const fetchDocumentData = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/documents/${params.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`獲取文件失敗: ${response.status}`);
      }

      const result = await response.json();
      console.log('📋 Document data:', result);
      setData(result);
    } catch (error) {
      console.error('獲取文件錯誤:', error);
      alert('無法載入文件');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  // 簽署文件
  const handleSign = async () => {
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      alert('請先簽名');
      return;
    }

    setSigning(true);

    try {
      const signatureData = signaturePadRef.current.toDataURL();
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}/documents/${params.id}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ signatureData }),
        credentials: 'include',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '簽署失敗');
      }

      alert('簽署成功！');
      setShowSignModal(false);
      
      // 重新載入文件數據
      if (token) fetchDocumentData(token);
    } catch (error: any) {
      console.error('簽署錯誤:', error);
      alert(error.message);
    } finally {
      setSigning(false);
    }
  };

  const clearSignature = () => {
    signaturePadRef.current?.clear();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">載入中...</div>
      </div>
    );
  }

  if (!data) return null;

  const { document, signers, signatures, auditLogs } = data;
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  
  const canSign = signers.some(
    (s: any) => s.email === currentUser.email && s.status === 'pending'
  );


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

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              ← 返回儀表板
            </button>
            <h1 className="text-xl font-bold text-gray-900">文件詳情</h1>
            <div className="w-24"></div>
          </div>
        </div>
      </nav>

      {/* 主要內容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左側 - 文件資訊 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 文件基本資訊 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  {document.title}
                </h2>
                {getStatusBadge(document.status)}
              </div>

              {document.description && (
                <p className="text-gray-600 mb-4">{document.description}</p>
              )}

              <div className="border-t pt-4 mt-4 space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>創建者:</span>
                  <span className="font-medium">{document.creator_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>創建時間:</span>
                  <span>
                    {new Date(document.created_at).toLocaleString('zh-TW')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>最後更新:</span>
                  <span>
                    {new Date(document.updated_at).toLocaleString('zh-TW')}
                  </span>
                </div>
              </div>

              {canSign && (
                <button
                  onClick={() => setShowSignModal(true)}
                  className="mt-6 w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  立即簽署
                </button>
              )}
            </div>

            {/* 簽署者列表 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                簽署者 ({signers.length})
              </h3>
              <div className="space-y-3">
                {signers.length === 0 ? (
                  <p className="text-gray-500">沒有簽署者</p>
                ) : (
                  signers.map((signer: any) => (
                    <div
                      key={signer.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {signer.username || '未知用戶'}
                        </div>
                        <div className="text-sm text-gray-600">{signer.email}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">
                          順序: {signer.order_number}
                        </span>
                        {getStatusBadge(signer.status)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 簽章記錄 */}
            {signatures && signatures.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  簽章記錄 ({signatures.length})
                </h3>
                <div className="space-y-4">
                  {signatures.map((sig: any) => (
                    <div
                      key={sig.id}
                      className="p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-gray-900">
                            {sig.username}
                          </div>
                          <div className="text-sm text-gray-600">{sig.email}</div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(sig.signed_at).toLocaleString('zh-TW')}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        IP: {sig.ip_address}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 右側 - 審計日誌 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                活動日誌
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {auditLogs && auditLogs.length > 0 ? (
                  auditLogs.map((log: any) => (
                    <div
                      key={log.id}
                      className="pb-3 border-b border-gray-200 last:border-b-0"
                    >
                      <div className="text-sm font-medium text-gray-900">
                        {log.action}
                      </div>
                      {log.details && (
                        <div className="text-sm text-gray-600 mt-1">
                          {log.details}
                        </div>
                      )}
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-500">
                          {log.username || '系統'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(log.created_at).toLocaleString('zh-TW', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">沒有活動記錄</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 簽章模態框 */}
      {showSignModal && (
        <div className=" inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              電子簽章
            </h2>

            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                請在下方區域簽署您的名字
              </p>
              <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                <canvas
                  ref={canvasRef}
                  className="w-full cursor-crosshair"
                  style={{ height: '300px' }}
                />
              </div>
              <button
                onClick={clearSignature}
                className="mt-2 text-sm text-gray-600 hover:text-gray-800"
              >
                清除簽名
              </button>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowSignModal(false)}
                disabled={signing}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={handleSign}
                disabled={signing}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {signing ? '簽署中...' : '確認簽署'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}