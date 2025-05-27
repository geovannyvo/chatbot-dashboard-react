// src/ChatbotInteractions.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  supabase,
  getChatHistory,
  sendAgentMessageViaN8N,
  getSessionStatus,
  updateSessionStatus
} from './supabaseClient';

const SESSION_STATUS = {
  BOT_ACTIVE: 'bot_active',
  AGENT_ACTIVE: 'agent_active',
  NEEDS_AGENT: 'needs_agent',
  // CLOSED: 'closed', // Si decides re-implementar el cierre
};

// Iconos SVG simples (puedes reemplazarlos con una librería de iconos si prefieres)
const BotIcon = () => <svg fill="#2196F3" viewBox="0 0 24 24" width="20px" height="20px" style={{ marginRight: '8px'}}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2.5-8.5h5v1h-5zm-1.5 2.5h8V16h-8zM9 9c.83 0 1.5.67 1.5 1.5S9.83 12 9 12s-1.5-.67-1.5-1.5S8.17 9 9 9zm6 0c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5z"/></svg>;
const UserIcon = () => <svg fill="#007bff" viewBox="0 0 24 24" width="20px" height="20px" style={{ marginRight: '8px'}}><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>;
const AgentIcon = () => <svg fill="#ff9800" viewBox="0 0 24 24" width="20px" height="20px" style={{ marginRight: '8px'}}><path d="M12 1.99C6.47 1.99 2 6.48 2 12s4.47 10 10 10h5v-2h-5c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8v1.43c0 .79-.71 1.57-1.5 1.57s-1.5-.78-1.5-1.57V12c0-2.21-1.79-4-4-4s-4 1.79-4 4 1.79 4 4 4c.78 0 1.45.36 2 .93V19h2.08L19.5 22l1.42-1.42L12 11.66V1.99zM16 15.5c-1.08 0-2.04.43-2.75 1.14L12 18l-1.25-1.36C9.04 15.93 8.08 15.5 7 15.5c-1.49 0-2.7 1.21-2.7 2.7s1.21 2.7 2.7 2.7c1.08 0 2.04-.43 2.75-1.14L12 18l1.25 1.36c.71.71 1.67 1.14 2.75 1.14 1.49 0 2.7-1.21 2.7-2.7s-1.21-2.7-2.7-2.7z"/></svg>;
const AlertIcon = () => <svg fill="#f44336" viewBox="0 0 24 24" width="20px" height="20px" style={{ marginRight: '8px', animation: 'pulse 1.5s infinite' }}><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>;

