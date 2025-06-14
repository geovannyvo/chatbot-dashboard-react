// src/App.js
import React, { useState, useEffect, useCallback } from 'react';
// 1. IMPORTAMOS LOS HOOKS NECESARIOS DE REACT ROUTER
import { BrowserRouter as Router, Route, Routes, Navigate, Outlet, useLocation, useOutletContext, useParams, useNavigate } from 'react-router-dom';
import { supabase, getCurrentUserProfile } from './supabaseClient';
import LoginPage from './LoginPage';
import DashboardPage from './DashboardPage';
import SetInitialPasswordPage from './SetInitialPasswordPage';
import ForgotPasswordPage from './ForgotPasswordPage';
import UpdatePasswordPage from './UpdatePasswordPage';
import './App.css'; 
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer,toast } from 'react-toastify';

// --- Iconos y useWindowSize (Sin cambios) ---
const ChatsIcon = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2zM-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/></svg>;
const ArchiveIcon = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/></svg>;
const NeedsAttentionIcon = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm0-8c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" opacity={0.3}/><path d="M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>;
const BlockedIcon = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>;
const LogoutIcon = () => <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>;
function useWindowSize() { const [size, setSize] = useState([window.innerWidth, window.innerHeight]); useEffect(() => { const handleResize = () => { setSize([window.innerWidth, window.innerHeight]); }; window.addEventListener('resize', handleResize); return () => window.removeEventListener('resize', handleResize); }, []); return { width: size[0], height: size[1] }; }

function IconSidebar({ currentFilter, onChangeFilter, onLogout, filterCounts, isMobile }) {
    // El código de este componente no cambia
    const baseIconButtonStle = { backgroundColor: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', position: 'relative', transition: 'color 0.2s, transform 0.2s' }; const desktopStyle = { width: '80px', backgroundColor: 'var(--wa-dark-bg-main)', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '20px', borderRight: '1px solid var(--wa-dark-border)', flexShrink: 0 }; const mobileStyle = { position: 'fixed', bottom: 0, left: 0, width: '100%', height: 'auto', backgroundColor: 'var(--wa-dark-bg-main)', display: 'flex', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderTop: '1px solid var(--wa-dark-border)', zIndex: 1000, padding: '5px 0' }; const desktopButtonStyle = { ...baseIconButtonStle, padding: '15px', width: '100%', fontSize: '0.7rem' }; const mobileButtonStyle = { ...baseIconButtonStle, padding: '8px 5px', fontSize: '0.6rem', flex: 1 }; const finalContainerStyle = isMobile ? mobileStyle : desktopStyle; const finalButtonStyle = isMobile ? mobileButtonStyle : desktopButtonStyle; const formatCount = (count) => (count > 0 ? ` (${count})` : ''); const needsAgentCount = filterCounts?.needs_agent || 0; const showAttentionHighlight = needsAgentCount > 0; const isAttentionTabSelected = currentFilter === 'needs_agent'; let attentionButtonStyle = { ...finalButtonStyle, color: 'var(--wa-dark-text-sec)'}; let attentionIconContainerClassName = ''; if (isAttentionTabSelected) { attentionButtonStyle.color = 'var(--wa-dark-accent)'; } else if (showAttentionHighlight) { attentionButtonStyle.color = 'var(--wa-dark-alert)'; attentionIconContainerClassName = 'pulse-attention-icon'; } const attentionIconStyle = { transform: (showAttentionHighlight && !isAttentionTabSelected) ? 'scale(1.2)' : 'scale(1)', transition: 'transform 0.2s ease-out', display: 'inline-block' }; const logoutStyle = isMobile ? { ...finalButtonStyle, color: 'var(--wa-dark-text-sec)' } : { ...finalButtonStyle, marginTop: 'auto', marginBottom: '20px' }; return ( <div style={finalContainerStyle}> <button title="Chats Activos" onClick={() => onChangeFilter('active')} style={currentFilter === 'active' ? {...finalButtonStyle, color: 'var(--wa-dark-accent)'} : {...finalButtonStyle, color: 'var(--wa-dark-text-sec)'}} > <div style={{display: 'inline-block'}}><ChatsIcon /></div> Activos{formatCount(filterCounts?.active)} </button> <button title="Chats Archivados" onClick={() => onChangeFilter('archived')} style={currentFilter === 'archived' ? {...finalButtonStyle, color: 'var(--wa-dark-accent)'} : {...finalButtonStyle, color: 'var(--wa-dark-text-sec)'}} > <div style={{display: 'inline-block'}}><ArchiveIcon /></div> Archivados{formatCount(filterCounts?.archived)} </button> <button title="Requieren Atención" onClick={() => onChangeFilter('needs_agent')} style={attentionButtonStyle} > <div className={attentionIconContainerClassName} style={{padding: '1px'}}> <div style={attentionIconStyle}> <NeedsAttentionIcon /> </div> </div> Atención{formatCount(needsAgentCount)} </button> <button title="Chats Bloqueados" onClick={() => onChangeFilter('blocked')} style={currentFilter === 'blocked' ? {...finalButtonStyle, color: 'var(--wa-dark-accent)'} : {...finalButtonStyle, color: 'var(--wa-dark-text-sec)'}} > <div style={{display: 'inline-block'}}><BlockedIcon /></div> Bloqueados{formatCount(filterCounts?.blocked)} </button> <button title="Cerrar Sesión" onClick={onLogout} style={logoutStyle} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--wa-dark-alert)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--wa-dark-text-sec)'} > <LogoutIcon /> {!isMobile && 'Salir'} </button> </div> );
}

