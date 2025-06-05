// src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Outlet, useLocation, useOutletContext } from 'react-router-dom';
import { supabase, getCurrentUserProfile } from './supabaseClient';
import LoginPage from './LoginPage'; // Asegúrate que la ruta sea correcta, ej ./pages/LoginPage
import DashboardPage from './DashboardPage'; // Asegúrate que la ruta sea correcta, ej ./pages/DashboardPage
import SetInitialPasswordPage from './SetInitialPasswordPage'; // Asegúrate que la ruta sea correcta, ej ./pages/SetInitialPasswordPage
import './App.css';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';

// --- Iconos (Como los tenías en tu App.js) ---
const ChatsIcon = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>;
const ArchiveIcon = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/></svg>;
const NeedsAttentionIcon = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm0-8c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" opacity=".3"/><path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>;
const BlockedIcon = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 13c-.55 0-1-.45-1-1V9c0-.55.45-1 1-1s1 .45 1 1v5c0 .55-.45 1-1 1zm0 4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" opacity=".3"/><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>;
const LogoutIcon = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>;

// --- Componentes de Layout ---
function IconSidebar({ currentFilter, onChangeFilter, onLogout, filterCounts }) {
  const iconButtonStyle = { backgroundColor: 'transparent', border: 'none', color: 'var(--wa-dark-text-sec)', padding: '15px', cursor: 'pointer', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', fontSize: '0.7rem', position: 'relative' };
  const activeIconButtonstyle = { ...iconButtonStyle, color: 'var(--wa-dark-accent)' };
  const logoutButtonStyle = { ...iconButtonStyle, marginTop: 'auto', marginBottom: '20px' };
  const formatCount = (count) => count > 0 ? ` (${count})` : '';
  return (
    <div style={{ width: '80px', backgroundColor: 'var(--wa-dark-bg-main)', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '20px', borderRight: '1px solid var(--wa-dark-border)', flexShrink: 0 }}>
      <button title="Chats Activos" onClick={() => onChangeFilter('active')} style={currentFilter === 'active' ? activeIconButtonstyle : iconButtonStyle} > <ChatsIcon /> Activos{filterCounts ? formatCount(filterCounts.active) : ''} </button>
      <button title="Chats Archivados" onClick={() => onChangeFilter('archived')} style={currentFilter === 'archived' ? activeIconButtonstyle : iconButtonStyle} > <ArchiveIcon /> Archivados{filterCounts ? formatCount(filterCounts.archived) : ''} </button>
      <button title="Requieren Atención" onClick={() => onChangeFilter('needs_agent')} style={currentFilter === 'needs_agent' ? activeIconButtonstyle : iconButtonStyle} > <NeedsAttentionIcon /> Atención{filterCounts ? formatCount(filterCounts.needs_agent) : ''} </button>
      <button title="Chats Bloqueados" onClick={() => onChangeFilter('blocked')} style={currentFilter === 'blocked' ? activeIconButtonstyle : iconButtonStyle} > <BlockedIcon /> Bloqueados{filterCounts ? formatCount(filterCounts.blocked) : ''} </button>
      <button title="Cerrar Sesión" onClick={onLogout} style={logoutButtonStyle} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--wa-dark-alert)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--wa-dark-text-sec)'} > <LogoutIcon /> Salir </button>
    </div>
  );
}

