import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

// Lazy loading pages for massive initial bundle size reduction
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Workouts = lazy(() => import('./pages/Workouts'));
const Progress = lazy(() => import('./pages/Progress'));
const AICoach = lazy(() => import('./pages/AICoach'));
const Profile = lazy(() => import('./pages/Profile'));

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[calc(100vh-80px)] w-full bg-charcoal-900 text-white">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-4 border-t-accent-neon border-slate-800 rounded-full animate-spin" />
      <p className="text-slate-400 font-medium text-xs">Cargando página...</p>
    </div>
  </div>
);

// App Layout wrapper containing Navbar and Sidebar
const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen bg-charcoal-900 overflow-hidden font-sans">
      {/* Sidebar navigation */}
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Main content body */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Navbar toggleSidebar={toggleSidebar} />
        <main className="flex-1 flex">
          <Suspense fallback={<LoadingFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={
          <div className="min-h-screen bg-charcoal-950 flex items-center justify-center text-white">
            <div className="w-8 h-8 border-4 border-t-accent-neon border-slate-800 rounded-full animate-spin" />
          </div>
        }>
          <Routes>
            {/* Public Auth routes */}
            <Route path="/login" element={<Login />} />

            {/* Protected App routes inside Sidebar/Navbar Layout */}
            <Route element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }>
              <Route path="/" element={<Dashboard />} />
              <Route path="/workouts" element={<Workouts />} />
              <Route path="/progress" element={<Progress />} />
              <Route path="/ai-coach" element={<AICoach />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            {/* Fallback redirect to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