function DashboardLayout({ currentUser }) {
    const { width } = useWindowSize();
    const isMobile = width < 768;

    // 2. LEE EL FILTRO Y EL CHAT DESDE LOS PARÁMETROS DE LA URL
    const { filterType = 'active', sessionId } = useParams();
    const navigate = useNavigate();

    const [sidebarCounts, setSidebarCounts] = useState({ active: 0, archived: 0, needs_agent: 0, blocked: 0 });

    const handleSidebarCountsChange = useCallback((newCounts) => {
        setSidebarCounts(currentCounts => {
            if (currentCounts.active === newCounts.active && currentCounts.archived === newCounts.archived && currentCounts.needs_agent === newCounts.needs_agent && currentCounts.blocked === newCounts.blocked) {
                return currentCounts;
            }
            return newCounts;
        });
    }, []);

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) toast.error("Error al cerrar sesión.");
    };
    
    // 3. LA FUNCIÓN DE CAMBIO DE FILTRO AHORA SOLO CAMBIA LA URL
    const handleFilterChange = (newFilter) => {
        navigate(`/filter/${newFilter}`);
    };

    const mainLayoutStyle = { display: 'flex', height: '100vh', flexDirection: isMobile ? 'column' : 'row' };
    const contentStyle = { flexGrow: 1, overflow: 'hidden', height: '100%' };

    return (
        <div style={mainLayoutStyle}>
            {!isMobile && (
                <IconSidebar
                    currentFilter={filterType}
                    onChangeFilter={handleFilterChange}
                    onLogout={handleLogout}
                    filterCounts={sidebarCounts}
                    isMobile={isMobile}
                />
            )}
            <main style={contentStyle}>
                <DashboardPage
                    currentUser={currentUser}
                    onCountsChange={handleSidebarCountsChange}
                />
            </main>
            {isMobile && (
                <IconSidebar
                    currentFilter={filterType}
                    onChangeFilter={handleFilterChange}
                    onLogout={handleLogout}
                    filterCounts={sidebarCounts}
                    isMobile={isMobile}
                />
            )}
        </div>
    );
}

