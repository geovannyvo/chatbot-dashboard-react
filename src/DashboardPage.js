// src/DashboardPage.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import {
    supabase,
    getChatHistory,
    getSessionStatus,
    updateSessionStatus,
    setPinStatus,
    archiveSession,
    unarchiveSession,
    blockSession,
    unblockSession
} from './supabaseClient';
import SessionList from './SessionList';
import ChatView from './ChatView';

const SESSION_STATUS = {
    BOT_ACTIVE: 'bot_active',
    AGENT_ACTIVE: 'agent_active',
    NEEDS_AGENT: 'needs_agent',
    BLOCKED: 'blocked',
    ARCHIVED: 'archived',
};

const colors = {
    bgMain: 'var(--wa-dark-bg-main, #111b21)',
    bgSec: 'var(--wa-dark-bg-sec, #202c33)',
    border: 'var(--wa-dark-border, #374045)',
    textSec: 'var(--wa-dark-text-sec, #8696a0)',
    alert: 'var(--wa-dark-alert, #f44336)',
};

// La prop setChatViewFilter viene de App.js -> DashboardLayout
function DashboardPage({ currentUser, chatViewFilter, setChatViewFilter, onCountsChange }) {
    const [groupedInteractions, setGroupedInteractions] = useState({});
    const [sessionStatuses, setSessionStatuses] = useState({});
    // ELIMINADAS las variables loading y error que no se usaban (líneas 38-39)
    const [selectedSessionId, setSelectedSessionId] = useState(null);
    const [unreadCounts, setUnreadCounts] = useState(() => {
        try { return JSON.parse(localStorage.getItem('unreadCounts')) || {}; } catch (e) { return {}; }
    });
    const [openContextMenuForSessionId, setOpenContextMenuForSessionId] = useState(null);
    
    // --- 1. NUEVO ESTADO PARA LA BÚSQUEDA ---
    const [searchTerm, setSearchTerm] = useState('');

    const selectedSessionIdRef = useRef(selectedSessionId);
    const sessionStatusesRef = useRef(sessionStatuses);

    useEffect(() => { selectedSessionIdRef.current = selectedSessionId; }, [selectedSessionId]);
    useEffect(() => { sessionStatusesRef.current = sessionStatuses; }, [sessionStatuses]);
    useEffect(() => {
        localStorage.setItem('unreadCounts', JSON.stringify(unreadCounts));
    }, [unreadCounts]);

    useEffect(() => {
        if (!onCountsChange) {
            return;
        }
        const newUnreadFilterCounts = { active: 0, archived: 0, needs_agent: 0, blocked: 0 };

        Object.entries(sessionStatuses).forEach(([sessionId, statusObj]) => {
            if (statusObj && statusObj.status) {
                const isUnread = (unreadCounts[sessionId] || 0) > 0;
                if (isUnread) {
                    switch (statusObj.status) {
                        case SESSION_STATUS.ARCHIVED:
                            newUnreadFilterCounts.archived += 1;
                            break;
                        case SESSION_STATUS.NEEDS_AGENT:
                            newUnreadFilterCounts.needs_agent += 1;
                            break;
                        case SESSION_STATUS.BOT_ACTIVE:
                        case SESSION_STATUS.AGENT_ACTIVE:
                            newUnreadFilterCounts.active += 1;
                            break;
                        default:
                            break;
                    }
                }
            }
        });

        onCountsChange(newUnreadFilterCounts);
    }, [sessionStatuses, unreadCounts, onCountsChange]);

    const formatInteractionData = useCallback((item) => ({
        id: item.id, sessionId: item.session_id,
        type: item.message?.type || 'unknown',
        content: item.message?.content || 'Mensaje vacío',
        time: item.time, isAgentMessage: item.sent_by_agent || false,
    }), []);

    const processInteractions = useCallback((interactionsArray) => {
        if (!interactionsArray || interactionsArray.length === 0) {
            return {};
        }
        const formattedAndSorted = [...interactionsArray]
            .map(item => (typeof item.isAgentMessage !== 'undefined' ? item : formatInteractionData(item)))
            .sort((a, b) => new Date(a.time) - new Date(b.time));
        
        const groupedBySession = formattedAndSorted.reduce((acc, interaction) => {
            const sid = interaction.sessionId;
            if (!acc[sid]) { acc[sid] = { messages: [], lastMessageTime: 0 }; }
            acc[sid].messages.push(interaction);
            const timeMs = new Date(interaction.time).getTime();
            if (!isNaN(timeMs)) { acc[sid].lastMessageTime = Math.max(acc[sid].lastMessageTime, timeMs); }
            return acc;
        }, {});
        
        const sortedEntries = Object.entries(groupedBySession).sort(([, a], [, b]) => b.lastMessageTime - a.lastMessageTime);
        
        const finalGrouped = sortedEntries.reduce((obj, [sid, data]) => { obj[sid] = data.messages; return obj; }, {});
        
        return finalGrouped;
    }, [formatInteractionData]);

    const initialLoad = useCallback(async (isMountedRef) => {
        if (!currentUser || !currentUser.id) {
            return;
        }
        
        try {
            const rawHistory = await getChatHistory(null, 200);
            if (!isMountedRef.current) return;
            
            const initialGrouped = processInteractions(rawHistory || []);
            if (isMountedRef.current) {
                setGroupedInteractions(initialGrouped);
            }
            
            if (initialGrouped && Object.keys(initialGrouped).length > 0) {
                const sessionIds = Object.keys(initialGrouped);
                const newStatusesFetchPromises = sessionIds.map(id => getSessionStatus(id).then(statusData => ({ id, statusData })));
                const resolvedStatuses = await Promise.all(newStatusesFetchPromises);
                if (!isMountedRef.current) return;
                const newStatusesObject = {};
                resolvedStatuses.forEach(item => { newStatusesObject[item.id] = item.statusData; });
                setSessionStatuses(newStatusesObject);
            } else {
                setSessionStatuses({});
            }
        } catch (err) {
            console.error("[DashboardPage Agente] initialLoad: ERROR CAZADO:", err);
        }
    }, [currentUser, processInteractions]);

    useEffect(() => {
        const isMountedRef = { current: true };
        if (currentUser && currentUser.id) {
            initialLoad(isMountedRef);
        }
        return () => { isMountedRef.current = false; };
    }, [currentUser, initialLoad]);

    useEffect(() => {
        if (!currentUser || !currentUser.id || !supabase) return;
        const isMountedRef = { current: true };
        const historyChannelName = `agent-hist-${currentUser.id.slice(0,8)}`;
        const statusChannelName = `agent-stat-${currentUser.id.slice(0,8)}`;

        const historySubscription = supabase.channel(historyChannelName)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'n8n_chat_histories' },
                async (payload) => {
                    if (!isMountedRef.current) return;
                    const newInteraction = formatInteractionData(payload.new);
                    
                    setGroupedInteractions(prev => {
                        const allMessages = [...Object.values(prev).flat().filter(m => m.id !== newInteraction.id), newInteraction];
                        return processInteractions(allMessages);
                    });

                    const currentSelected = selectedSessionIdRef.current;
                    const sessionStatus = sessionStatusesRef.current[newInteraction.sessionId]?.status;
            
                    if (newInteraction.sessionId !== currentSelected && sessionStatus !== SESSION_STATUS.BLOCKED) {
                        setUnreadCounts(prev => ({ ...prev, [newInteraction.sessionId]: (prev[newInteraction.sessionId] || 0) + 1 }));
                    }

                    if (!sessionStatusesRef.current[newInteraction.sessionId]) {
                        console.log("Estado de la sesión desconocido. Obteniendo estado...");
                        const newStatus = await getSessionStatus(newInteraction.sessionId);
                        if (isMountedRef.current) setSessionStatuses(prev => ({ ...prev, [newInteraction.sessionId]: newStatus }));
                    }
                })
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') { console.log(`[DBPage] Historial Subscrito: ${historyChannelName}`); }
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                   console.error(`%c[DBPage] Problema Canal ${historyChannelName}: Status: ${status}`, "color: red; font-weight: bold;", err ? JSON.stringify(err, Object.getOwnPropertyNames(err)) : 'No hay objeto de error detallado.');
                }
            });

        const statusSubscription = supabase.channel(statusChannelName)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_sessions_state' },
                (payload) => {
                    if (!isMountedRef.current) return;
                    const changedSessionId = payload.new?.session_id || payload.old?.session_id;
                    if (changedSessionId) {
                        if (payload.eventType === 'DELETE') {
                            setSessionStatuses(prev => { const newSt = { ...prev }; delete newSt[changedSessionId]; return newSt; });
                            if (selectedSessionIdRef.current === changedSessionId) setSelectedSessionId(null);
                        } else if (payload.new) {
                            setSessionStatuses(prev => ({ ...prev, [changedSessionId]: { ...(prev[changedSessionId] || {}), ...payload.new } }));
                        }
                    }
                })
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') { console.log(`[DBPage] Estado Subscrito: ${statusChannelName}`); }
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                   console.error(`%c[DBPage] Problema Canal ${statusChannelName}: Status: ${status}`, "color: red; font-weight: bold;", err ? JSON.stringify(err, Object.getOwnPropertyNames(err)) : 'No hay objeto de error detallado.');
                }
            });
            
        return () => {
            isMountedRef.current = false;
            if (supabase) {
                supabase.removeChannel(historySubscription).catch(err => console.error("Error al remover canal historial:", err));
                supabase.removeChannel(statusSubscription).catch(err => console.error("Error al remover canal estado:", err));
            }
        };
    }, [currentUser, formatInteractionData, processInteractions]); // REMOVIDO 'supabase' de las dependencias (línea 229)

    const handleToggleContextMenu = useCallback((sessionId, event) => {
        if (event) event.stopPropagation();
        setOpenContextMenuForSessionId(prev => (prev === sessionId ? null : sessionId));
    }, []);

    const handleCloseContextMenu = useCallback(() => {
        setOpenContextMenuForSessionId(null);
    }, []);

    useEffect(() => {
        document.addEventListener('click', handleCloseContextMenu);
        return () => document.removeEventListener('click', handleCloseContextMenu);
    }, [handleCloseContextMenu]);
    
    // --- 2. NUEVO MANEJADOR PARA LA BÚSQUEDA ---
    const handleSearchChange = useCallback((term) => {
        setSearchTerm(term);
    }, []);

    // ... (El resto de tus manejadores: handleTogglePinSession, handleMarkAsUnread, etc. no cambian)
    const handleTogglePinSession = useCallback(async (sessionId) => {
        const currentSession = sessionStatusesRef.current[sessionId];
        if (!currentSession || currentSession.status === SESSION_STATUS.ARCHIVED || currentSession.status === SESSION_STATUS.BLOCKED) return;
        const newPinStatus = !(currentSession.is_pinned || false);
        setSessionStatuses(prev => ({ ...prev, [sessionId]: { ...prev[sessionId], is_pinned: newPinStatus, last_updated: new Date().toISOString() } }));
        const success = await setPinStatus(sessionId, newPinStatus);
        if (!success) {
            toast.error('Error al cambiar estado de fijado.');
            setSessionStatuses(prev => ({ ...prev, [sessionId]: { ...prev[sessionId], is_pinned: currentSession.is_pinned, last_updated: new Date().toISOString() } }));
        }
    }, []);

    const handleMarkAsUnread = useCallback((sessionId) => {
        const currentSessionData = sessionStatusesRef.current[sessionId];
        const currentStatus = currentSessionData?.status;
        if (currentStatus === SESSION_STATUS.BLOCKED) {
            return;
        }
        setUnreadCounts(prevUnreadCounts => ({ ...prevUnreadCounts, [sessionId]: (prevUnreadCounts[sessionId] || 0) + 1 }));
    }, []);

    const handleMarkAsRead = useCallback((sessionId) => {
        setUnreadCounts(prevCounts => {
            if (prevCounts[sessionId] && prevCounts[sessionId] > 0) {
                const newCounts = { ...prevCounts };
                newCounts[sessionId] = 0;
                return newCounts;
            }
            return prevCounts;
        });
    }, []);

    const handleArchiveSession = useCallback(async (sessionId) => {
        const originalStatus = sessionStatusesRef.current[sessionId]?.status || SESSION_STATUS.BOT_ACTIVE;
        setSessionStatuses(prev => ({ ...prev, [sessionId]: { ...(prev[sessionId] || {}), status: SESSION_STATUS.ARCHIVED, agent_id: null, is_pinned: false, last_updated: new Date().toISOString() }}));
        if (selectedSessionId === sessionId) setSelectedSessionId(null);
        const success = await archiveSession(sessionId);
        if (!success) {
            toast.error('Error al archivar el chat.');
            setSessionStatuses(prev => ({ ...prev, [sessionId]: { ...(prev[sessionId] || {}), status: originalStatus, agent_id: sessionStatusesRef.current[sessionId]?.agent_id, is_pinned: sessionStatusesRef.current[sessionId]?.is_pinned, last_updated: new Date().toISOString() }}));
        }
    }, [selectedSessionId]);

    const handleUnarchiveSession = useCallback(async (sessionId) => {
        const originalStatus = sessionStatusesRef.current[sessionId]?.status || SESSION_STATUS.ARCHIVED;
        setSessionStatuses(prev => ({ ...prev, [sessionId]: { ...(prev[sessionId] || {}), status: SESSION_STATUS.BOT_ACTIVE, agent_id: null, last_updated: new Date().toISOString() }}));
        const success = await unarchiveSession(sessionId);
        if (!success) {
            toast.error('Error al desarchivar el chat.');
            setSessionStatuses(prev => ({ ...prev, [sessionId]: { ...(prev[sessionId] || {}), status: originalStatus, last_updated: new Date().toISOString() }}));
        }
    }, []);

    const handleBlockSession = useCallback(async (sessionId) => {
        if (!currentUser || !currentUser.id) { toast.error("Error: No se pudo identificar al agente."); return; }
        const originalStatus = sessionStatusesRef.current[sessionId]?.status || SESSION_STATUS.BOT_ACTIVE;
        setUnreadCounts(prev => { const nc = {...prev}; if (nc[sessionId]) delete nc[sessionId]; return nc; });
        setSessionStatuses(prev => ({ ...prev, [sessionId]: { ...(prev[sessionId] || {}), status: SESSION_STATUS.BLOCKED, agent_id: currentUser.id, is_pinned: false, last_updated: new Date().toISOString() }}));
        if (selectedSessionId === sessionId && chatViewFilter !== 'blocked') setSelectedSessionId(null);
        const success = await blockSession(sessionId, currentUser.id);
        if (!success) {
            toast.error('Error al bloquear el chat.');
            setSessionStatuses(prev => ({ ...prev, [sessionId]: { ...(prev[sessionId] || {}), status: originalStatus, agent_id: sessionStatusesRef.current[sessionId]?.agent_id, is_pinned: sessionStatusesRef.current[sessionId]?.is_pinned, last_updated: new Date().toISOString()}}));
        }
    }, [currentUser, selectedSessionId, chatViewFilter]);

    const handleUnblockSessionForContextMenu = useCallback(async (sessionId) => {
        const originalStatus = sessionStatusesRef.current[sessionId]?.status || SESSION_STATUS.BLOCKED;
        setSessionStatuses(prev => ({ ...prev, [sessionId]: { ...(prev[sessionId] || {}), status: SESSION_STATUS.BOT_ACTIVE, agent_id: null, last_updated: new Date().toISOString() }}));
        const success = await unblockSession(sessionId);
        if (!success) {
            toast.error('Error al desbloquear el chat.');
            setSessionStatuses(prev => ({ ...prev, [sessionId]: { ...(prev[sessionId] || {}), status: originalStatus, last_updated: new Date().toISOString()}}));
        }
    }, []);

    const handleSelectSession = useCallback(async (sessionId) => {
        const sessionData = sessionStatusesRef.current[sessionId];
        const currentFilter = chatViewFilter || 'active';

        if (!sessionData) {
            return;
        }

        if (currentFilter === 'needs_agent' && sessionData.status === SESSION_STATUS.NEEDS_AGENT) {
            if (!currentUser || !currentUser.id) {
                toast.error("Error: No se pudo identificar al agente para tomar el chat.");
                return;
            }
            const success = await updateSessionStatus(sessionId, SESSION_STATUS.AGENT_ACTIVE, currentUser.id);
            if (success) {
                setSessionStatuses(prev => ({
                    ...prev,
                    [sessionId]: {
                        ...(prev[sessionId] || {}),
                        status: SESSION_STATUS.AGENT_ACTIVE,
                        agent_id: currentUser.id,
                        last_updated: new Date().toISOString()
                    }
                }));
                if (setChatViewFilter) {
                    setChatViewFilter('active');
                }
            } else {
                toast.error(`Error al tomar el chat ${sessionId}. Intenta de nuevo.`);
                return;
            }
        } else {
            if (currentFilter === 'active' && (sessionData.status === SESSION_STATUS.ARCHIVED || sessionData.status === SESSION_STATUS.BLOCKED || sessionData.status === SESSION_STATUS.NEEDS_AGENT )) {
                return;
            }
            if (currentFilter === 'archived' && sessionData.status !== SESSION_STATUS.ARCHIVED) {
                return;
            }
            if (currentFilter === 'blocked' && sessionData.status !== SESSION_STATUS.BLOCKED) {
                return;
            }
        }

        setSelectedSessionId(sessionId);
        setUnreadCounts(prevCounts => {
            if (prevCounts[sessionId] && prevCounts[sessionId] > 0) {
                const newCounts = { ...prevCounts };
                newCounts[sessionId] = 0;
                return newCounts;
            }
            return prevCounts;
        });
        if (openContextMenuForSessionId === sessionId) setOpenContextMenuForSessionId(null);

    }, [chatViewFilter, currentUser, setChatViewFilter, openContextMenuForSessionId]);

    const effectiveChatViewFilter = chatViewFilter || 'active';
    const currentSelectedSessionStatusObject = sessionStatusesRef.current[selectedSessionId];
    const currentSelectedSessionStatus = currentSelectedSessionStatusObject?.status;

    // Esta lógica la hemos movido a SessionList, pero la dejamos aquí por si la necesitaras de vuelta.
    // const visibleSessions = Object.keys(groupedInteractions).filter(...)

    const shouldShowChatView = selectedSessionId && currentSelectedSessionStatusObject &&
        (
            (effectiveChatViewFilter === 'active' && currentSelectedSessionStatus !== SESSION_STATUS.ARCHIVED && currentSelectedSessionStatus !== SESSION_STATUS.BLOCKED && currentSelectedSessionStatus !== SESSION_STATUS.NEEDS_AGENT) ||
            (effectiveChatViewFilter === 'archived' && currentSelectedSessionStatus === SESSION_STATUS.ARCHIVED) ||
            (effectiveChatViewFilter === 'blocked' && currentSelectedSessionStatus === SESSION_STATUS.BLOCKED) ||
            (effectiveChatViewFilter === 'needs_agent' && currentSelectedSessionStatus === SESSION_STATUS.AGENT_ACTIVE && selectedSessionId)
        );
    
    const chatViewPlaceholder = () => {
        if (selectedSessionId && currentSelectedSessionStatusObject) {
            if (currentSelectedSessionStatus === SESSION_STATUS.BLOCKED && effectiveChatViewFilter !== 'blocked') return 'Este chat está bloqueado. Visualízalo desde el filtro "Bloqueados".';
            if (currentSelectedSessionStatus === SESSION_STATUS.ARCHIVED && effectiveChatViewFilter !== 'archived') return 'Este chat está archivado. Visualízalo desde el filtro "Archivados".';
        }
        // Este chequeo ya se hace en SessionList, pero es un buen fallback.
        // if (visibleSessions.length === 0) { ... }
        if (effectiveChatViewFilter === 'needs_agent' && !selectedSessionId) {
            return 'Selecciona un chat de la lista "Atención" para tomarlo y gestionarlo.';
        }
        return 'Selecciona una sesión.';
    };

    return (
        <div style={{ display: 'flex', height: '100%', width: '100%' }}>
            <div style={{ width: '350px', borderRight: `1px solid ${colors.border}`, overflowY: 'auto', backgroundColor: colors.bgMain, flexShrink: 0 }}>
                {/* --- 3. PASANDO LAS NUEVAS PROPS --- */}
                <SessionList
                    groupedInteractions={groupedInteractions}
                    sessionStatuses={sessionStatuses}
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
                    chatViewFilter={effectiveChatViewFilter}
                    searchTerm={searchTerm}
                    onSearchChange={handleSearchChange}
                />
            </div>
            <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', backgroundColor: colors.bgSec }}>
                {shouldShowChatView && selectedSessionId ? (
                    <ChatView
                        key={selectedSessionId}
                        sessionId={selectedSessionId}
                        messages={groupedInteractions[selectedSessionId] || []}
                        currentSessionStatus={sessionStatusesRef.current[selectedSessionId]?.status || SESSION_STATUS.BOT_ACTIVE}
                        currentUser={currentUser}
                        setSessionStatuses={setSessionStatuses}
                    />
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: colors.textSec, fontSize: '1.2em', padding: '20px', textAlign: 'center' }}>
                        {chatViewPlaceholder()}
                    </div>
                )}
            </div>
        </div>
    );
}

export default DashboardPage;