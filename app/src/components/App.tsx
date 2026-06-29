import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navbar } from '@/components/Navbar';
import { BackgroundMusic } from '@/components/BackgroundMusic';
import { NotificationTicker } from '@/components/NotificationTicker';
import LoginPage from '@/pages/LoginPage';
import HomePage from '@/pages/HomePage';
import DecryptRecords from '@/pages/DecryptRecords';
import RecordDetail from '@/pages/RecordDetail';
import CustomPuzzles from '@/pages/CustomPuzzles';
import DecryptWiki from '@/pages/DecryptWiki';
import MessageBoard from '@/pages/MessageBoard';
import AdminPage from '@/pages/AdminPage';
import SarcophagusTerminal from '@/pages/SarcophagusTerminal';
import './App.css';

// 全局 spoiler 点击固定显示（覆盖所有 dangerouslySetInnerHTML 渲染区域）
function SpoilerClickHandler() {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      // 编辑器里已有自己的 click handler，这里只处理显示端
      if (el.closest('[contenteditable]')) return;
      const spoiler = el.closest('.spoiler-text') as HTMLElement | null;
      if (spoiler) spoiler.classList.toggle('revealed');
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);
  return null;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <NotificationTicker />
      <Navbar />
      <main className="pt-0 page-enter">
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SpoilerClickHandler />
        <BackgroundMusic />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout><HomePage /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/records"
            element={
              <ProtectedRoute>
                <AppLayout><DecryptRecords /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/records/:id"
            element={
              <ProtectedRoute>
                <AppLayout><RecordDetail /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/puzzles"
            element={
              <ProtectedRoute>
                <AppLayout><CustomPuzzles /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/wiki"
            element={
              <ProtectedRoute>
                <AppLayout><DecryptWiki /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <AppLayout><MessageBoard /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/lynchpin-admin"
            element={
              <ProtectedRoute>
                <AppLayout><AdminPage /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sarcophagus"
            element={
              <ProtectedRoute>
                <SarcophagusTerminal />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