function App() {
    // La lógica de caché y sesión de App se mantiene igual
    const getCachedUserProfile = () => { try { const cached = localStorage.getItem('cachedUserProfile'); return cached ? JSON.parse(cached) : null; } catch (e) { return null; } };
    const [session, setSession] = useState(null);
    const [userProfile, setUserProfile] = useState(() => getCachedUserProfile());
    const [isLoadingSession, setIsLoadingSession] = useState(true);
    useEffect(() => { const syncSessionAndProfile = async () => { const { data: { session: currentSession } } = await supabase.auth.getSession(); setSession(currentSession); setIsLoadingSession(false); if (currentSession?.user) { try { const profile = await getCurrentUserProfile(); setUserProfile(profile); localStorage.setItem('cachedUserProfile', JSON.stringify(profile)); } catch (error) { console.error("Error al sincronizar el perfil:", error); setUserProfile(null); localStorage.removeItem('cachedUserProfile'); await supabase.auth.signOut(); } } else { setUserProfile(null); localStorage.removeItem('cachedUserProfile'); } }; syncSessionAndProfile(); const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => { setSession(newSession); if (!newSession) { setUserProfile(null); localStorage.removeItem('cachedUserProfile'); } }); return () => { subscription?.unsubscribe(); }; }, []);
    const handlePasswordAndFlagUpdated = useCallback(async () => { try { const profile = await getCurrentUserProfile(); setUserProfile(profile); localStorage.setItem('cachedUserProfile', JSON.stringify(profile)); } catch (error) { console.error("Error al recargar el perfil tras actualizar contraseña:", error); setUserProfile(null); localStorage.removeItem('cachedUserProfile'); } }, []);
    const ProtectedRoute = () => { const location = useLocation(); if (isLoadingSession) { return <div style={{color: 'var(--wa-dark-text-primary)', textAlign: 'center', paddingTop: '50px', fontSize: '1.2em'}}>Iniciando...</div>; } if (!userProfile && !session) { return <Navigate to="/login" state={{ from: location }} replace />; } if (userProfile) { if (userProfile.needs_password_change && location.pathname !== '/set-initial-password') { return <Navigate to="/set-initial-password" replace />; } if (!userProfile.needs_password_change && location.pathname === '/set-initial-password') { return <Navigate to="/filter/active" replace />; } } return <Outlet context={{ currentUserFromOutlet: userProfile }} />; };
    const DashboardLayoutWrapper = () => { const context = useOutletContext(); const currentUserFromOutlet = context?.currentUserFromOutlet; if (!currentUserFromOutlet) { return <div style={{color: 'var(--wa-dark-text-primary)', textAlign: 'center', paddingTop: '50px', fontSize: '1.2em'}}>Esperando datos del usuario...</div>; } return <DashboardLayout currentUser={currentUserFromOutlet} />; };
    const LoginRoute = () => { if (isLoadingSession) { return <div style={{color: 'var(--wa-dark-text-primary)', textAlign: 'center', paddingTop: '50px', fontSize: '1.2em'}}>Cargando...</div>; } if (userProfile) { return <Navigate to="/filter/active" replace />; } return <LoginPage />; };

    return (
        <Router>
            <div className="App" style={{backgroundColor: 'var(--wa-dark-bg-main)', minHeight: '100vh'}}>
                <Routes>
                    <Route path="/login" element={<LoginRoute />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/update-password" element={<UpdatePasswordPage />} /> 
                    
                    <Route element={<ProtectedRoute />}>
                        <Route path="/set-initial-password" element={<SetInitialPasswordPage onPasswordAndFlagUpdated={handlePasswordAndFlagUpdated} />} />
                        
                        {/* --- 4. NUEVA ESTRUCTURA DE RUTAS INTELIGENTE --- */}
                        <Route path="/" element={<Navigate to="/filter/active" replace />} />
                        <Route path="/filter/:filterType" element={<DashboardLayoutWrapper />} />
                        <Route path="/filter/:filterType/chats/:sessionId" element={<DashboardLayoutWrapper />} />
                    </Route>
                    
                    <Route path="*" element={<Navigate to="/filter/active" replace />} />
                </Routes>
                <ToastContainer position="bottom-right" autoClose={4000} theme="dark" />
            </div>
        </Router>
    );
}

export default App;
