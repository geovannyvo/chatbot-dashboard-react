// chatbot-dashboard-react/src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Outlet, useLocation } from 'react-router-dom';
import { supabase, getCurrentUserProfile } from './supabaseClient';
import LoginPage from './LoginPage';
import DashboardPage from './DashboardPage';
import SetInitialPasswordPage from './SetInitialPasswordPage';
import './App.css'; // Asegúrate que este CSS no entre en conflicto con los estilos inline

// --- Iconos Placeholder (SVG simples) ---
// Puedes reemplazarlos con tus propios componentes de iconos o SVGs más elaborados
const ChatsIcon = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>;
const ArchiveIcon = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/></svg>;
const BlockedIcon = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13c-.55 0-1-.45-1-1V9c0-.55.45-1 1-1s1 .45 1 1v5c0 .55-.45 1-1 1zm0 4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" opacity=".3"/><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>;


// --- Componente IconSidebar ---
function IconSidebar({ currentFilter, onChangeFilter }) {
  const iconButtonStyle = {
    background: 'none',
    border: 'none',
    color: 'var(--wa-dark-text-sec)', // Color secundario para no activos
    padding: '15px',
    cursor: 'pointer',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px', // Espacio entre icono y texto
    fontSize: '0.7rem'
  };
  const activeIconButtonstyle = {
    ...iconButtonStyle,
    color: 'var(--wa-dark-accent)', // Color de acento para activos
    backgroundColor: 'var(--wa-dark-bg-sec)', // Un ligero fondo para el activo
  };

  return (
    <div style={{
      width: '70px', // Ancho de la barra de iconos
      backgroundColor: 'var(--wa-dark-bg-main)', // Fondo principal oscuro
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: '20px',
      borderRight: '1px solid var(--wa-dark-border)'
    }}>
      <button
        title="Chats Activos"
        onClick={() => onChangeFilter('active')}
        style={currentFilter === 'active' ? activeIconButtonstyle : iconButtonStyle}
      >
        <ChatsIcon />
        Activos
      </button>
      <button
        title="Chats Archivados"
        onClick={() => onChangeFilter('archived')}
        style={currentFilter === 'archived' ? activeIconButtonstyle : iconButtonStyle}
      >
        <ArchiveIcon />
        Archivados
      </button>
      <button
        title="Chats Bloqueados"
        onClick={() => onChangeFilter('blocked')}
        style={currentFilter === 'blocked' ? activeIconButtonstyle : iconButtonStyle}
      >
        <BlockedIcon />
        Bloqueados
      </button>
      {/* Puedes añadir más iconos/botones aquí (ej. Configuración, Perfil) */}
    </div>
  );
}

// --- Componente de Layout para el Dashboard ---
// Este componente envuelve DashboardPage y le añade la IconSidebar
function DashboardLayout({ currentUser }) {
  const [chatViewFilter, setChatViewFilter] = useState('active'); // Estado del filtro aquí

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <IconSidebar currentFilter={chatViewFilter} onChangeFilter={setChatViewFilter} />
      <main style={{ flexGrow: 1, overflow: 'hidden' }}> {/* main-content */}
        <DashboardPage currentUser={currentUser} chatViewFilter={chatViewFilter} />
      </main>
    </div>
  );
}


