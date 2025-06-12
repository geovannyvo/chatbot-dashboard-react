// src/App.js
import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Outlet, useLocation, useOutletContext } from 'react-router-dom';
import { supabase, getCurrentUserProfile } from './supabaseClient';
import LoginPage from './LoginPage';
import DashboardPage from './DashboardPage';
import SetInitialPasswordPage from './SetInitialPasswordPage';
import ForgotPasswordPage from './ForgotPasswordPage';
import UpdatePasswordPage from './UpdatePasswordPage';
import './App.css'; // Asegúrate que App.css se importa
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer,toast } from 'react-toastify';

// --- Iconos ---
const ChatsIcon = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>;
const ArchiveIcon = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/></svg>;
const NeedsAttentionIcon = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm0-8c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" opacity={0.3}/><path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>;
const BlockedIcon = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>;
const LogoutIcon = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>;

// --- Componentes de Layout ---
function IconSidebar({ currentFilter, onChangeFilter, onLogout, filterCounts }) {
  const baseIconButtonStle = { backgroundColor: 'transparent', border: 'none', padding: '15px', cursor: 'pointer', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', fontSize: '0.7rem', position: 'relative', transition: 'color 0.2s, transform 0.2s' };
  
  const formatCount = (count) => (count > 0 ? ` (${count})` : '');

  // Lógica para el botón "Atención"
  const needsAgentCount = filterCounts?.needs_agent || 0;
  const showAttentionHighlight = needsAgentCount > 0;
  const isAttentionTabSelected = currentFilter === 'needs_agent';

  // Determinar estilos para el botón "Atención"
  let attentionButtonStyle = { ...baseIconButtonStle, color: 'var(--wa-dark-text-sec)'};
  let attentionIconContainerClassName = '';
  
  if (isAttentionTabSelected) {
    attentionButtonStyle.color = 'var(--wa-dark-accent)'; // Verde si está seleccionada
  } else if (showAttentionHighlight) {
    attentionButtonStyle.color = 'var(--wa-dark-alert)'; // Rojo si requiere atención y no está seleccionada
    attentionIconContainerClassName = 'pulse-attention-icon'; // Aplica pulso
  }
  
  // Agrandar el icono si requiere atención y no está seleccionado
  const attentionIconStyle = {
    transform: (showAttentionHighlight && !isAttentionTabSelected) ? 'scale(1.2)' : 'scale(1)',
    transition: 'transform 0.2s ease-out',
    display: 'inline-block' // Necesario para que transform funcione bien
  };


  return (
    <div style={{ width: '80px', backgroundColor: 'var(--wa-dark-bg-main)', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '20px', borderRight: '1px solid var(--wa-dark-border)', flexShrink: 0 }}>
      <button title="Chats Activos" onClick={() => onChangeFilter('active')} style={currentFilter === 'active' ? {...baseIconButtonStle, color: 'var(--wa-dark-accent)'} : {...baseIconButtonStle, color: 'var(--wa-dark-text-sec)'}} > <div style={{display: 'inline-block'}}><ChatsIcon /></div> Activos{formatCount(filterCounts?.active)} </button>
      <button title="Chats Archivados" onClick={() => onChangeFilter('archived')} style={currentFilter === 'archived' ? {...baseIconButtonStle, color: 'var(--wa-dark-accent)'} : {...baseIconButtonStle, color: 'var(--wa-dark-text-sec)'}} > <div style={{display: 'inline-block'}}><ArchiveIcon /></div> Archivados{formatCount(filterCounts?.archived)} </button>
      
      <button title="Requieren Atención" onClick={() => onChangeFilter('needs_agent')} style={attentionButtonStyle} >
        <div className={attentionIconContainerClassName} style={{padding: '1px'}}> {/* Pequeño padding para que el box-shadow del pulso no se corte */}
          <div style={attentionIconStyle}>
            <NeedsAttentionIcon />
          </div>
        </div>
        Atención{formatCount(needsAgentCount)}
      </button>

      <button title="Chats Bloqueados" onClick={() => onChangeFilter('blocked')} style={currentFilter === 'blocked' ? {...baseIconButtonStle, color: 'var(--wa-dark-accent)'} : {...baseIconButtonStle, color: 'var(--wa-dark-text-sec)'}} > <div style={{display: 'inline-block'}}><BlockedIcon /></div> Bloqueados{formatCount(filterCounts?.blocked)} </button>
      
      <button title="Cerrar Sesión" onClick={onLogout} style={{...baseIconButtonStle, color: 'var(--wa-dark-text-sec)', marginTop: 'auto', marginBottom: '20px'}} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--wa-dark-alert)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--wa-dark-text-sec)'} > <LogoutIcon /> Salir </button>
    </div>
  );
}

