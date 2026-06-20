import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Navbar } from '@/components/Navbar';
import LoginPage from '@/pages/LoginPage';
import HomePage from '@/pages/HomePage';
import DecryptRecords from '@/pages/DecryptRecords';
import RecordDetail from '@/pages/RecordDetail';
import CustomPuzzles from '@/pages/CustomPuzzles';
import DecryptWiki from '@/pages/DecryptWiki';
import MessageBoard from '@/pages/MessageBoard';
import AdminPage from '@/pages/AdminPage';
import SarcophagusTerminal from '@/pages/SarcophagusTerminal';
import SarcophagusAdmin from '@/pages/SarcophagusAdmin';
import './App.css';

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-0">
        {children}
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
          <Route
            path="/sarcophagus/admin"
            element={
              <ProtectedRoute>
                <SarcophagusAdmin />
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
