import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
// Removed global Navbar; using sidebar menu instead
import ProtectedRoute from './components/ProtectedRoute';
import RGE2 from './components/RGE2';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Settings from './pages/Settings';
import IdeologramPage from './pages/IdeologramPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Removed global Navbar; sidebar menu icons are used instead */}
        <Routes>
          {/* Public home (globe) view */}
          <Route path="/" element={<RGE2 />} />
          {/* Auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/ideologram" element={<IdeologramPage />} />
          {/* Protected user routes */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