function DashboardLayout({ currentUser }) {
  const [chatViewFilter, setChatViewFilter] = useState('active');
  const [sidebarCounts, setSidebarCounts] = useState({ active: 0, archived: 0, needs_agent: 0, blocked: 0 });

  const handleSidebarCountsChange = useCallback((newCounts) => {
    setSidebarCounts(currentCounts => {
      if (
        currentCounts.active === newCounts.active &&
        currentCounts.archived === newCounts.archived &&
        currentCounts.needs_agent === newCounts.needs_agent &&
        currentCounts.blocked === newCounts.blocked
      ) {
        return currentCounts;
      }
      return newCounts;
    });
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error("Error al cerrar sesión:", error);
        toast.error("Error al cerrar sesión.");
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <IconSidebar
        currentFilter={chatViewFilter}
        onChangeFilter={setChatViewFilter}
        onLogout={handleLogout}
        filterCounts={sidebarCounts}
      />
      <main style={{ flexGrow: 1, overflow: 'hidden', height: '100%' }}>
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSessionFromGet } }) => {
        if (!session) { 
            setSession(currentSessionFromGet);
        }
        setIsLoadingSession(false);
        if (currentSessionFromGet?.user && !userProfile) {
            setUserProfile(null);
            setIsLoadingProfile(true);
        } else if (!currentSessionFromGet?.user) {
            setUserProfile(null);
            setIsLoadingProfile(false);
        }
    }).catch(error => {
        console.error("[App Agente - AuthEffect getSession] Error:", error);
        setIsLoadingSession(false); setIsLoadingProfile(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
        (_event, currentSessionFromAuth) => {
            setSession(currentSessionFromAuth);
            setIsLoadingSession(false);

            if (currentSessionFromAuth?.user) {
                if (_event === 'PASSWORD_RECOVERY') {
                    setUserProfile(null); 
                    setIsLoadingProfile(false); 
                } else if (_event === 'USER_UPDATED' || _event === 'SIGNED_IN') {
                    setUserProfile(null);
                    setIsLoadingProfile(true);
                }
            } else { 
                setUserProfile(null);
                setIsLoadingProfile(false);
            }
        }
    );
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            supabase.auth.getSession();
        }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
        authListener?.subscription?.unsubscribe();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); 

  useEffect(() => {
    if (session?.user && isLoadingProfile && userProfile === null) {
        getCurrentUserProfile().then(profile => {
            if (isLoadingProfile) { 
                setUserProfile(profile);
                setIsLoadingProfile(false);
            }
        }).catch(err => {
            console.error("[App Agente - ProfileEffect] Error cargando perfil:", err);
            setUserProfile(null);
            setIsLoadingProfile(false);
        });
    } else if (!session && isLoadingProfile) {
        setIsLoadingProfile(false);
    }
  }, [session, isLoadingProfile, userProfile]);

  const handlePasswordAndFlagUpdated = useCallback(() => {
    setUserProfile(null);
    setIsLoadingProfile(true);
  }, []);

  const ProtectedRoute = () => {
    const location = useLocation();
    
    if (isLoadingSession || isLoadingProfile) {
      return <div style={{color: 'var(--wa-dark-text-primary)', textAlign: 'center', paddingTop: '50px', fontSize: '1.2em'}}>Cargando...</div>;
    }
    if (!session) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    // Si la sesión es de PASSWORD_RECOVERY, userProfile será null.
    // UpdatePasswordPage se maneja fuera de ProtectedRoute en cuanto a esta lógica de perfil.
    if (!userProfile && location.pathname !== '/update-password') { 
        console.error("[ProtectedRoute] Sesión activa pero userProfile es null. Path:", location.pathname);
        return <Navigate to="/login" state={{ from: location, error: "profile_load_failed" }} replace />;
    }
    if (userProfile && userProfile.needs_password_change && location.pathname !== '/set-initial-password') {
      return <Navigate to="/set-initial-password" replace />;
    }
    if (userProfile && !userProfile.needs_password_change && location.pathname === '/set-initial-password') {
      return <Navigate to="/" replace />;
    }
    return <Outlet context={{ currentUserFromOutlet: userProfile }} />; 
  };

  const DashboardLayoutWrapper = () => {
    const context = useOutletContext();
    const currentUserFromOutlet = context?.currentUserFromOutlet;
    
    if (!currentUserFromOutlet) {
      // Este estado de carga podría ser breve o indicar un problema si persiste.
      // ProtectedRoute ya debería haber manejado la ausencia de userProfile en casos normales.
      return <div style={{color: 'var(--wa-dark-text-primary)', textAlign: 'center', paddingTop: '50px', fontSize: '1.2em'}}>Cargando datos del usuario...</div>;
    }
    return <DashboardLayout currentUser={currentUserFromOutlet} />;
  };

  const LoginRoute = () => {
    if (isLoadingSession || (session && isLoadingProfile)) {
        return <div style={{color: 'var(--wa-dark-text-primary)', textAlign: 'center', paddingTop: '50px', fontSize: '1.2em'}}>Cargando login...</div>;
    }
    if (session && userProfile) { 
        if (!userProfile.needs_password_change) {
            return <Navigate to="/" replace />;
        } else {
            return <Navigate to="/set-initial-password" replace />;
        }
    }
    return <LoginPage />;
  };

  return (
    <Router>
      <div className="App" style={{backgroundColor: 'var(--wa-dark-bg-main)', minHeight: '100vh'}}>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/update-password" element={<UpdatePasswordPage />} /> 
          
          <Route element={<ProtectedRoute />}>
            <Route path="/set-initial-password" element={<SetInitialPasswordPage onPasswordAndFlagUpdated={handlePasswordAndFlagUpdated} />} />
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
        <ToastContainer position="bottom-right" autoClose={4000} theme="dark" />
      </div>
    </Router>
  );
}

export default App;