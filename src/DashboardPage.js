// src/DashboardPage.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
    supabase,
    getChatHistory,
    getSessionStatus,
    getContacts, // 1. IMPORTAMOS LA NUEVA FUNCIÓN
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

function DashboardPage({ currentUser, onCountsChange }) {
    const { filterType: chatViewFilter = 'active', sessionId: sessionIdFromUrl } = useParams();
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
    const sessionStatusesRef = useRef(sessionStatuses);

    useEffect(() => { selectedSessionIdRef.current = selectedSessionId; }, [selectedSessionId]);
    useEffect(() => { sessionStatusesRef.current = sessionStatuses; }, [sessionStatuses]);
    useEffect(() => { localStorage.setItem('unreadCounts', JSON.stringify(unreadCounts)); }, [unreadCounts]);
    useEffect(() => { try { if (Object.keys(groupedInteractions).length > 0) localStorage.setItem('cachedInteractions', JSON.stringify(groupedInteractions)); } catch(e) {} }, [groupedInteractions]);
    useEffect(() => { try { if (Object.keys(sessionStatuses).length > 0) localStorage.setItem('cachedStatuses', JSON.stringify(sessionStatuses)); } catch(e) {} }, [sessionStatuses]);
    useEffect(() => { try { if (Object.keys(contacts).length > 0) localStorage.setItem('cachedContacts', JSON.stringify(contacts)); } catch(e) {} }, [contacts]);
    useEffect(() => { try { localStorage.setItem('lastSelectedByFilter', JSON.stringify(lastSelectedByFilter)); } catch (e) {} }, [lastSelectedByFilter]);
    useEffect(() => { if (sessionIdFromUrl) { setSelectedSessionId(sessionIdFromUrl); setLastSelectedByFilter(prev => ({...prev, [chatViewFilter]: sessionIdFromUrl})); } else { setSelectedSessionId(null); } }, [sessionIdFromUrl, chatViewFilter]);
    useEffect(() => { if (!sessionIdFromUrl) { const lastSelected = lastSelectedByFilter[chatViewFilter]; if (lastSelected && sessionStatuses[lastSelected]) { navigate(`/filter/${chatViewFilter}/chats/${lastSelected}`, { replace: true }); } } }, [chatViewFilter, sessionIdFromUrl, lastSelectedByFilter, sessionStatuses, navigate]);
    
    const formatInteractionData = useCallback((item) => ({ id: item.id, sessionId: item.session_id, type: item.message?.type || 'unknown', content: item.message?.content || 'Mensaje vacío', time: item.time, isAgentMessage: item.sent_by_agent || false, }), []);
    const processInteractions = useCallback((interactionsArray) => { if (!interactionsArray || interactionsArray.length === 0) { return {}; } const formattedAndSorted = [...interactionsArray] .map(item => (typeof item.isAgentMessage !== 'undefined' ? item : formatInteractionData(item))) .sort((a, b) => new Date(a.time) - new Date(b.time)); const groupedBySession = formattedAndSorted.reduce((acc, interaction) => { const sid = interaction.sessionId; if (!acc[sid]) { acc[sid] = { messages: [], lastMessageTime: 0 }; } acc[sid].messages.push(interaction); const timeMs = new Date(interaction.time).getTime(); if (!isNaN(timeMs)) { acc[sid].lastMessageTime = Math.max(acc[sid].lastMessageTime, timeMs); } return acc; }, {}); const sortedEntries = Object.entries(groupedBySession).sort(([, a], [, b]) => b.lastMessageTime - a.lastMessageTime); const finalGrouped = sortedEntries.reduce((obj, [sid, data]) => { obj[sid] = data.messages; return obj; }, {}); return finalGrouped; }, [formatInteractionData]);
    
    const initialLoad = useCallback(async (isMountedRef) => {
        if (!currentUser || !currentUser.id) {
            if (isMountedRef.current) setIsLoading(false);
            return;
        }
        if (isMountedRef.current) setIsLoading(true);
        try {
            const [rawHistory, contactList] = await Promise.all([
                getChatHistory(null, 200),
                getContacts() 
            ]);

            if (!isMountedRef.current) return;

            const contactsMap = contactList.reduce((acc, contact) => {
                acc[contact.phone_number] = contact.display_name;
                return acc;
            }, {});
            if (isMountedRef.current) setContacts(contactsMap);
            
            const initialGrouped = processInteractions(rawHistory || []);
            if (isMountedRef.current) setGroupedInteractions(initialGrouped);
            
            if (initialGrouped && Object.keys(initialGrouped).length > 0) {
                const sessionIds = Object.keys(initialGrouped);
                const newStatusesFetchPromises = sessionIds.map(id => getSessionStatus(id));
                const resolvedStatuses = await Promise.all(newStatusesFetchPromises);

                if (!isMountedRef.current) return;
                
                const newStatusesObject = resolvedStatuses.reduce((acc, statusData) => {
                    if (statusData && statusData.session_id) {
                        acc[statusData.session_id] = statusData;
                    }
                    return acc;
                }, {});
                setSessionStatuses(newStatusesObject);
            } else {
                setSessionStatuses({});
            }
        } catch (err) {
            console.error("[DashboardPage] Error en initialLoad:", err);
        } finally {
            if (isMountedRef.current) setIsLoading(false);
        }
    }, [currentUser, processInteractions]);

    useEffect(() => { const isMountedRef = { current: true }; if (currentUser && currentUser.id) initialLoad(isMountedRef); else setIsLoading(false); return () => { isMountedRef.current = false; }; }, [currentUser, initialLoad]);
    // Suscripciones a Supabase (sin cambios)
    useEffect(() => { const isMountedRef = { current: true }; if (!currentUser || !currentUser.id || !supabase) return; const historyChannelName = `agent-hist-${currentUser.id.slice(0,8)}`; const statusChannelName = `agent-stat-${currentUser.id.slice(0,8)}`; const historySubscription = supabase.channel(historyChannelName) .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'n8n_chat_histories' }, async (payload) => { if (!isMountedRef.current) return; const newInteraction = formatInteractionData(payload.new); setGroupedInteractions(prev => { const allMessages = [...Object.values(prev).flat().filter(m => m.id !== newInteraction.id), newInteraction]; return processInteractions(allMessages); }); const currentSelected = selectedSessionIdRef.current; const sessionStatus = sessionStatusesRef.current[newInteraction.sessionId]?.status; if (newInteraction.sessionId !== currentSelected && sessionStatus !== SESSION_STATUS.BLOCKED) { setUnreadCounts(prev => ({ ...prev, [newInteraction.sessionId]: (prev[newInteraction.sessionId] || 0) + 1 })); } if (!sessionStatusesRef.current[newInteraction.sessionId]) { console.log("Estado de la sesión desconocido. Obteniendo estado..."); const newStatus = await getSessionStatus(newInteraction.sessionId); if (isMountedRef.current) setSessionStatuses(prev => ({ ...prev, [newInteraction.sessionId]: newStatus })); } }) .subscribe(); const statusSubscription = supabase.channel(statusChannelName) .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_sessions_state' }, (payload) => { if (!isMountedRef.current) return; const changedSessionId = payload.new?.session_id || payload.old?.session_id; if (changedSessionId) { if (payload.eventType === 'DELETE') { setSessionStatuses(prev => { const newSt = { ...prev }; delete newSt[changedSessionId]; return newSt; }); if (selectedSessionIdRef.current === changedSessionId) setSelectedSessionId(null); } else if (payload.new) { setSessionStatuses(prev => ({ ...prev, [changedSessionId]: { ...(prev[changedSessionId] || {}), ...payload.new } })); } } }) .subscribe(); return () => { isMountedRef.current = false; if (supabase) { supabase.removeChannel(historySubscription).catch(err => console.error("Error al remover canal historial:", err)); supabase.removeChannel(statusSubscription).catch(err => console.error("Error al remover canal estado:", err)); } }; }, [currentUser, formatInteractionData, processInteractions]);

    // Handlers (sin cambios)
    const handleSelectSession = useCallback(async (sessionId) => { const sessionData = sessionStatusesRef.current[sessionId]; const currentFilter = chatViewFilter || 'active'; if (!sessionData) return; if (currentFilter === 'needs_agent' && sessionData.status === SESSION_STATUS.NEEDS_AGENT) { if (!currentUser || !currentUser.id) { toast.error("Error: No se pudo identificar al agente."); return; } const success = await updateSessionStatus(sessionId, SESSION_STATUS.AGENT_ACTIVE, currentUser.id); if (success) { setSessionStatuses(prev => ({...prev, [sessionId]: {...(prev[sessionId] || {}), status: SESSION_STATUS.AGENT_ACTIVE, agent_id: currentUser.id }})); navigate(`/filter/active/chats/${sessionId}`); } else { toast.error(`Error al tomar el chat.`); } return; } if (currentFilter === 'active' && (sessionData.status === SESSION_STATUS.ARCHIVED || sessionData.status === SESSION_STATUS.BLOCKED || sessionData.status === SESSION_STATUS.NEEDS_AGENT )) { return; } if (currentFilter === 'archived' && sessionData.status !== SESSION_STATUS.ARCHIVED) { return; } if (currentFilter === 'blocked' && sessionData.status !== SESSION_STATUS.BLOCKED) { return; } navigate(`/filter/${currentFilter}/chats/${sessionId}`); setUnreadCounts(prevCounts => { if (prevCounts[sessionId] > 0) { const newCounts = { ...prevCounts }; newCounts[sessionId] = 0; return newCounts; } return prevCounts; }); if (openContextMenuForSessionId === sessionId) setOpenContextMenuForSessionId(null); }, [chatViewFilter, currentUser, openContextMenuForSessionId, navigate]);
    const handleActionThatRemovesChat = useCallback((sessionId, filterToClear) => { if (selectedSessionIdRef.current === sessionId) { setLastSelectedByFilter(prev => { const newState = {...prev}; delete newState[filterToClear]; return newState; }); navigate(`/filter/${chatViewFilter}`); } }, [navigate, chatViewFilter]);
    const handleArchiveSession = useCallback(async (sessionId) => { handleActionThatRemovesChat(sessionId, 'active'); const success = await archiveSession(sessionId); if(!success) toast.error("Error al archivar chat"); }, [handleActionThatRemovesChat]);
    const handleBlockSession = useCallback(async (sessionId) => { handleActionThatRemovesChat(sessionId, chatViewFilter); const success = await blockSession(sessionId, currentUser.id); if(!success) toast.error("Error al bloquear chat");}, [currentUser, chatViewFilter, handleActionThatRemovesChat]);
    const handleToggleContextMenu = useCallback((sessionId, event) => { if (event) event.stopPropagation(); setOpenContextMenuForSessionId(prev => (prev === sessionId ? null : sessionId)); }, []);
    const handleCloseContextMenu = useCallback(() => { setOpenContextMenuForSessionId(null); }, []);
    useEffect(() => { document.addEventListener('click', handleCloseContextMenu); return () => document.removeEventListener('click', handleCloseContextMenu); }, [handleCloseContextMenu]);
    const handleSearchChange = useCallback((term) => { setSearchTerm(term); }, []);
    const handleTogglePinSession = useCallback(async (sessionId) => { const currentSession = sessionStatusesRef.current[sessionId]; if (!currentSession || currentSession.status === SESSION_STATUS.ARCHIVED || currentSession.status === SESSION_STATUS.BLOCKED) return; const newPinStatus = !(currentSession.is_pinned || false); setSessionStatuses(prev => ({ ...prev, [sessionId]: { ...prev[sessionId], is_pinned: newPinStatus } })); const success = await setPinStatus(sessionId, newPinStatus); if (!success) { toast.error('Error al cambiar estado de fijado.'); setSessionStatuses(prev => ({ ...prev, [sessionId]: { ...prev[sessionId], is_pinned: currentSession.is_pinned } })); } }, []);
    const handleMarkAsUnread = useCallback((sessionId) => { const currentSessionData = sessionStatusesRef.current[sessionId]; const currentStatus = currentSessionData?.status; if (currentStatus === SESSION_STATUS.BLOCKED) { return; } setUnreadCounts(prevUnreadCounts => ({ ...prevUnreadCounts, [sessionId]: (prevUnreadCounts[sessionId] || 0) + 1 })); }, []);
    const handleMarkAsRead = useCallback((sessionId) => { setUnreadCounts(prevCounts => { if (prevCounts[sessionId] > 0) { const newCounts = { ...prevCounts }; newCounts[sessionId] = 0; return newCounts; } return prevCounts; }); }, []);
    const handleUnarchiveSession = useCallback(async (sessionId) => { const success = await unarchiveSession(sessionId); if(!success) toast.error("Error al desarchivar");}, []);
    const handleUnblockSessionForContextMenu = useCallback(async (sessionId) => { const success = await unblockSession(sessionId); if(!success) toast.error("Error al desbloquear");}, []);
    
    // --- LÓGICA DE VISUALIZACIÓN CORREGIDA ---
    const effectiveChatViewFilter = chatViewFilter || 'active';
    const currentSelectedSessionStatusObject = sessionStatuses[selectedSessionId];
    const currentSelectedSessionStatus = currentSelectedSessionStatusObject?.status;

    // Esta es la línea que he corregido, reemplazando el comentario.
    const shouldShowChatView = sessionIdFromUrl && currentSelectedSessionStatusObject && (
        (effectiveChatViewFilter === 'active' && currentSelectedSessionStatus !== SESSION_STATUS.ARCHIVED && currentSelectedSessionStatus !== SESSION_STATUS.BLOCKED && currentSelectedSessionStatus !== SESSION_STATUS.NEEDS_AGENT) ||
        (effectiveChatViewFilter === 'archived' && currentSelectedSessionStatus === SESSION_STATUS.ARCHIVED) ||
        (effectiveChatViewFilter === 'blocked' && currentSelectedSessionStatus === SESSION_STATUS.BLOCKED) ||
        (effectiveChatViewFilter === 'needs_agent' && currentSelectedSessionStatus === SESSION_STATUS.AGENT_ACTIVE && selectedSessionId)
    );
    
    // Esta es la segunda línea corregida.
    const chatViewPlaceholder = () => {
        if (selectedSessionId && currentSelectedSessionStatusObject) {
            if (currentSelectedSessionStatus === SESSION_STATUS.BLOCKED && effectiveChatViewFilter !== 'blocked') return 'Este chat está bloqueado. Visualízalo desde el filtro "Bloqueados".';
            if (currentSelectedSessionStatus === SESSION_STATUS.ARCHIVED && effectiveChatViewFilter !== 'archived') return 'Este chat está archivado. Visualízalo desde el filtro "Archivados".';
        }
        if (effectiveChatViewFilter === 'needs_agent' && !sessionIdFromUrl) {
            return 'Selecciona un chat de la lista "Atención" para tomarlo y gestionarlo.';
        }
        if (!sessionIdFromUrl) {
            return `Selecciona un chat de la lista '${effectiveChatViewFilter}'.`;
        }
        return 'Selecciona una sesión.';
    };

    return (
        <div style={{ display: 'flex', height: '100%', width: '100%' }}>
            <div style={{ width: '350px', borderRight: `1px solid ${colors.border}`, overflowY: 'auto', backgroundColor: colors.bgMain, flexShrink: 0 }}>
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
                    chatViewFilter={effectiveChatViewFilter}
                    searchTerm={searchTerm}
                    onSearchChange={handleSearchChange}
                />
            </div>
            <div style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', backgroundColor: colors.bgSec }}>
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
                    />
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: colors.textSec, fontSize: '1.2em', padding: '20px', textAlign: 'center' }}>
                        {(isLoading && Object.keys(groupedInteractions).length === 0) ? 'Sincronizando chats...' : chatViewPlaceholder()}
                    </div>
                )}
            </div>
        </div>
    );
}

export default DashboardPage;
