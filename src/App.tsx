import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './lib/AuthContext';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { Admin } from './pages/Admin';
import { AskAI } from './pages/AskAI';
import { AIAssistant } from './pages/AIAssistant';

const AppContent = () => {
  const location = useLocation();
  const showNavbar = location.pathname !== '/dashboard' && location.pathname !== '/' && location.pathname !== '/admin' && location.pathname !== '/ai-assistant' && location.pathname !== '/ask-ai';

  return (
    <div className="min-h-screen bg-gray-900">
      {showNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/ai-assistant" element={<AIAssistant />} />
        <Route path="/ask-ai" element={<AskAI />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
};

export const App = () => {
  return (
    <HelmetProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </HelmetProvider>
  );
};

export default App;