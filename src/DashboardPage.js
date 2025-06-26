import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
    supabase,
    getChatHistory,
    getSessionStatus,
    getContacts,
    updateSessionStatus,
    setPinStatus,
    archiveSession,
    unarchiveSession,
    blockSession,
    unblockSession
} from './supabaseClient';
import SessionList from './SessionList';
import ChatView from './ChatView';

const SESSION_STATUS = { BOT_ACTIVE: 'bot_active', AGENT_ACTIVE: 'agent_active', NEEDS_AGENT: 'needs_agent', BLOCKED: 'blocked', ARCHIVED: 'archived' };
const colors = { bgMain: 'var(--wa-dark-bg-main, #111b21)', bgSec: 'var(--wa-dark-bg-sec, #202c33)', border: 'var(--wa-dark-border, #374045)', textSec: 'var(--wa-dark-text-sec, #8696a0)', alert: 'var(--wa-dark-alert, #f44336)' };

const getCachedData = (key, defaultValue = {}) => {
    try {
        const cached = localStorage.getItem(key);
        return cached ? JSON.parse(cached) : defaultValue;
    } catch (e) {
        console.error(`Error al leer la caché para ${key}:`, e);
        return defaultValue;
    }
};

function DashboardPage({ currentUser, onCountersUpdate, isMobile, filterType }) {
    const { sessionId: sessionIdFromUrl } = useParams();
    const navigate = useNavigate();

    const [groupedInteractions, setGroupedInteractions] = useState(() => getCachedData('cachedInteractions'));
    const [sessionStatuses, setSessionStatuses] = useState(() => getCachedData('cachedStatuses'));
    const [contacts, setContacts] = useState(() => getCachedData('cachedContacts', {}));
    const [selectedSessionId, setSelectedSessionId] = useState(sessionIdFromUrl || null);
    const [isLoading, setIsLoading] = useState(true);
    const [unreadCounts, setUnreadCounts] = useState(() => getCachedData('unreadCounts'));
    const [openContextMenuForSessionId, setOpenContextMenuForSessionId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [lastSelectedByFilter, setLastSelectedByFilter] = useState(() => getCachedData('lastSelectedByFilter', {}));

    const selectedSessionIdRef = useRef(selectedSessionId);
    
    useEffect(() => { selectedSessionIdRef.current = selectedSessionId; }, [selectedSessionId]);
    useEffect(() => { localStorage.setItem('unreadCounts', JSON.stringify(unreadCounts)); }, [unreadCounts]);
    useEffect(() => { try { if (Object.keys(groupedInteractions).length > 0) localStorage.setItem('cachedInteractions', JSON.stringify(groupedInteractions)); } catch (e) {} }, [groupedInteractions]);
    useEffect(() => { try { if (Object.keys(sessionStatuses).length > 0) localStorage.setItem('cachedStatuses', JSON.stringify(sessionStatuses)); } catch (e) {} }, [sessionStatuses]);
    useEffect(() => { try { if (Object.keys(contacts).length > 0) localStorage.setItem('cachedContacts', JSON.stringify(contacts)); } catch (e) {} }, [contacts]);
    useEffect(() => { try { localStorage.setItem('lastSelectedByFilter', JSON.stringify(lastSelectedByFilter)); } catch (e) {} }, [lastSelectedByFilter]);
    useEffect(() => { if (sessionIdFromUrl) { setSelectedSessionId(sessionIdFromUrl); setLastSelectedByFilter(prev => ({ ...prev, [filterType]: sessionIdFromUrl })); } else { setSelectedSessionId(null); } }, [sessionIdFromUrl, filterType]);
    
    const formatInteractionData = useCallback((item) => ({ id: item.id, sessionId: item.session_id, type: item.message?.type || 'unknown', content: item.message?.content || 'Mensaje vacío', time: item.time, isAgentMessage: item.sent_by_agent || false, status: item.status || 'entregado' }), []);
    const processInteractions = useCallback((interactionsArray) => { if (!interactionsArray || interactionsArray.length === 0) { return {}; } const formattedAndSorted = [...interactionsArray].map(item => (typeof item.isAgentMessage !== 'undefined' ? item : formatInteractionData(item))).sort((a, b) => new Date(a.time) - new Date(b.time)); const groupedBySession = formattedAndSorted.reduce((acc, interaction) => { const sid = interaction.sessionId; if (!acc[sid]) { acc[sid] = { messages: [], lastMessageTime: 0 }; } acc[sid].messages.push(interaction); const timeMs = new Date(interaction.time).getTime(); if (!isNaN(timeMs)) { acc[sid].lastMessageTime = Math.max(acc[sid].lastMessageTime, timeMs); } return acc; }, {}); const sortedEntries = Object.entries(groupedBySession).sort(([, a], [, b]) => b.lastMessageTime - a.lastMessageTime); const finalGrouped = sortedEntries.reduce((obj, [sid, data]) => { obj[sid] = data.messages; return obj; }, {}); return finalGrouped; }, [formatInteractionData]);
    const initialLoad = useCallback(async (isMountedRef) => { if (!currentUser || !currentUser.id) { if (isMountedRef.current) setIsLoading(false); return; } if (isMountedRef.current) setIsLoading(true); try { const [rawHistory, contactList] = await Promise.all([ getChatHistory(null, 200), getContacts() ]); if (!isMountedRef.current) return; const contactsMap = contactList.reduce((acc, contact) => { acc[contact.phone_number] = contact.display_name; return acc; }, {}); if (isMountedRef.current) setContacts(contactsMap); const initialGrouped = processInteractions(rawHistory || []); if (isMountedRef.current) setGroupedInteractions(initialGrouped); if (initialGrouped && Object.keys(initialGrouped).length > 0) { const sessionIds = Object.keys(initialGrouped); const newStatusesFetchPromises = sessionIds.map(id => getSessionStatus(id)); const resolvedStatuses = await Promise.all(newStatusesFetchPromises); if (!isMountedRef.current) return; const newStatusesObject = resolvedStatuses.reduce((acc, statusData) => { if (statusData && statusData.session_id) { acc[statusData.session_id] = statusData; } return acc; }, {}); setSessionStatuses(newStatusesObject); } else { setSessionStatuses({}); } } catch (err) { console.error("[DashboardPage] Error en initialLoad:", err); } finally { if (isMountedRef.current) setIsLoading(false); } }, [currentUser, processInteractions]);
    
    useEffect(() => { const isMountedRef = { current: true }; if (currentUser && currentUser.id) initialLoad(isMountedRef); else setIsLoading(false); return () => { isMountedRef.current = false; }; }, [currentUser, initialLoad]);
    
    useEffect(() => {
        if (selectedSessionId && Object.keys(sessionStatuses).length > 0) {
            const sessionStatus = sessionStatuses[selectedSessionId]?.status;
            if (!sessionStatus) return;
            const isSessionValidForFilter = (filter, status) => {
                switch (filter) {
                    case 'active': return status !== SESSION_STATUS.ARCHIVED && status !== SESSION_STATUS.BLOCKED && status !== SESSION_STATUS.NEEDS_AGENT;
                    case 'archived': return status === SESSION_STATUS.ARCHIVED;
                    case 'blocked': return status === SESSION_STATUS.BLOCKED;
                    case 'needs_agent': return status === SESSION_STATUS.NEEDS_AGENT;
                    default: return false;
                }
            };
            if (!isSessionValidForFilter(filterType, sessionStatus)) {
                setSelectedSessionId(null);
                navigate(`/filter/${filterType}`, { replace: true });
            }
        }
    }, [filterType, selectedSessionId, sessionStatuses, navigate]);
    
    // --- INICIO DE LA CORRECCIÓN: SEPARACIÓN DE INTERESES ---

    // useEffect para manejar los cambios de ESTADO de las sesiones
    useEffect(() => {
        const isMountedRef = { current: true };
        if (!currentUser || !currentUser.id || !supabase) return;

        const statusChannelName = `agent-stat-${currentUser.id.slice(0, 8)}`;
        const statusSubscription = supabase.channel(statusChannelName)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_sessions_state' }, (payload) => {
                if (!isMountedRef.current) return;
                const changedSessionId = payload.new?.session_id || payload.old?.session_id;
                if (!changedSessionId) return;

                if (payload.eventType === 'DELETE') {
                    setSessionStatuses(prev => { const newSt = { ...prev }; delete newSt[changedSessionId]; return newSt; });
                    if (selectedSessionIdRef.current === changedSessionId) setSelectedSessionId(null);
                } else if (payload.new) {
                    const newStatusData = payload.new;
                    setSessionStatuses(prevStatuses => {
                        const oldStatus = prevStatuses[changedSessionId]?.status;
                        const newStatus = newStatusData.status;

                        if (newStatus === SESSION_STATUS.NEEDS_AGENT && oldStatus !== newStatus) {
                            if (changedSessionId !== selectedSessionIdRef.current) {
                                setUnreadCounts(prevUnread => ({ ...prevUnread, [changedSessionId]: (prevUnread[changedSessionId] || 0) + 1 }));
                            }
                        }
                        
                        return { ...prevStatuses, [changedSessionId]: { ...(prevStatuses[changedSessionId] || {}), ...newStatusData } };
                    });
                }
            }).subscribe();
        
        return () => {
            isMountedRef.current = false;
            if (supabase && statusSubscription) {
                supabase.removeChannel(statusSubscription);
            }
        };
    }, [currentUser]); // Solo depende del usuario para crear la suscripción una vez

    // useEffect para manejar los MENSAJES nuevos
    useEffect(() => {
        const isMountedRef = { current: true };
        if (!currentUser || !currentUser.id || !supabase) return;

        const handleIncomingUpdate = (payload) => { /* ... */ };
        const historyChannelName = `agent-hist-${currentUser.id.slice(0, 8)}`;
        const historySubscription = supabase.channel(historyChannelName)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'n8n_chat_histories' }, async (payload) => {
                handleIncomingUpdate(payload);
                const newInteraction = formatInteractionData(payload.new);
                const currentSelected = selectedSessionIdRef.current;
                
                setSessionStatuses(currentStatuses => {
                    const sessionStatus = currentStatuses[newInteraction.sessionId]?.status;
                    if (newInteraction.sessionId !== currentSelected && sessionStatus !== SESSION_STATUS.BLOCKED) {
                        setUnreadCounts(prev => ({ ...prev, [newInteraction.sessionId]: (prev[newInteraction.sessionId] || 0) + 1 }));
                    }
                    if (!currentStatuses[newInteraction.sessionId]) {
                        getSessionStatus(newInteraction.sessionId).then(newStatus => {
                            if (isMountedRef.current) setSessionStatuses(prev => ({ ...prev, [newInteraction.sessionId]: newStatus }));
                        });
                    }
                    return currentStatuses;
                });
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'n8n_chat_histories' }, handleIncomingUpdate)
            .subscribe();

        return () => {
            isMountedRef.current = false;
            if (supabase && historySubscription) {
                supabase.removeChannel(historySubscription);
            }
        };
    }, [currentUser]); // Solo depende del usuario

    // --- FIN DE LA CORRECCIÓN ---

    useEffect(() => {
        const calculateFilterCounts = () => {
            const counts = { active: 0, needs_agent: 0, archived: 0, blocked: 0 };
            const unreadSessionIds = Object.keys(unreadCounts).filter(id => unreadCounts[id] > 0);
            for (const sessionId of unreadSessionIds) {
                const status = sessionStatuses[sessionId]?.status;
                if (status === SESSION_STATUS.BOT_ACTIVE || status === SESSION_STATUS.AGENT_ACTIVE) { counts.active += 1; } 
                else if (status === SESSION_STATUS.NEEDS_AGENT) { counts.needs_agent += 1; } 
                else if (status === SESSION_STATUS.ARCHIVED) { counts.archived += 1; } 
                else if (status === SESSION_STATUS.BLOCKED) { counts.blocked += 1; }
            }
            return counts;
        };
        const newCounts = calculateFilterCounts();
        if (onCountersUpdate) {
            onCountersUpdate(newCounts);
        }
    }, [unreadCounts, sessionStatuses, onCountersUpdate]);

    const handleSelectSession = useCallback(async (sessionId) => {
        const sessionData = sessionStatuses[sessionId];
        const currentFilter = filterType || 'active';
        if (currentFilter === 'needs_agent' && sessionData?.status === SESSION_STATUS.NEEDS_AGENT) {
            if (!currentUser || !currentUser.id) {
                toast.error("Error: No se pudo identificar al agente.");
                return;
            }
            const success = await updateSessionStatus(sessionId, SESSION_STATUS.AGENT_ACTIVE, currentUser.id);
            if (success) {
                setSessionStatuses(prev => ({ ...prev, [sessionId]: { ...(prev[sessionId] || {}), status: SESSION_STATUS.AGENT_ACTIVE, agent_id: currentUser.id } }));
                navigate(`/filter/active/chats/${sessionId}`);
            } else {
                toast.error(`Error al tomar el chat.`);
            }
            return;
        }
        navigate(`/filter/${currentFilter}/chats/${sessionId}`);
        setUnreadCounts(prevCounts => {
            if (prevCounts[sessionId] > 0) {
                const newCounts = { ...prevCounts };
                delete newCounts[sessionId];
                return newCounts;
            }
            return prevCounts;
        });
        if (openContextMenuForSessionId === sessionId) {
            setOpenContextMenuForSessionId(null);
        }
    }, [filterType, currentUser, openContextMenuForSessionId, navigate, sessionStatuses]);
    
    const handleActionThatRemovesChat = useCallback((sessionId, filterToClear) => { if (selectedSessionIdRef.current === sessionId) { setLastSelectedByFilter(prev => { const newState = { ...prev }; delete newState[filterToClear]; return newState; }); navigate(`/filter/${filterType}`); } }, [navigate, filterType]);
    
    const handleArchiveSession = useCallback(async (sessionId) => {
        handleActionThatRemovesChat(sessionId, 'active');
        const success = await archiveSession(sessionId);
        if (success) {
            setSessionStatuses(prev => ({ ...prev, [sessionId]: { ...(prev[sessionId] || {}), status: SESSION_STATUS.ARCHIVED } }));
        } else {
            toast.error("Error al archivar chat");
        }
    }, [handleActionThatRemovesChat]);

    const handleUnarchiveSession = useCallback(async (sessionId) => {
        handleActionThatRemovesChat(sessionId, 'archived');
        const success = await unarchiveSession(sessionId);
        if (success) {
            setSessionStatuses(prev => ({ ...prev, [sessionId]: { ...(prev[sessionId] || {}), status: SESSION_STATUS.BOT_ACTIVE } }));
        } else {
            toast.error("Error al desarchivar");
        }
    }, [handleActionThatRemovesChat]);

    const handleBlockSession = useCallback(async (sessionId) => {
        handleActionThatRemovesChat(sessionId, filterType);
        const success = await blockSession(sessionId, currentUser.id);
        if (success) {
            setSessionStatuses(prev => ({ ...prev, [sessionId]: { ...(prev[sessionId] || {}), status: SESSION_STATUS.BLOCKED } }));
        } else {
            toast.error("Error al bloquear chat");
        }
    }, [currentUser, filterType, handleActionThatRemovesChat]);

    const handleUnblockSessionForContextMenu = useCallback(async (sessionId) => {
        handleActionThatRemovesChat(sessionId, 'blocked');
        const success = await unblockSession(sessionId);
        if (success) {
            setSessionStatuses(prev => ({ ...prev, [sessionId]: { ...(prev[sessionId] || {}), status: SESSION_STATUS.BOT_ACTIVE } }));
        } else {
            toast.error("Error al desbloquear");
        }
    }, [handleActionThatRemovesChat]);

    const handleToggleContextMenu = useCallback((sessionId, event) => { if (event) event.stopPropagation(); setOpenContextMenuForSessionId(prev => (prev === sessionId ? null : sessionId)); }, []);
    const handleCloseContextMenu = useCallback(() => { setOpenContextMenuForSessionId(null); }, []);
    useEffect(() => { document.addEventListener('click', handleCloseContextMenu); return () => document.removeEventListener('click', handleCloseContextMenu); }, [handleCloseContextMenu]);
    const handleSearchChange = useCallback((term) => { setSearchTerm(term); }, []);
    const handleTogglePinSession = useCallback(async (sessionId) => { const currentSession = sessionStatuses[sessionId]; if (!currentSession || currentSession.status === SESSION_STATUS.ARCHIVED || currentSession.status === SESSION_STATUS.BLOCKED) return; const newPinStatus = !(currentSession.is_pinned || false); setSessionStatuses(prev => ({ ...prev, [sessionId]: { ...prev[sessionId], is_pinned: newPinStatus } })); const success = await setPinStatus(sessionId, newPinStatus); if (!success) { toast.error('Error al cambiar estado de fijado.'); setSessionStatuses(prev => ({ ...prev, [sessionId]: { ...prev[sessionId], is_pinned: currentSession.is_pinned } })); } }, [sessionStatuses]);
    const handleMarkAsUnread = useCallback((sessionId) => { const currentSessionData = sessionStatuses[sessionId]; const currentStatus = currentSessionData?.status; if (currentStatus === SESSION_STATUS.BLOCKED) { return; } setUnreadCounts(prevUnreadCounts => ({ ...prevUnreadCounts, [sessionId]: (prevUnreadCounts[sessionId] || 0) + 1 })); }, [sessionStatuses]);
    const handleMarkAsRead = useCallback((sessionId) => { setUnreadCounts(prevCounts => { if (prevCounts[sessionId] > 0) { const newCounts = { ...prevCounts }; delete newCounts[sessionId]; return newCounts; } return prevCounts; }); }, []);

    const listPanelStyle = { width: isMobile ? '100%' : '350px', display: isMobile && selectedSessionId ? 'none' : 'flex', flexDirection: 'column', height: '100%', backgroundColor: colors.bgMain, flexShrink: 0 };
    const chatPanelStyle = { display: isMobile && !selectedSessionId ? 'none' : 'flex', flexDirection: 'column', flexGrow: 1, backgroundColor: colors.bgSec };
    const currentSelectedSessionStatusObject = sessionStatuses[selectedSessionId];
    const currentSelectedSessionStatus = currentSelectedSessionStatusObject?.status;
    const shouldShowChatView = selectedSessionId && currentSelectedSessionStatusObject;

    return (
        <div style={{ display: 'flex', height: '100%', width: '100%' }}>
            <div style={listPanelStyle}>
                <SessionList
                    isLoading={isLoading}
                    groupedInteractions={groupedInteractions}
                    sessionStatuses={sessionStatuses}
                    contacts={contacts}
                    onSelectSession={handleSelectSession}
                    selectedSessionId={selectedSessionId}
                    unreadCounts={unreadCounts}
                    openContextMenuForSessionId={openContextMenuForSessionId}
                    onToggleContextMenu={handleToggleContextMenu}
                    onPinSession={handleTogglePinSession}
                    onMarkAsUnread={handleMarkAsUnread}
                    onMarkAsRead={handleMarkAsRead}
                    onArchiveSession={handleArchiveSession}
                    onUnarchiveSession={handleUnarchiveSession}
                    onBlockSession={handleBlockSession}
                    onUnblockSession={handleUnblockSessionForContextMenu}
                    chatViewFilter={filterType}
                    searchTerm={searchTerm}
                    onSearchChange={handleSearchChange}
                />
            </div>
            <div style={chatPanelStyle}>
                {shouldShowChatView ? (
                    <ChatView
                        key={selectedSessionId}
                        sessionId={selectedSessionId}
                        messages={groupedInteractions[selectedSessionId] || []}
                        currentSessionStatus={currentSelectedSessionStatus || SESSION_STATUS.BOT_ACTIVE}
                        currentUser={currentUser}
                        setSessionStatuses={setSessionStatuses}
                        contacts={contacts}
                        setContacts={setContacts}
                        isMobile={isMobile}
                        filterType={filterType}
                    />
                ) : (
                    !isMobile && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: colors.textSec, fontSize: '1.2em', padding: '20px', textAlign: 'center' }}>
                           {(isLoading && Object.keys(groupedInteractions).length === 0) ? 'Sincronizando chats...' : 'Selecciona un chat para comenzar.'}
                        </div>
                    )
                )}
            </div>
        </div>
    );
}

export default DashboardPage;