function DashboardLayout({ currentUser }) {
  const [chatViewFilter, setChatViewFilter] = useState('active');
  const [sidebarCounts, setSidebarCounts] = useState({ active: 0, archived: 0, needs_agent: 0, blocked: 0 });

  const handleSidebarCountsChange = useCallback((newCounts) => {
    setSidebarCounts(currentCounts => {
      if ( currentCounts.active === newCounts.active &&
           currentCounts.archived === newCounts.archived &&
           currentCounts.needs_agent === newCounts.needs_agent &&
           currentCounts.blocked === newCounts.blocked ) {
        return currentCounts;
      }
      return newCounts;
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <IconSidebar currentFilter={chatViewFilter} onChangeFilter={setChatViewFilter} onLogout={handleLogout} filterCounts={sidebarCounts} />
      <main style={{ flexGrow: 1, overflow: 'hidden', height: '100%' }}> {/* Clave: height: 100% aquí */}
        <DashboardPage
          currentUser={currentUser}
          chatViewFilter={chatViewFilter}
          setChatViewFilter={setChatViewFilter}
          onCountsChange={handleSidebarCountsChange}
        />
      </main>
    </div>
  );
}
// --- Fin Componentes de Layout ---

function App() {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true); 

  console.log(`[App Agente] Render. LoadSess: ${isLoadingSession}, LoadProf: ${isLoadingProfile}, Sess: ${!!session}, Profile: ${userProfile ? `ID: ${userProfile.id}` : "N/A"}`);

  useEffect(() => {
    console.log("[App Agente - AuthEffect] Inicializado.");
    supabase.auth.getSession().then(({ data: { session: currentSessionFromGet } }) => {
      console.log("[App Agente - AuthEffect getSession] Resultado:", currentSessionFromGet ? `User ID: ${currentSessionFromGet.user.id}` : "NULL");
      setSession(currentSessionFromGet);
      setIsLoadingSession(false); 
      if (currentSessionFromGet?.user) {
        console.log("[App Agente - AuthEffect getSession] Sesión válida. Se limpiará perfil y se marcará para carga.");
        setUserProfile(null); 
        setIsLoadingProfile(true); 
      } else {
        setUserProfile(null);
        setIsLoadingProfile(false);
      }
    }).catch(error => {
        console.error("[App Agente - AuthEffect getSession] Error:", error);
        setIsLoadingSession(false); setIsLoadingProfile(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, currentSessionFromAuth) => {
        console.log(`[App Agente - AuthEffect onAuthStateChange] Evento: ${_event}`, currentSessionFromAuth ? `Sesión User ID: ${currentSessionFromAuth.user.id}` : "Sesión: NULL");
        setSession(currentSessionFromAuth);
        // isLoadingSession ya debería ser false por getSession, pero este evento es una actualización.
        // No es necesario setearlo de nuevo a menos que la lógica cambie drásticamente.

        if (currentSessionFromAuth?.user) {
          console.log(`[App Agente - AuthEffect onAuthStateChange] Evento ${_event}. Limpiando perfil y marcando para recarga.`);
          setUserProfile(null); 
          setIsLoadingProfile(true);
        } else { // SIGNED_OUT o sesión nula
          setUserProfile(null); setIsLoadingProfile(false);
        }
      }
    );
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[App Agente] Ventana visible, llamando a supabase.auth.getSession() para posible refresco de token.');
        supabase.auth.getSession(); // Esto podría disparar onAuthStateChange si el token cambió
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      console.log("[App Agente - AuthEffect] Desuscribiendo listeners.");
      authListener?.subscription?.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    console.log(`[App Agente - ProfileEffect] Verificando. Session: ${session ? `User ID: ${session.user.id}` : "NULL"}, isLoadingProfile: ${isLoadingProfile}, userProfile es ${userProfile ? 'cargado' : 'null'}`);
    // Cargar perfil solo si: hay sesión, se está en estado de carga de perfil (isLoadingProfile=true), Y el perfil actual es null (para evitar recargas si ya está)
    if (session?.user && isLoadingProfile && userProfile === null) {
      console.log("[App Agente - ProfileEffect] Cargando perfil para User ID:", session.user.id);
      getCurrentUserProfile().then(profile => {
        // Re-chequear isLoadingProfile antes de setear, por si el estado cambió muy rápido (menos probable con userProfile === null)
        if (isLoadingProfile) { 
            console.log(`%c[App Agente - ProfileEffect] Perfil obtenido para ${session.user.id}:`, "color: blue; font-weight: bold;", profile);
            setUserProfile(profile); // Puede ser null si no se encuentra, y está bien
            setIsLoadingProfile(false); // Terminar estado de carga del perfil
        } else {
            console.log("[App Agente - ProfileEffect] isLoadingProfile se volvió false mientras se obtenía el perfil. No se actualiza estado.");
        }
      }).catch(err => {
        console.error("[App Agente - ProfileEffect] Error cargando perfil:", err);
        setUserProfile(null); 
        setIsLoadingProfile(false);
      });
    } else if (!session && isLoadingProfile) { 
      console.log("[App Agente - ProfileEffect] No hay sesión pero isLoadingProfile es true. Seteando isLoadingProfile a false.");
      setIsLoadingProfile(false);
    }
  }, [session, isLoadingProfile, userProfile]); // userProfile en dependencias es importante para re-evaluar si se limpia

  const handlePasswordAndFlagUpdated = useCallback(() => {
    console.log("[App Agente] Callback handlePasswordAndFlagUpdated: Limpiando perfil y marcando para recarga.");
    setUserProfile(null); 
    setIsLoadingProfile(true); 
  }, []);

  const ProtectedRoute = () => {
    const location = useLocation();
    const profileStateForLog = userProfile ? `ID: ${userProfile.id}, NeedsPWChange: ${userProfile.needs_password_change}` : 'N/A';
    console.log(`[ProtectedRoute] Render. LoadSess: ${isLoadingSession}, LoadProf: ${isLoadingProfile}, session: ${!!session}, userProfile: ${profileStateForLog}, Path: ${location.pathname}`);

    if (isLoadingSession || isLoadingProfile) {
      return <div style={{color: 'var(--wa-dark-text-primary)', textAlign: 'center', paddingTop: '50px', fontSize: '1.2em'}}>Cargando (App)...</div>;
    }
    if (!session) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    if (!userProfile) { 
      console.error("[ProtectedRoute] Sesión activa pero userProfile es null. Redirigiendo a login.");
      return <Navigate to="/login" state={{ from: location, error: "profile_load_failed" }} replace />;
    }
    if (userProfile.needs_password_change && location.pathname !== '/set-initial-password') {
      return <Navigate to="/set-initial-password" replace />;
    }
    if (!userProfile.needs_password_change && location.pathname === '/set-initial-password') {
      return <Navigate to="/" replace />;
    }
    return <Outlet context={{ currentUserFromOutlet: userProfile }} />; 
  };

  const DashboardLayoutWrapper = () => {
    const { currentUserFromOutlet } = useOutletContext(); 
    if (!currentUserFromOutlet) {
      return <div style={{color: 'var(--wa-dark-text-primary)', textAlign: 'center', paddingTop: '50px', fontSize: '1.2em'}}>Cargando datos del usuario...</div>;
    }
    return <DashboardLayout currentUser={currentUserFromOutlet} />;
  };

  const LoginRoute = () => {
    const profileStateForLog = userProfile ? `NeedsPWChange: ${userProfile.needs_password_change}` : 'N/A';
    console.log(`[LoginRoute] Render. isLoadingSession: ${isLoadingSession}, isLoadingProfile: ${isLoadingProfile}, session: ${!!session}, Profile: ${profileStateForLog}`);

    if (isLoadingSession || (session && isLoadingProfile)) {
        return <div style={{color: 'var(--wa-dark-text-primary)', textAlign: 'center', paddingTop: '50px', fontSize: '1.2em'}}>Cargando login...</div>;
    }
    if (session && userProfile) { // Solo redirigir si el perfil está cargado
        if (!userProfile.needs_password_change) {
            return <Navigate to="/" replace />;
        } else {
            return <Navigate to="/set-initial-password" replace />;
        }
    }
    return <LoginPage />; // Si no hay sesión, o sesión sin perfil (y no está cargando)
  };

  return (
    <Router>
      <div className="App" style={{backgroundColor: 'var(--wa-dark-bg-main)', minHeight: '100vh'}}>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route element={<ProtectedRoute />}>
            <Route 
              path="/set-initial-password" 
              element={<SetInitialPasswordPage onPasswordAndFlagUpdated={handlePasswordAndFlagUpdated} />} 
            />
            <Route path="/" element={<DashboardLayoutWrapper />} />
          </Route>
          <Route path="*" element={
            (isLoadingSession || (session && isLoadingProfile)) ?
            <div style={{color: 'var(--wa-dark-text-primary)', textAlign: 'center', paddingTop: '50px', fontSize: '1.2em'}}>Cargando...</div> :
            (session && userProfile && !userProfile.needs_password_change ? <Navigate to="/" replace /> :
             (session && userProfile && userProfile.needs_password_change ? <Navigate to="/set-initial-password" replace /> :
             <Navigate to="/login" replace />))
           } />
        </Routes>
        <ToastContainer position="bottom-right" autoClose={3000} theme="dark" />
      </div>
    </Router>
  );
}

export default App;