function App() {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  console.log("[App Agente] Render. isLoadingSession:", isLoadingSession, "isLoadingProfile:", isLoadingProfile, "session:", !!session, "userProfile needs_pw_change:", userProfile?.needs_password_change);

  useEffect(() => {
    console.log("[App Agente - AuthEffect] Verificando sesión inicial...");
    setIsLoadingSession(true);
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      console.log("[App Agente - AuthEffect] getSession() completado. Sesión inicial:", currentSession ? "EXISTE" : "NULL");
      setSession(currentSession);
      setIsLoadingSession(false); 
      if (!currentSession) {
        setUserProfile(null);
        setIsLoadingProfile(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        console.log("[App Agente - AuthEffect] onAuthStateChange. Evento:", _event, "Nueva Sesión:", currentSession ? "EXISTE" : "NULL");
        setSession(currentSession);
        setUserProfile(null); 
        setIsLoadingSession(false); 
        if (!currentSession) {
            setIsLoadingProfile(false);
        }
      }
    );
    return () => { authListener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    console.log("[App Agente - ProfileEffect] INICIO. Session:", session ? "EXISTE" : "NULL");
    if (session && session.user) {
      console.log("[App Agente - ProfileEffect] Sesión existe. Cargando perfil para User ID:", session.user.id);
      setIsLoadingProfile(true);
      getCurrentUserProfile().then(profile => {
        setUserProfile(profile);
        setIsLoadingProfile(false);
        if(profile) console.log("[App Agente - ProfileEffect] Perfil cargado:", profile);
        else console.warn("[App Agente - ProfileEffect] No se encontró perfil para el agente logueado.");
      }).catch(err => {
        console.error("[App Agente - ProfileEffect] Error al cargar perfil:", err);
        setUserProfile(null);
        setIsLoadingProfile(false);
      });
    } else {
      console.log("[App Agente - ProfileEffect] No hay sesión, limpiando perfil. isLoadingProfile a false.");
      setUserProfile(null);
      setIsLoadingProfile(false);
    }
  }, [session]);


  const ProtectedRoute = () => {
    const location = useLocation();
    console.log("[ProtectedRoute] Render. isLoadingSession:", isLoadingSession, "isLoadingProfile:", isLoadingProfile, "session:", !!session, "userProfile:", userProfile ? `ID: ${userProfile.id}, NeedsPWChange: ${userProfile.needs_password_change}` : 'N/A', "pathname:", location.pathname);

    if (isLoadingSession || isLoadingProfile) {
      console.log("[ProtectedRoute] ESTADO DE CARGA (sesión o perfil). Mostrando 'Cargando (App)...'");
      return <div style={{color: 'var(--wa-dark-text-primary)', textAlign: 'center', paddingTop: '50px', fontSize: '1.2em'}}>Cargando (App)...</div>;
    }

    if (!session) {
      console.log("[ProtectedRoute] No hay sesión. Redirigiendo a /login.");
      return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!userProfile) {
      console.error("[ProtectedRoute] ERROR CRÍTICO: Hay sesión pero no se encontró perfil de usuario. Redirigiendo a login.");
      return <Navigate to="/login" state={{ from: location, error: "profile_not_found" }} replace />;
    }

    if (userProfile.needs_password_change && location.pathname !== '/set-initial-password') {
      console.log("[ProtectedRoute] Necesita cambiar contraseña. Redirigiendo a /set-initial-password.");
      return <Navigate to="/set-initial-password" replace />;
    }

    if (!userProfile.needs_password_change && location.pathname === '/set-initial-password') {
      console.log("[ProtectedRoute] No necesita cambiar contraseña pero está en /set-initial-password. Redirigiendo a /.");
      return <Navigate to="/" replace />;
    }
    
    console.log("[ProtectedRoute] Acceso permitido. Renderizando Outlet.");
    // El Outlet ahora renderizará DashboardLayout o SetInitialPasswordPage según la ruta
    return <Outlet />; 
  };

  const LoginRoute = () => {
    console.log("[LoginRoute] Render. isLoadingSession:", isLoadingSession, "isLoadingProfile:", isLoadingProfile, "session:", !!session, "userProfile:", userProfile ? `NeedsPWChange: ${userProfile.needs_password_change}` : 'N/A');
    if (isLoadingSession || isLoadingProfile) {
        return <div style={{color: 'var(--wa-dark-text-primary)', textAlign: 'center', paddingTop: '50px', fontSize: '1.2em'}}>Cargando login...</div>;
    }

    if (session && userProfile && !userProfile.needs_password_change) {
        console.log("[LoginRoute] Ya logueado y contraseña OK. Redirigiendo a /.");
        return <Navigate to="/" replace />;
    }
    if (session && userProfile && userProfile.needs_password_change) {
        console.log("[LoginRoute] Logueado pero necesita cambiar contraseña. Redirigiendo a /set-initial-password.");
        return <Navigate to="/set-initial-password" replace />;
    }
    
    console.log("[LoginRoute] Mostrando LoginPage.");
    return <LoginPage />;
  };

  return (
    <Router>
      <div className="App" style={{backgroundColor: 'var(--wa-dark-bg-main)', minHeight: '100vh'}}>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/set-initial-password" element={<SetInitialPasswordPage />} />
            {/* Aquí se renderiza DashboardLayout que contiene IconSidebar y DashboardPage */}
            <Route path="/" element={<DashboardLayout currentUser={userProfile} />} /> 
          </Route>
          <Route path="*" element={<Navigate to={session && userProfile && !userProfile.needs_password_change ? "/" : "/login"} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;