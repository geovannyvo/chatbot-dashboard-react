// src/DashboardPage.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, getChatHistory, getSessionStatus } from './supabaseClient';
import SessionList from './SessionList';
import ChatView from './ChatView';

const SESSION_STATUS = {
  BOT_ACTIVE: 'bot_active',
  AGENT_ACTIVE: 'agent_active',
  NEEDS_AGENT: 'needs_agent',
  BLOCKED: 'blocked',
};

// Paleta de colores Dark
const colors = {
    bgMain: '#111b21',
    border: '#374045',
    textSec: '#8696a0',
    alert: '#f44336',
};

function DashboardPage({ currentUser }) {
  const [selectedSessionId, setSelectedSessionId] = useState(
    () => localStorage.getItem('selectedSessionId') || null
  );
  const [unreadCounts, setUnreadCounts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('unreadCounts')) || {};
    } catch (e) {
      console.error("Error al cargar unreadCounts desde localStorage:", e);
      return {};
    }
  });

  const [groupedInteractions, setGroupedInteractions] = useState({});
  const [sessionStatuses, setSessionStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const selectedSessionIdRef = useRef(selectedSessionId);

  useEffect(() => {
    if (selectedSessionId) {
      localStorage.setItem('selectedSessionId', selectedSessionId);
      selectedSessionIdRef.current = selectedSessionId;
    } else {
      localStorage.removeItem('selectedSessionId');
      selectedSessionIdRef.current = null;
    }
  }, [selectedSessionId]);

  useEffect(() => {
    localStorage.setItem('unreadCounts', JSON.stringify(unreadCounts));
  }, [unreadCounts]);

  const formatInteractionData = useCallback((item) => {
    const messageType = item.message?.type || 'unknown';
    const messageContent = item.message?.content || 'Mensaje vacío';
    return {
      id: item.id,
      sessionId: item.session_id,
      type: messageType,
      content: messageContent,
      time: item.time,
      isAgentMessage: item.sent_by_agent || false,
    };
  }, []);

  const processAndSetGroupedInteractions = useCallback((interactionsArray) => {
    if (!interactionsArray || interactionsArray.length === 0) {
      setGroupedInteractions({}); return {};
    }
    const formattedAndSortedInteractions = [...interactionsArray]
      .map(item => (typeof item.isAgentMessage !== 'undefined' ? item : formatInteractionData(item)))
      .sort((a, b) => new Date(a.time) - new Date(b.time));

    const groupedBySession = formattedAndSortedInteractions.reduce((acc, interaction) => {
      const sessionId = interaction.sessionId;
      if (!acc[sessionId]) { acc[sessionId] = { messages: [], lastMessageTime: 0 }; }
      acc[sessionId].messages.push(interaction);
      const interactionTimeMs = new Date(interaction.time).getTime();
      if (!isNaN(interactionTimeMs)) { acc[sessionId].lastMessageTime = Math.max(acc[sessionId].lastMessageTime, interactionTimeMs); }
      return acc;
    }, {});

    const sortedSessionEntries = Object.entries(groupedBySession).sort(([, a], [, b]) => b.lastMessageTime - a.lastMessageTime);
    const finalGroupedState = sortedSessionEntries.reduce((obj, [id, data]) => { obj[id] = data.messages; return obj; }, {});
    setGroupedInteractions(finalGroupedState);
    return finalGroupedState;
  }, [formatInteractionData]);

  const initialLoad = useCallback(async (isMountedRef) => {
      try {
          if (!isMountedRef.current) return; setLoading(true);
          const rawData = await getChatHistory(null, 150);
          if (!isMountedRef.current) return;
          const initialGroupedData = processAndSetGroupedInteractions(rawData || []);
          if (initialGroupedData && Object.keys(initialGroupedData).length > 0) {
              const sessionIds = Object.keys(initialGroupedData);
              const newStatuses = {};
              for (const id of sessionIds) { newStatuses[id] = await getSessionStatus(id); }
              if (isMountedRef.current) {
                  setSessionStatuses(newStatuses);
                  setSelectedSessionId(currentId => {
                      if (currentId && !sessionIds.includes(currentId)) { return null; }
                      if (!currentId && sessionIds.length > 0) { return sessionIds[0]; }
                      return currentId;
                  });
              }
          }
          if (isMountedRef.current) setError(null);
      } catch (err) { if (isMountedRef.current) setError(err); }
      finally { if (isMountedRef.current) setLoading(false); }
  }, [processAndSetGroupedInteractions]);

  useEffect(() => {
    if (!currentUser) { setLoading(false); setGroupedInteractions({}); setSessionStatuses({}); setUnreadCounts({}); return; }
    const isMountedRef = { current: true }; initialLoad(isMountedRef);
    const mainChannelName = `public-dashboard-updates-${currentUser.id.substring(0,8)}`;
    const channel = supabase.channel(mainChannelName);

    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'n8n_chat_histories' }, (payload) => {
          if (!isMountedRef.current) return;
          const newInteraction = formatInteractionData(payload.new);
          const sessionId = newInteraction.sessionId;
          if (sessionId !== selectedSessionIdRef.current) {
              setUnreadCounts(prev => ({ ...prev, [sessionId]: (prev[sessionId] || 0) + 1 }));
          }
          setGroupedInteractions(prev => processAndSetGroupedInteractions([...Object.values(prev).flat(), newInteraction]));
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_sessions_state' }, (payload) => {
            if (!isMountedRef.current) return;
            const changedSessionId = payload.new?.session_id || payload.old?.session_id;
            const newStatus = payload.new?.status;
            if (changedSessionId && newStatus) {
                setSessionStatuses(prev => ({...prev, [changedSessionId]: newStatus}));
            } else if (payload.eventType === 'DELETE' && payload.old?.session_id) {
                setSessionStatuses(prev => { const newSt = {...prev}; delete newSt[payload.old.session_id]; return newSt; });
            }
        }
      )
      .subscribe((status, err) => { if (err) { setError(err); } });

    return () => { isMountedRef.current = false; supabase.removeChannel(channel); };
  }, [currentUser, processAndSetGroupedInteractions, formatInteractionData, initialLoad]);

  const handleSelectSession = useCallback((sessionId) => {
    setSelectedSessionId(sessionId);
    setUnreadCounts(prevCounts => ({ ...prevCounts, [sessionId]: 0 }));
  }, []);

  if (loading && Object.keys(groupedInteractions).length === 0) {
    return <p style={{ textAlign: 'center', marginTop: '20px', color: colors.textSec }}>Cargando datos del dashboard...</p>;
  }

  if (error) {
    return <p style={{ textAlign: 'center', color: colors.alert, marginTop: '20px' }}>Error al cargar datos: {error.message}</p>;
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 61px)' }}>
      <div style={{
          width: '300px', borderRight: `1px solid ${colors.border}`,
          overflowY: 'auto', backgroundColor: colors.bgMain,
      }}>
        <SessionList
          groupedInteractions={groupedInteractions}
          sessionStatuses={sessionStatuses}
          onSelectSession={handleSelectSession}
          selectedSessionId={selectedSessionId}
          unreadCounts={unreadCounts}
        />
      </div>
      <div style={{
          flexGrow: 1, padding: '0px', /* Quitar padding para que ChatView ocupe todo */
          overflowY: 'auto', display: 'flex', flexDirection: 'column',
          backgroundColor: colors.bgMain,
      }}>
        {selectedSessionId ? (
          <ChatView
            key={selectedSessionId} sessionId={selectedSessionId}
            messages={groupedInteractions[selectedSessionId] || []}
            currentSessionStatus={sessionStatuses[selectedSessionId] || SESSION_STATUS.BOT_ACTIVE}
            currentUser={currentUser} setSessionStatuses={setSessionStatuses}
          />
        ) : (
          <div style={{ textAlign: 'center', marginTop: '50px', color: colors.textSec }}>
            Selecciona una sesión para ver la conversación.
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;