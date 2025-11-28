import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { AgentList } from './screens/AgentList';
import { AgentDetail } from './screens/AgentDetail';
import { Terminal } from './screens/Terminal';
import { Settings } from './screens/Settings';
import { Login } from './screens/Login';

function ProtectedRoutes() {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <Routes>
      <Route path="/" element={<AgentList />} />
      <Route path="/agent/:id" element={<AgentDetail />} />
      <Route path="/terminal/:id" element={<Terminal />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
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
    <div className="h-screen flex items-center justify-center bg-black">
      <div className="animate-pulse text-white/50">Loading...</div>
    </div>
  );
}