function ChatbotInteractions({ currentUser }) {
  const [groupedInteractions, setGroupedInteractions] = useState({});
  const [sessionStatuses, setSessionStatuses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [agentInputs, setAgentInputs] = useState({});
  const prevSessionStatusesRef = useRef({});
  const chatListRefs = useRef({});

  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          // console.log('[ChatbotInteractions] Permiso para notificaciones concedido.');
        }
      });
    }
  }, []);

  const showDesktopNotification = useCallback((sessionId) => {
    if (!('Notification' in window) || Notification.permission !== 'granted' || !currentUser) return;
    if (document.hasFocus()) return;
    const notification = new Notification('Intervención Requerida', {
      body: `La sesión ${sessionId} necesita atención de un agente.`,
      tag: `session-${sessionId}`,
    });
    notification.onclick = () => {
      window.focus();
      const sessionElement = document.getElementById(`session-group-${sessionId}`);
      sessionElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      notification.close();
    };
  }, [currentUser]);
  
  useEffect(() => {
    if (!currentUser) return;
    Object.keys(sessionStatuses).forEach(sessionId => {
      const currentStatus = sessionStatuses[sessionId];
      const prevStatus = prevSessionStatusesRef.current[sessionId];
      if (currentStatus === SESSION_STATUS.NEEDS_AGENT && prevStatus !== SESSION_STATUS.NEEDS_AGENT) {
        showDesktopNotification(sessionId);
      }
    });
    prevSessionStatusesRef.current = sessionStatuses;
  }, [sessionStatuses, currentUser, showDesktopNotification]);

  const handleAgentInputChange = useCallback((sessionId, value) => {
    setAgentInputs(prev => ({ ...prev, [sessionId]: value }));
  }, []);

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

  const processAndSetGroupedInteractions = useCallback((interactionsArray, currentStatusesPassed) => {
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

    const sortedSessionEntries = Object.entries(groupedBySession).sort(([, sessionA], [, sessionB]) => sessionB.lastMessageTime - sessionA.lastMessageTime);
    const finalGroupedState = sortedSessionEntries.reduce((obj, [sessionId, sessionData]) => { obj[sessionId] = sessionData.messages; return obj; }, {});
    
    setGroupedInteractions(finalGroupedState);
    return finalGroupedState;
  }, [formatInteractionData]);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false); setGroupedInteractions({}); setSessionStatuses({}); return;
    }
    
    let isMounted = true; // Para evitar actualizaciones de estado si el componente se desmonta

    async function initialLoad() {
      try {
        if (!isMounted) return;
        setLoading(true);
        const rawData = await getChatHistory();
        if (!isMounted) return; // Comprobar de nuevo después de await
        // console.log('[ChatbotInteractions] initialLoad - Datos crudos de getChatHistory:', rawData);
        
        // Usar una copia del estado de sessionStatuses al momento de la llamada
        const currentSessionStatusesForProcessing = { ...sessionStatuses };
        const initialGroupedData = processAndSetGroupedInteractions(rawData || [], currentSessionStatusesForProcessing, true);
        
        if (initialGroupedData && Object.keys(initialGroupedData).length > 0) {
            const sessionIds = Object.keys(initialGroupedData);
            const statusesToFetch = {}; 
            let needsFetching = false;
            for (const id of sessionIds) {
              if (!sessionStatuses[id]) { // Solo obtener si no lo tenemos ya
                statusesToFetch[id] = await getSessionStatus(id);
                needsFetching = true;
              } else {
                statusesToFetch[id] = sessionStatuses[id]; // Mantener el existente
              }
            }
            if (isMounted && needsFetching) { 
                // console.log('[ChatbotInteractions] initialLoad - Fetched session statuses:', statusesToFetch);
                setSessionStatuses(prevStatuses => ({ ...prevStatuses, ...statusesToFetch }));
            }
        }
        if (isMounted) setError(null);
      } catch (err) {
        console.error("[ChatbotInteractions] initialLoad - Error:", err);
        if (isMounted) setError(err); 
        if (isMounted) setGroupedInteractions({}); 
        if (isMounted) setSessionStatuses({});
      } finally { 
        if (isMounted) setLoading(false); 
      }
    }
    initialLoad();

    const mainChannelName = `public-chat-updates-${currentUser.id.substring(0,8)}`;
    const channel = supabase.channel(mainChannelName);

    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'n8n_chat_histories' }, (payload) => {
          if (!isMounted) return;
          // console.log('[ChatbotInteractions] Suscripción Mensajes - Nueva interacción (payload.new):', payload.new);
          const newInteraction = formatInteractionData(payload.new);
          // console.log('[ChatbotInteractions] Suscripción Mensajes - newInteraction Formateada:', newInteraction);

          setGroupedInteractions(prevGrouped => {
            // Usar una copia del estado actual de sessionStatuses para pasarlo
            const currentSessionStatusesForProcessing = { ...sessionStatuses };
            let allCurrentMessages = Object.values(prevGrouped).flat();
            if (!allCurrentMessages.find(msg => msg.id === newInteraction.id)) { allCurrentMessages.push(newInteraction); }
            return processAndSetGroupedInteractions(allCurrentMessages, currentSessionStatusesForProcessing); 
          });

          setTimeout(() => { // Scroll al nuevo mensaje
            const chatListElement = chatListRefs.current[newInteraction.sessionId];
            if (chatListElement) {
              chatListElement.scrollTop = chatListElement.scrollHeight;
            }
          }, 100);
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_sessions_state' }, (payload) => {
            if (!isMounted) return;
            // console.log('[ChatbotInteractions] Suscripción Estados - Cambio de estado (payload):', payload);
            const changedSessionId = payload.new?.session_id || payload.old?.session_id;
            const newStatus = payload.new?.status;

            if ((payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') && changedSessionId && newStatus) {
                setSessionStatuses(prev => ({...prev, [changedSessionId]: newStatus}));
            } else if (payload.eventType === 'DELETE' && payload.old?.session_id) {
                setSessionStatuses(prev => { const newSt = {...prev}; delete newSt[payload.old.session_id]; return newSt; });
            }
        }
      )
      .subscribe((status, err) => { 
        if (status === 'SUBSCRIBED') {
          // console.log(`[ChatbotInteractions] Suscripción - Conectado al canal ${mainChannelName}!`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[ChatbotInteractions] Suscripción - Error en el canal:', err || status);
        }
       });

    return () => { 
      isMounted = false; // Marcar como desmontado
      supabase.removeChannel(channel); 
    };
  }, [currentUser, processAndSetGroupedInteractions, formatInteractionData, sessionStatuses]); // sessionStatuses añadido como dependencia


  const formatDisplayDate = useCallback((isoString) => {
    if (!isoString) return 'Fecha no disponible';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) { return 'Fecha inválida'; }
    return date.toLocaleString(); 
  },[]);
  
  const handleSendAgentReply = useCallback(async (sessionId) => {
    if (!currentUser) { alert('Error: No hay un agente logueado.'); return; }
    const agentActualId = currentUser.id;
    const messageContent = agentInputs[sessionId]?.trim() || '';
    if (!messageContent) { alert('Por favor, escribe un mensaje para enviar.'); return; }
    
    console.log(`[ChatbotInteractions] handleSendAgentReply: Preparando para enviar mensaje de agente para sesión ${sessionId}`);
    try {
      const result = await sendAgentMessageViaN8N({ sessionId, messageContent, agentId: agentActualId });
      if (result.success) {
        setAgentInputs(prev => ({ ...prev, [sessionId]: '' }));
        if (result.warning) alert(`Advertencia: ${result.warning}`);
        setSessionStatuses(prev => ({ ...prev, [sessionId]: SESSION_STATUS.AGENT_ACTIVE }));
      } else {
        console.error('[ChatbotInteractions] Fallo al procesar mensaje de agente:', result.errorType, result.details);
        alert(`Error al enviar mensaje: ${result.details?.message || result.errorType || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('[ChatbotInteractions] Error inesperado al enviar mensaje de agente:', error);
      alert('Un error inesperado ocurrió.');
    }
  }, [currentUser, agentInputs]);

  const handleSessionStateChange = useCallback(async (sessionId, newStatus) => {
    if (!currentUser) { alert('Error: No hay un agente logueado.'); return; }
    const agentActualId = (newStatus === SESSION_STATUS.AGENT_ACTIVE) ? currentUser.id : null;
    
    console.log(`[ChatbotInteractions] handleSessionStateChange: Sesión ${sessionId}, Nuevo Estado: ${newStatus}, Agente: ${agentActualId || 'N/A'}`);
        
    if (newStatus !== SESSION_STATUS.BOT_ACTIVE && newStatus !== SESSION_STATUS.AGENT_ACTIVE && newStatus !== SESSION_STATUS.NEEDS_AGENT) {
      alert(`Operación no permitida para el estado: ${newStatus}`);
      return;
    }

    const result = await updateSessionStatus(sessionId, newStatus, agentActualId);
    if (result) {
      setSessionStatuses(prev => ({ ...prev, [sessionId]: newStatus }));
      // alert(`Sesión ${sessionId} actualizada a ${newStatus}.`); // Opcional
    } else {
      alert(`Error al actualizar estado de la sesión ${sessionId}.`);
    }
  }, [currentUser]);

  if (!currentUser) return <div style={{textAlign: 'center', marginTop: '50px', fontSize: '1.2em'}}>Por favor, inicie sesión para acceder al dashboard.</div>;
  if (loading && Object.keys(groupedInteractions).length === 0) return <div style={{textAlign: 'center', marginTop: '50px'}}><p>Cargando interacciones...</p></div>;
  if (error) return <div style={{textAlign: 'center', marginTop: '50px', color: 'red'}}><p>Error al cargar las interacciones: {error.message}</p></div>;

  const sessionIdsInOrder = Object.keys(groupedInteractions);
  const buttonBaseStyle = { border: 'none', padding: '10px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', transition: 'background-color 0.2s ease, transform 0.1s ease', };
  const buttonHoverStyle = (e, color) => { e.currentTarget.style.backgroundColor = color; e.currentTarget.style.transform = 'scale(1.03)'; };
  const buttonLeaveStyle = (e, originalColor) => { e.currentTarget.style.backgroundColor = originalColor; e.currentTarget.style.transform = 'scale(1)'; };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
      <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '30px' }}>
        Interacciones del Chatbot <span style={{fontSize: '0.8em', color: '#555'}}>(Agente: {currentUser.email})</span>
      </h2>
      
      {sessionIdsInOrder.length > 0 ? (
        sessionIdsInOrder.map(sessionId => {
          const currentStatus = sessionStatuses[sessionId] || SESSION_STATUS.BOT_ACTIVE;
          let sessionGroupStyle = { borderWidth: '1px', borderStyle: 'solid', marginBottom: '30px', padding: '20px', borderRadius: '12px', backgroundColor: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', };
          let statusText = 'Atendido por Bot'; let statusColor = '#2196F3'; let StatusIcon = BotIcon;

          if (currentStatus === SESSION_STATUS.AGENT_ACTIVE) {
            sessionGroupStyle.borderColor = '#ff9800'; statusText = `Atendido por Agente (${currentUser.email})`; statusColor = '#ff9800'; StatusIcon = AgentIcon;
          } else if (currentStatus === SESSION_STATUS.NEEDS_AGENT) {
            sessionGroupStyle.borderColor = '#f44336'; sessionGroupStyle.backgroundColor = '#ffebee'; statusText = '¡REQUIERE ATENCIÓN URGENTE!'; statusColor = '#f44336'; StatusIcon = AlertIcon;
          }
          
          return (
            <div key={sessionId} id={`session-group-${sessionId}`} className="session-group" style={sessionGroupStyle}>
              <h3 style={{ marginTop: 0, marginBottom: '20px', color: statusColor, display: 'flex', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                <StatusIcon /> Sesión: {sessionId} <span style={{fontWeight: 'normal', marginLeft: '10px'}}>({statusText})</span>
              </h3>
              <ul ref={el => chatListRefs.current[sessionId] = el} style={{ listStyleType: 'none', padding: 0, maxHeight: '400px', overflowY: 'auto', marginBottom: '20px' }}>
                {(groupedInteractions[sessionId] || []).map((interaction) => {
                  // console.log('[DEBUG] Render - Interaction object:', interaction, 'isAgentMessage:', interaction.isAgentMessage, 'type:', interaction.type);
                  const isAgent = interaction.isAgentMessage;
                  const isUser = interaction.type === 'human' && !isAgent;
                  const messageStyle = { marginBottom: '12px', padding: '10px 15px', borderRadius: '18px', maxWidth: '75%', wordWrap: 'break-word', boxShadow: '0 1px 3px rgba(0,0,0,0.05)'};
                  if (isAgent) { Object.assign(messageStyle, { backgroundColor: '#FFECB3', marginLeft: 'auto', borderBottomRightRadius: '4px' }); } 
                  else if (isUser) { Object.assign(messageStyle, { backgroundColor: '#E3F2FD', marginRight: 'auto', borderBottomLeftRadius: '4px' }); } 
                  else { Object.assign(messageStyle, { backgroundColor: '#F1F8E9', marginRight: 'auto', borderBottomLeftRadius: '4px' }); }
                  return (
                   <li key={interaction.id} style={messageStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px', color: isAgent ? '#E65100' : (isUser ? '#0D47A1' : '#33691E'), fontWeight: 'bold' }}>
                        {isAgent ? <AgentIcon /> : isUser ? <UserIcon /> : <BotIcon />}
                        <span>
                          {isAgent ? `Agente (${currentUser.email}):` : isUser ? 'Usuario:' : 'Chatbot:'}
                        </span>
                      </div>
                      <p style={{ margin: 0, lineHeight: '1.5', color: '#333' }}>{interaction.content}</p>
                      {interaction.time && (<small style={{ fontSize: '0.7em', color: '#757575', display: 'block', textAlign: 'right', marginTop: '5px' }}>{formatDisplayDate(interaction.time)}</small>)}
                    </li>
                  );
                })}
              </ul>

              {(currentStatus === SESSION_STATUS.AGENT_ACTIVE || currentStatus === SESSION_STATUS.NEEDS_AGENT) && (
                <div className="agent-reply-form" style={{ marginTop: '15px', display: 'flex', gap: '10px', alignItems: 'stretch' }}>
                  <textarea
                    value={agentInputs[sessionId] || ''}
                    onChange={(e) => handleAgentInputChange(sessionId, e.target.value)}
                    placeholder="Escribir respuesta como agente..."
                    rows={3}
                    style={{ flexGrow: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ccc', resize: 'vertical', fontFamily: 'inherit', fontSize: '1em' }}
                    onKeyPress={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleSendAgentReply(sessionId); }}}
                  />
                  <button
                    onClick={() => handleSendAgentReply(sessionId)}
                    style={{ ...buttonBaseStyle, backgroundColor: '#007bff', color: 'white', minWidth: '100px' }}
                    onMouseEnter={(e) => buttonHoverStyle(e, '#0056b3')} onMouseLeave={(e) => buttonLeaveStyle(e, '#007bff')}
                  > Enviar </button>
                </div>
              )}

              <div className="session-controls" style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                {currentStatus === SESSION_STATUS.AGENT_ACTIVE ? (
                  <button 
                    onClick={() => {
                      console.log(`[DEBUG onClick] Devolver al Bot para sesión: ${sessionId}, estado actual: ${currentStatus}`);
                      handleSessionStateChange(sessionId, SESSION_STATUS.BOT_ACTIVE);
                    }} 
                    style={{ ...buttonBaseStyle, backgroundColor: '#5cb85c', color: 'white' }}
                    onMouseEnter={(e) => buttonHoverStyle(e, '#449d44')} onMouseLeave={(e) => buttonLeaveStyle(e, '#5cb85c')}
                  >Devolver al Bot</button>
                ) : ( (currentStatus === SESSION_STATUS.BOT_ACTIVE || currentStatus === SESSION_STATUS.NEEDS_AGENT) &&
                  <button 
                    onClick={() => {
                      console.log(`[DEBUG onClick] Tomar/Atender Chat para sesión: ${sessionId}, estado actual: ${currentStatus}`);
                      handleSessionStateChange(sessionId, SESSION_STATUS.AGENT_ACTIVE);
                    }} 
                    style={{ ...buttonBaseStyle, backgroundColor: '#f0ad4e', color: 'white' }}
                    onMouseEnter={(e) => buttonHoverStyle(e, '#ec971f')} onMouseLeave={(e) => buttonLeaveStyle(e, '#f0ad4e')}
                  >
                    {currentStatus === SESSION_STATUS.NEEDS_AGENT ? 'Atender Requerimiento' : 'Tomar Chat'}
                  </button>
                )}
              </div>
            </div>
          );
        })
      ) : (
        <p style={{textAlign: 'center', fontSize: '1.1em', color: '#777'}}>No hay interacciones para mostrar.</p>
      )}
      <style jsx global>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default ChatbotInteractions;