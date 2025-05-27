// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import ChatbotInteractions from './ChatbotInteractions'; // Tu dashboard principal
import LoginPage from './LoginPage';
import './App.css';

function App() {
  const [session, setSession] = useState(null); // Para almacenar la sesión del usuario
  const [loadingAuth, setLoadingAuth] = useState(true); // Para saber si aún se está verificando la sesión

  useEffect(() => {
    // Obtener la sesión actual al cargar la app
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setLoadingAuth(false);
      console.log('Sesión inicial obtenida:', currentSession);
    });

    // Escuchar cambios en el estado de autenticación (login, logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
        console.log('Cambio en estado de Auth, nueva sesión:', currentSession);
        if (_event === 'SIGNED_IN' || _event === 'USER_UPDATED') {
          // No es necesario redirigir aquí, el componente Route lo hará
        } else if (_event === 'SIGNED_OUT') {
          // No es necesario redirigir aquí, el componente Route lo hará
        }
      }
    );

    return () => {
      // Limpiar el listener al desmontar el componente
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error al cerrar sesión:', error);
    } else {
      // El listener onAuthStateChange se encargará de setSession(null)
      // y la lógica de Navigate en Routes se encargará de la redirección.
      console.log('Sesión cerrada');
    }
  };

  if (loadingAuth) {
    return <div>Cargando autenticación...</div>; // O un spinner/loader más elegante
  }

  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Dashboard del Chatbot</h1>
          {session && ( // Mostrar botón de logout solo si hay sesión
            <button 
              onClick={handleLogout} 
              style={{ position: 'absolute', top: '20px', right: '20px', padding: '8px 12px', cursor: 'pointer' }}
            >
              Cerrar Sesión
            </button>
          )}
        </header>
        <main>
          <Routes>
            <Route
              path="/login"
              element={!session ? <LoginPage /> : <Navigate to="/" replace />}
            />
            <Route
              path="/"
              element={session ? <ChatbotInteractions currentUser={session.user} /> : <Navigate to="/login" replace />}
            />
            {/* Puedes añadir más rutas aquí si es necesario */}
            <Route path="*" element={<Navigate to={session ? "/" : "/login"} replace />} /> {/* Redirigir rutas no encontradas */}
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;