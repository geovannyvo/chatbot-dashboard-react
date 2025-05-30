// src/DashboardPage.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    supabase,
    getChatHistory,
    getSessionStatus,
    setPinStatus,
    archiveSession,
    unarchiveSession,
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

function DashboardPage({ currentUser, chatViewFilter }) {
  const [groupedInteractions, setGroupedInteractions] = useState({});
  const [sessionStatuses, setSessionStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [unreadCounts, setUnreadCounts] = useState(() => {
      try { return JSON.parse(localStorage.getItem('unreadCounts')) || {}; } catch (e) { return {}; }
  });
  const [openContextMenuForSessionId, setOpenContextMenuForSessionId] = useState(null);
  
  const selectedSessionIdRef = useRef(selectedSessionId);
  const sessionStatusesRef = useRef(sessionStatuses);

  useEffect(() => { selectedSessionIdRef.current = selectedSessionId; }, [selectedSessionId]);
  useEffect(() => { sessionStatusesRef.current = sessionStatuses; }, [sessionStatuses]);
  useEffect(() => { localStorage.setItem('unreadCounts', JSON.stringify(unreadCounts)); }, [unreadCounts]);

  const formatInteractionData = useCallback((item) => ({
      id: item.id, sessionId: item.session_id,
      type: item.message?.type || 'unknown',
      content: item.message?.content || 'Mensaje vacío',
      time: item.time, isAgentMessage: item.sent_by_agent || false,
  }), []);

  const processAndSetGroupedInteractions = useCallback((interactionsArray) => {
    if (!interactionsArray || interactionsArray.length === 0) {
      setGroupedInteractions({}); return {};
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
    setGroupedInteractions(finalGrouped);
    return finalGrouped;
  }, [formatInteractionData]);

  const initialLoad = useCallback(async (isMountedRef) => {
    if (!currentUser || !currentUser.id) {
      console.warn("[DashboardPage Agente] initialLoad abortado: currentUser no está listo.");
      if (isMountedRef.current) setLoading(false);
      return;
    }
    console.log("[DashboardPage Agente] initialLoad: INICIANDO con currentUser:", currentUser.id);
    if (isMountedRef.current) { setError(null); /* No resetear groupedInteractions/sessionStatuses aquí para evitar parpadeo si ya hay datos */ }

    try {
      const rawHistory = await getChatHistory(null, 200);
      if (!isMountedRef.current) return;
      const initialGrouped = processAndSetGroupedInteractions(rawHistory || []);
      if (initialGrouped && Object.keys(initialGrouped).length > 0) {
        const sessionIds = Object.keys(initialGrouped);
        const newStatusesFetchPromises = sessionIds.map(id => getSessionStatus(id).then(statusData => ({ id, statusData })));
        const resolvedStatuses = await Promise.all(newStatusesFetchPromises);
        if (!isMountedRef.current) return;
        const newStatusesObject = {};
        resolvedStatuses.forEach(item => { newStatusesObject[item.id] = item.statusData; });
        setSessionStatuses(newStatusesObject);
      }
    } catch (err) {
      if (isMountedRef.current) setError(err.message || "Error cargando datos.");
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [currentUser, processAndSetGroupedInteractions]); // No incluir getSessionStatus directamente, ya está en el scope.

  useEffect(() => {
    const isMountedRef = { current: true };
    if (currentUser && currentUser.id) {
      console.log("[DashboardPage Agente] useEffect principal: currentUser listo. Llamando a initialLoad.", currentUser.id);
      setLoading(true); 
      initialLoad(isMountedRef);
    } else {
      console.log("[DashboardPage Agente] useEffect principal: currentUser NO listo. No se llama a initialLoad.");
      setLoading(false); 
      // No limpiar estados aquí para evitar perderlos si currentUser se vuelve null temporalmente
    }
    return () => { isMountedRef.current = false; };
  }, [currentUser, initialLoad]);


  useEffect(() => {
    if (!supabase || !currentUser || !currentUser.id) {
        console.log("[DashboardPage Agente] Suscripciones: No hay Supabase client o currentUser, no se suscribirá.");
        return;
    }
    const isMountedRef = { current: true };
    console.log("[DashboardPage Agente] Configurando suscripciones para:", currentUser.id);
    const historyChannelName = `agent-hist-${currentUser.id.slice(0,8)}`;
    const statusChannelName = `agent-stat-${currentUser.id.slice(0,8)}`;

    const historySubscription = supabase.channel(historyChannelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'n8n_chat_histories' },
        async (payload) => {
            if (!isMountedRef.current) return;
            const newInteraction = formatInteractionData(payload.new);
            setGroupedInteractions(prev => processAndSetGroupedInteractions([...Object.values(prev).flat().filter(m => m.id !== newInteraction.id), newInteraction]));
            if (newInteraction.sessionId !== selectedSessionIdRef.current && (sessionStatusesRef.current[newInteraction.sessionId]?.status !== SESSION_STATUS.ARCHIVED && sessionStatusesRef.current[newInteraction.sessionId]?.status !== SESSION_STATUS.BLOCKED)) {
                setUnreadCounts(prev => ({ ...prev, [newInteraction.sessionId]: (prev[newInteraction.sessionId] || 0) + 1 }));
            }
            if (!sessionStatusesRef.current[newInteraction.sessionId]) {
                const newStatus = await getSessionStatus(newInteraction.sessionId);
                if (isMountedRef.current) setSessionStatuses(prev => ({ ...prev, [newInteraction.sessionId]: newStatus }));
            }
        }
      ).subscribe();
    const statusSubscription = supabase.channel(statusChannelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_sessions_state' },
        (payload) => {
            if (!isMountedRef.current) return;
            const changedSessionId = payload.new?.session_id || payload.old?.session_id;
            if (changedSessionId) {
                console.log('[DashboardPage] Suscripción chat_sessions_state: Evento', payload.eventType, 'para', changedSessionId, payload.new);
                if (payload.eventType === 'DELETE') {
                    setSessionStatuses(prev => { const newSt = { ...prev }; delete newSt[changedSessionId]; return newSt; });
                    if (selectedSessionIdRef.current === changedSessionId) setSelectedSessionId(null);
                } else if (payload.new) {
                    setSessionStatuses(prev => ({ ...prev, [changedSessionId]: { ...(prev[changedSessionId] || {}), ...payload.new } }));
                }
            }
        }
      ).subscribe();
    return () => { 
        isMountedRef.current = false;
        if (supabase) {
          supabase.removeChannel(historySubscription).catch(console.error);
          supabase.removeChannel(statusSubscription).catch(console.error);
        }
    };
  }, [supabase, currentUser, formatInteractionData, processAndSetGroupedInteractions]);

  const handleToggleContextMenu = useCallback((sessionId, event) => { if (event) event.stopPropagation(); setOpenContextMenuForSessionId(prev => (prev === sessionId ? null : sessionId)); }, []);
  const handleCloseContextMenu = useCallback(() => setOpenContextMenuForSessionId(null), []);
  useEffect(() => { document.addEventListener('click', handleCloseContextMenu); return () => document.removeEventListener('click', handleCloseContextMenu); }, [handleCloseContextMenu]);
  
  // --- CONSOLE.LOGS AÑADIDOS PARA DEPURAR PIN/ARCHIVE ---
  const handleTogglePinSession = useCallback(async (sessionId) => {
    console.log(`[DashboardPage] handleTogglePinSession: Intentando cambiar pin para sesión ${sessionId}.`);
    const currentSession = sessionStatuses[sessionId];
    if (!currentSession || currentSession.status === SESSION_STATUS.ARCHIVED) {
        console.warn(`[DashboardPage] handleTogglePinSession: No se puede fijar/desfijar sesión ${sessionId} (archivada o no encontrada).`);
        return;
    }
    const newPinStatus = !(currentSession.is_pinned || false);
    console.log(`[DashboardPage] handleTogglePinSession: Nuevo estado de pin será ${newPinStatus}.`);
    
    // Actualización optimista
    setSessionStatuses(prev => ({
        ...prev,
        [sessionId]: { ...prev[sessionId], is_pinned: newPinStatus }
    }));

    const success = await setPinStatus(sessionId, newPinStatus);
    if (success) {
        console.log(`[DashboardPage] handleTogglePinSession: Pin de sesión ${sessionId} actualizado en DB a ${newPinStatus}.`);
    } else {
        console.error(`[DashboardPage] handleTogglePinSession: FALLO al actualizar pin de ${sessionId} en DB.`);
        alert('Error al cambiar estado de fijado del chat.');
        // Revertir si falla
        setSessionStatuses(prev => ({
            ...prev,
            [sessionId]: { ...prev[sessionId], is_pinned: currentSession.is_pinned }
        }));
    }
    handleCloseContextMenu();
  }, [sessionStatuses, handleCloseContextMenu]); // setPinStatus no es una dependencia porque es una importación.

  const handleMarkAsUnread = useCallback((sessionId) => {
    console.log(`[DashboardPage] handleMarkAsUnread: Marcando como no leída sesión ${sessionId}.`);
    if(sessionStatuses[sessionId]?.status === SESSION_STATUS.ARCHIVED) {
        console.warn(`[DashboardPage] handleMarkAsUnread: No se puede marcar como no leída sesión archivada ${sessionId}.`);
        return;
    }
    setUnreadCounts(prev => ({ ...prev, [sessionId]: 1 }));
    handleCloseContextMenu();
  }, [sessionStatuses, handleCloseContextMenu]);

  const handleArchiveSession = useCallback(async (sessionId) => {
    console.log(`[DashboardPage] handleArchiveSession: Intentando archivar sesión ${sessionId}.`);
    // Actualización optimista
    setSessionStatuses(prev => ({
        ...prev,
        [sessionId]: { ...(prev[sessionId] || {}), status: SESSION_STATUS.ARCHIVED }
    }));
    if (selectedSessionId === sessionId) {
        setSelectedSessionId(null); // Deseleccionar si se archiva la sesión activa
    }

    const success = await archiveSession(sessionId);
    if (success) {
        console.log(`[DashboardPage] handleArchiveSession: Sesión ${sessionId} archivada en DB.`);
    } else {
        console.error(`[DashboardPage] handleArchiveSession: FALLO al archivar ${sessionId} en DB.`);
        alert('Error al archivar el chat.');
        // Revertir si falla
        setSessionStatuses(prev => ({
            ...prev,
            [sessionId]: { ...(prev[sessionId] || {}), status: sessionStatusesRef.current[sessionId]?.status || SESSION_STATUS.BOT_ACTIVE } // Revertir al estado anterior conocido
        }));
    }
    handleCloseContextMenu();
  }, [selectedSessionId, handleCloseContextMenu]); // sessionStatusesRef para el fallback

  const handleUnarchiveSession = useCallback(async (sessionId) => {
    console.log(`[DashboardPage] handleUnarchiveSession: Intentando desarchivar sesión ${sessionId}.`);
    // Actualización optimista (asumimos que vuelve a bot_active, o podrías tener un estado "previous_status")
    setSessionStatuses(prev => ({
        ...prev,
        [sessionId]: { ...(prev[sessionId] || {}), status: SESSION_STATUS.BOT_ACTIVE }
    }));

    const success = await unarchiveSession(sessionId);
    if (success) {
        console.log(`[DashboardPage] handleUnarchiveSession: Sesión ${sessionId} desarchivada en DB.`);
    } else {
        console.error(`[DashboardPage] handleUnarchiveSession: FALLO al desarchivar ${sessionId} en DB.`);
        alert('Error al desarchivar el chat.');
        // Revertir si falla
        setSessionStatuses(prev => ({
            ...prev,
            [sessionId]: { ...(prev[sessionId] || {}), status: SESSION_STATUS.ARCHIVED }
        }));
    }
    handleCloseContextMenu();
  }, [handleCloseContextMenu]);
  
  const handleSelectSession = useCallback((sessionId) => {
    console.log("[DashboardPage Agente] handleSelectSession INVOCADA con sessionId:", sessionId);
    const sessionData = sessionStatuses[sessionId];
    const currentFilter = chatViewFilter || 'active';

    // Permitir la selección, ChatView decidirá si se muestra o no basado en shouldShowChatView
    // Pero si la sesión no existe en sessionStatuses, no la seleccionamos.
    if (!sessionData) {
        console.warn(`[DashboardPage Agente] handleSelectSession: No hay datos de estado para la sesión ${sessionId}. No se seleccionará.`);
        return;
    }
    
    // Lógica para evitar seleccionar un chat que no corresponde al filtro actual de la lista
    // Esto es más una protección, ya que SessionList ya debería haber filtrado
    if (currentFilter === 'active' && (sessionData.status === SESSION_STATUS.ARCHIVED || sessionData.status === SESSION_STATUS.BLOCKED)) { 
        console.warn(`[DashboardPage Agente] handleSelectSession: Intento de seleccionar sesión ${sessionData.status} en vista activa.`);
        return; 
    }
    if (currentFilter === 'archived' && sessionData.status !== SESSION_STATUS.ARCHIVED) { 
        console.warn(`[DashboardPage Agente] handleSelectSession: Intento de seleccionar sesión ${sessionData.status} en vista archivada.`);
        return; 
    }
    if (currentFilter === 'blocked' && sessionData.status !== SESSION_STATUS.BLOCKED) { 
        console.warn(`[DashboardPage Agente] handleSelectSession: Intento de seleccionar sesión ${sessionData.status} en vista bloqueada.`);
        return; 
    }
    
    setSelectedSessionId(sessionId);
    setUnreadCounts(prevCounts => ({ ...prevCounts, [sessionId]: 0 }));
    if (openContextMenuForSessionId === sessionId) setOpenContextMenuForSessionId(null);
  }, [chatViewFilter, sessionStatuses, openContextMenuForSessionId]);


  console.log(
      "[DashboardPage Agente] Renderizando. selectedSessionId:", selectedSessionId, 
      "Loading:", loading, 
      "currentUser ID:", currentUser?.id,
      "Estado para selectedSession:", sessionStatuses[selectedSessionId]
  );

  if (!currentUser || !currentUser.id) {
    console.log("[DashboardPage Agente] Renderizando estado de espera: currentUser no válido.");
    return <div style={{ textAlign: 'center', margin: 'auto', color: colors.textSec, fontSize: '1.2em', width: '100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>Esperando información del usuario...</div>;
  }
  if (loading) {
    return <div style={{ textAlign: 'center', margin: 'auto', color: colors.textSec, fontSize: '1.2em', width: '100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>Cargando chats...</div>;
  }
  if (error) {
    return <div style={{ textAlign: 'center', margin: 'auto', color: colors.alert, fontSize: '1.2em', width: '100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>Error: {error}</div>;
  }

  const effectiveChatViewFilter = chatViewFilter || 'active';
  const currentSelectedSessionStatusObject = sessionStatuses[selectedSessionId];
  const currentSelectedSessionStatus = currentSelectedSessionStatusObject?.status;

  const visibleSessions = Object.keys(groupedInteractions).filter(sid => {
    const status = sessionStatuses[sid]?.status;
    if (effectiveChatViewFilter === 'active') {
      return status !== SESSION_STATUS.ARCHIVED && status !== SESSION_STATUS.BLOCKED;
    } else if (effectiveChatViewFilter === 'archived') {
      return status === SESSION_STATUS.ARCHIVED;
    } else if (effectiveChatViewFilter === 'blocked') {
      return status === SESSION_STATUS.BLOCKED;
    }
    return status !== SESSION_STATUS.ARCHIVED && status !== SESSION_STATUS.BLOCKED; 
  });

  const shouldShowChatView = selectedSessionId && currentSelectedSessionStatusObject &&
    (
      (effectiveChatViewFilter === 'active' && currentSelectedSessionStatus !== SESSION_STATUS.ARCHIVED && currentSelectedSessionStatus !== SESSION_STATUS.BLOCKED) ||
      (effectiveChatViewFilter === 'archived' && currentSelectedSessionStatus === SESSION_STATUS.ARCHIVED) ||
      (effectiveChatViewFilter === 'blocked' && currentSelectedSessionStatus === SESSION_STATUS.BLOCKED)
    );

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%' }}>
      <div style={{ width: '350px', borderRight: `1px solid ${colors.border}`, overflowY: 'auto', backgroundColor: colors.bgMain, flexShrink: 0 }}>
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
          onArchiveSession={handleArchiveSession}
          onUnarchiveSession={handleUnarchiveSession} 
          chatViewFilter={effectiveChatViewFilter}
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
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: colors.textSec, fontSize: '1.2em' }}>
            {
              (selectedSessionId && currentSelectedSessionStatus === SESSION_STATUS.BLOCKED && effectiveChatViewFilter !== 'blocked') ? 
                'Este chat está bloqueado. Visualízalo desde el filtro "Bloqueados".' :
              (selectedSessionId && currentSelectedSessionStatus === SESSION_STATUS.ARCHIVED && effectiveChatViewFilter !== 'archived') ?
                'Este chat está archivado. Visualízalo desde el filtro "Archivados".' :
              (visibleSessions.length === 0 && effectiveChatViewFilter === 'active') ? 'No hay sesiones activas.' :
              (visibleSessions.length === 0 && effectiveChatViewFilter === 'archived') ? 'No hay chats archivados.' :
              (visibleSessions.length === 0 && effectiveChatViewFilter === 'blocked') ? 'No hay chats bloqueados.' :
              'Selecciona una sesión.'
            }
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;