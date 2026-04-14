import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import LoginPage from '@/auth/LoginPage';
import { AppShell } from '@/components/layout/AppShell';
import Dashboard from '@/views/Dashboard';
import AllItems from '@/views/AllItems';
import CategoryView from '@/views/CategoryView';
import { useStorage } from '@/hooks/useStorage';
import { useNotifications } from '@/hooks/useNotifications';
import { useEffect } from 'react';

function AppContent() {
  const storage = useStorage();
  const { requestPermission } = useNotifications(storage.data.items);

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  return (
    <AppShell storage={storage}>
      <Routes>
        <Route path="/" element={<Dashboard storage={storage} />} />
        <Route path="/items" element={<AllItems storage={storage} />} />
        <Route path="/category/:cat" element={<CategoryView storage={storage} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppContent />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
