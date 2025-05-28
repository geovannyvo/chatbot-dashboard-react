// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Outlet } from 'react-router-dom';
import { supabase } from './supabaseClient';
import LoginPage from './LoginPage';
import DashboardPage from './DashboardPage';
import './App.css';

function App() {
  const [session, setSession] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setLoadingAuth(false);
      console.log('[App.js] Sesión inicial obtenida:', currentSession);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
        setLoadingAuth(false);
        console.log('[App.js] Cambio en estado de Auth, nueva sesión:', currentSession);
      }
    );

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  const handleLogout = async () => {
    try {
      // 1. Consultar si hay chats con 'needs_agent' O 'agent_active'
      const { count, error: countError } = await supabase
        .from('chat_sessions_state')
        .select('*', { count: 'exact', head: true })
        // --- MODIFICACIÓN AQUÍ ---
        .or('status.eq.needs_agent,status.eq.agent_active');
        // --- FIN MODIFICACIÓN ---

      if (countError) {
        console.error("Error al verificar chats pendientes:", countError);
        const proceedAnyway = window.confirm(
            `No se pudo verificar si hay chats pendientes debido a un error. ¿Deseas cerrar sesión de todas formas?`
        );
        if (!proceedAnyway) return;

      } else if (count > 0) {
        // 2. Si hay chats, mostrar alerta (mensaje ajustado)
        // --- MODIFICACIÓN AQUÍ ---
        const proceed = window.confirm(
          `¡ATENCIÓN! Hay ${count} chat(s) que requieren intervención humana o están siendo atendidos ('needs_agent' o 'agent_active'). ¿Estás seguro de que quieres cerrar sesión?`
        );
        // --- FIN MODIFICACIÓN ---

        if (!proceed) {
          return;
        }
      }

      // 4. Si no hay chats o el usuario confirma, cerrar sesión
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.error('Error al cerrar sesión:', signOutError);
        alert(`Error al cerrar sesión: ${signOutError.message}`);
      } else {
        console.log('Sesión cerrada');
        localStorage.removeItem('selectedSessionId');
        localStorage.removeItem('unreadCounts');
      }

    } catch (err) {
      console.error("Error inesperado durante el logout:", err);
      alert("Ocurrió un error inesperado al intentar cerrar sesión.");
    }
  };

  const ProtectedRoute = () => {
    if (loadingAuth) {
      return <div>Verificando autenticación...</div>;
    }
    return session ? <Outlet /> : <Navigate to="/login" replace />;
  };

  const LoginRoute = () => {
    if (loadingAuth) {
      return <div>Verificando autenticación...</div>;
    }
    return !session ? <LoginPage /> : <Navigate to="/" replace />;
  }

  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Dashboard del Chatbot</h1>
          {session && (
            <button
              onClick={handleLogout}
              style={{ position: 'absolute', top: '20px', right: '20px', padding: '8px 12px', cursor: 'pointer', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px' }}
            >
              Cerrar Sesión
            </button>
          )}
        </header>
        <main>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<DashboardPage currentUser={session?.user} />} />
            </Route>
            <Route path="*" element={<Navigate to={session ? "/" : "/login"} replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;