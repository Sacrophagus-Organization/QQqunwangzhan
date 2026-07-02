import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import PageAccessRoute from '@/components/PageAccessRoute';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BackgroundMusic } from '@/components/BackgroundMusic';
import { NotificationTicker } from '@/components/NotificationTicker';
import { AutoRefresh } from '@/components/AutoRefresh';
import LoginPage from '@/pages/LoginPage';
import HomePage from '@/pages/HomePage';
import DecryptRecords from '@/pages/DecryptRecords';
import RecordDetail from '@/pages/RecordDetail';
import CustomPuzzles from '@/pages/CustomPuzzles';
import DecryptWiki from '@/pages/DecryptWiki';
import MessageBoard from '@/pages/MessageBoard';
import AdminPage from '@/pages/AdminPage';
import SarcophagusTerminal from '@/pages/SarcophagusTerminal';
import TestPage from '@/pages/TestPage';
import StoryPlayerPage from '@/pages/StoryPlayerPage';
import StoryEditorPage from '@/pages/StoryEditorPage';
import WebMailPage from '@/pages/WebMailPage';
import MailSettingsPage from '@/pages/MailSettingsPage';
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
    <div className="min-h-screen bg-background flex flex-col">
      <NotificationTicker />
      <Navbar />
      <main className="pt-0 page-enter flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AutoRefresh />
        <SpoilerClickHandler />
        <BackgroundMusic />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <PageAccessRoute routePath="/">
                <AppLayout><HomePage /></AppLayout>
              </PageAccessRoute>
            }
          />
          <Route
            path="/records"
            element={
              <PageAccessRoute routePath="/records">
                <AppLayout><DecryptRecords /></AppLayout>
              </PageAccessRoute>
            }
          />
          <Route
            path="/records/:id"
            element={
              <PageAccessRoute routePath="/records/:id">
                <AppLayout><RecordDetail /></AppLayout>
              </PageAccessRoute>
            }
          />
          <Route
            path="/puzzles"
            element={
              <PageAccessRoute routePath="/puzzles">
                <AppLayout><CustomPuzzles /></AppLayout>
              </PageAccessRoute>
            }
          />
          <Route
            path="/wiki"
            element={
              <PageAccessRoute routePath="/wiki">
                <AppLayout><DecryptWiki /></AppLayout>
              </PageAccessRoute>
            }
          />
          <Route
            path="/messages"
            element={
              <PageAccessRoute routePath="/messages">
                <AppLayout><MessageBoard /></AppLayout>
              </PageAccessRoute>
            }
          />
          <Route
            path="/mail"
            element={
              <PageAccessRoute routePath="/mail">
                <AppLayout><WebMailPage /></AppLayout>
              </PageAccessRoute>
            }
          />
          <Route
            path="/settings/mail"
            element={
              <PageAccessRoute routePath="/settings/mail">
                <AppLayout><MailSettingsPage /></AppLayout>
              </PageAccessRoute>
            }
          />
          <Route
            path="/lynchpin-admin"
            element={
              <PageAccessRoute routePath="/lynchpin-admin">
                <AppLayout><AdminPage /></AppLayout>
              </PageAccessRoute>
            }
          />
          <Route
            path="/sarcophagus"
            element={
              <PageAccessRoute routePath="/sarcophagus">
                <SarcophagusTerminal />
              </PageAccessRoute>
            }
          />
          <Route
            path="/test"
            element={
              <PageAccessRoute routePath="/test">
                <AppLayout><TestPage /></AppLayout>
              </PageAccessRoute>
            }
          />
          <Route
            path="/juqing"
            element={<StoryPlayerPage />}
          />
          <Route
            path="/juqing/editor"
            element={
              <PageAccessRoute routePath="/juqing/editor">
                <AppLayout><StoryEditorPage /></AppLayout>
              </PageAccessRoute>
            }
          />
          <Route
            path="/juqing/editor/:id"
            element={
              <PageAccessRoute routePath="/juqing/editor">
                <AppLayout><StoryEditorPage /></AppLayout>
              </PageAccessRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
