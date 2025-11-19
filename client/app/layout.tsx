import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: '電子簽章系統',
  description: '安全的電子文件簽署平台',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}