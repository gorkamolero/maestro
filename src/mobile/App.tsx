import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { BottomTabBar } from './components/BottomTabBar';

// Screens
import { Login } from './screens/Login';
import { AgentList } from './screens/AgentList';
import { AgentDetail } from './screens/AgentDetail';
import { SpaceList } from './screens/SpaceList';
import { SpaceDetail } from './screens/SpaceDetail';
import { Terminal } from './screens/Terminal';
import { Settings } from './screens/Settings';
import { More } from './screens/More';
import { RemoteView } from './screens/RemoteView';

function ProtectedRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="flex flex-col bg-surface-primary" style={{ height: '100dvh' }}>
      <main className="flex-1 min-h-0 overflow-hidden">
        <Routes>
          {/* Tab routes */}
          <Route path="/" element={<AgentList />} />
          <Route path="/spaces" element={<SpaceList />} />
          <Route path="/more" element={<More />} />

          {/* Detail routes */}
          <Route path="/agent/:id" element={<AgentDetail />} />
          <Route path="/space/:id" element={<SpaceDetail />} />
          <Route path="/terminal/:id" element={<Terminal />} />
          <Route path="/settings" element={<Settings />} />

          {/* Remote View */}
          <Route path="/remote-view" element={<RemoteView />} />
        </Routes>
      </main>
      <BottomTabBar />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function LoadingScreen() {
  return (
    <div className="h-screen flex items-center justify-center bg-surface-primary">
      <div className="animate-pulse text-content-tertiary">Loading...</div>
    </div>
  );
}
