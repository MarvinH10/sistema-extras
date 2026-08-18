import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LoginView from './views/LoginView';
import CapturaDiariaView from './views/CapturaDiariaView';
import MatrizMensualView from './views/MatrizMensualView';
import EmpleadosView from './views/EmpleadosView';
import AreasTurnosView from './views/AreasTurnosView';
import CalculadoraRapidaView from './views/CalculadoraRapidaView';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('kdosh_user');
      const storedExpires = localStorage.getItem('kdosh_expires_at');
      const token = localStorage.getItem('kdosh_auth_token');

      if (token && storedUser && storedExpires) {
        const expiresTime = new Date(storedExpires).getTime();
        const now = Date.now();
        // Si no ha expirado la sesión de 4 horas
        if (now < expiresTime) {
          return JSON.parse(storedUser);
        }
      }
    } catch {
      // Ignorar error de parsing
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState('diaria');

  // Redirección de URL según autenticación
  useEffect(() => {
    if (!currentUser) {
      if (window.location.pathname !== '/login') {
        window.history.replaceState(null, '', '/login');
      }
    } else {
      if (window.location.pathname === '/login') {
        window.history.replaceState(null, '', '/');
      }
    }
  }, [currentUser]);

  useEffect(() => {
    const handleExpired = () => {
      setCurrentUser(null);
      window.history.replaceState(null, '', '/login');
    };

    window.addEventListener('kdosh_auth_expired', handleExpired);
    return () => window.removeEventListener('kdosh_auth_expired', handleExpired);
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    window.history.replaceState(null, '', '/');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    window.history.replaceState(null, '', '/login');
  };

  // Si no ha iniciado sesión o expiró la sesión de 4 horas, mostrar la pantalla de Login
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-x-hidden flex flex-col">
      {/* Background glowing gradients */}
      <div className="absolute top-0 left-1/4 w-125 h-125 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-125 h-125 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-112.5 h-112.5 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1780px] w-full mx-auto px-3 sm:px-6 lg:px-8 pt-5 pb-12 relative z-10">
        {activeTab === 'diaria' && (
          <CapturaDiariaView onNavigateToMatriz={() => setActiveTab('matriz')} currentUser={currentUser} />
        )}
        {activeTab === 'matriz' && (
          <MatrizMensualView currentUser={currentUser} />
        )}
        {activeTab === 'empleados' && (
          <EmpleadosView />
        )}
        {activeTab === 'areas' && (
          <AreasTurnosView />
        )}
        {activeTab === 'calculadora' && (
          <CalculadoraRapidaView />
        )}
      </main>
    </div>
  );
}
