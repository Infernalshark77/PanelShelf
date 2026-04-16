import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AppShell } from './components/AppShell';
import { api, ApiError } from './lib/api';
import { ComicDetailPage } from './pages/ComicDetailPage';
import { LibraryPage } from './pages/LibraryPage';
import { LoginPage } from './pages/LoginPage';
import { ReaderPage } from './pages/ReaderPage';

const APP_NAME = 'PanelShelf';

export default function App() {
  const queryClient = useQueryClient();
  const [loginError, setLoginError] = useState<string | null>(null);

  const authQuery = useQuery({
    queryKey: ['auth'],
    queryFn: api.authStatus,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) => api.login(username, password),
    onSuccess: (result) => {
      setLoginError(null);
      queryClient.setQueryData(['auth'], result);
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.detail : 'Login failed';
      setLoginError(message);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: api.logout,
    onSuccess: (result) => {
      queryClient.setQueryData(['auth'], result);
      queryClient.invalidateQueries({ queryKey: ['comics'] });
    },
  });

  if (authQuery.isLoading) {
    return <div className="splash-screen">Loading PanelShelf...</div>;
  }

  const auth = authQuery.data ?? { auth_enabled: false, authenticated: true, username: null };

  if (auth.auth_enabled && !auth.authenticated) {
    return (
      <LoginPage
        appName={APP_NAME}
        error={loginError}
        onSubmit={async (username, password) => {
          await loginMutation.mutateAsync({ username, password });
        }}
      />
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          element={<AppShell appName={APP_NAME} username={auth.username} onLogout={() => logoutMutation.mutate()} />}
        >
          <Route path="/" element={<LibraryPage />} />
          <Route path="/comics/:comicId" element={<ComicDetailPage />} />
        </Route>
        <Route path="/reader/:comicId" element={<ReaderPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
