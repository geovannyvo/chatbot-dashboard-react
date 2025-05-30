// src/ChatView.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    sendAgentMessageViaN8N,
    updateSessionStatus,
    blockSession,
    unblockSession,
    saveToKnowledgeBase
} from './supabaseClient'; // Asumiendo que está en src/

const SESSION_STATUS = {
    BOT_ACTIVE: 'bot_active',
    AGENT_ACTIVE: 'agent_active',
    NEEDS_AGENT: 'needs_agent',
    BLOCKED: 'blocked',
    ARCHIVED: 'archived'
};

// Reutiliza tus variables CSS o define colores aquí si es necesario
const colors = {
    bgMain: 'var(--wa-dark-bg-main, #111b21)',
    bgSec: 'var(--wa-dark-bg-sec, #202c33)',
    border: 'var(--wa-dark-border, #374045)',
    textPrimary: 'var(--wa-dark-text-primary, #e9edef)',
    textSec: 'var(--wa-dark-text-sec, #8696a0)',
    bubbleUser: 'var(--wa-dark-bubble-user, #202c33)',
    bubbleAgent: 'var(--wa-dark-bubble-agent, #005c4b)',
    accent: 'var(--wa-dark-accent, #00a884)',
    alert: 'var(--wa-dark-alert, #f44336)',
    btnRed: 'var(--wa-dark-button-red, #d9534f)',
    btnGreen: 'var(--wa-dark-button-green, #5cb85c)',
    btnYellow: 'var(--wa-dark-button-yellow, #f0ad4e)',
    btnBlue: 'var(--wa-dark-button-blue, #337ab7)',
    btnSend: 'var(--wa-dark-button-send, #00a884)',
};

// Iconos (Asegúrate de que las clases CSS o estilos directos funcionen para los colores)
const BotIcon = () => <span className="BotIcon"><svg viewBox="0 0 24 24" width="20px" height="20px" style={{ marginRight: '8px'}}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2.5-8.5h5v1h-5zm-1.5 2.5h8V16h-8zM9 9c.83 0 1.5.67 1.5 1.5S9.83 12 9 12s-1.5-.67-1.5-1.5S8.17 9 9 9zm6 0c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5z"/></svg></span>;
const UserIcon = () => <span className="UserIcon"><svg viewBox="0 0 24 24" width="20px" height="20px" style={{ marginRight: '8px'}}><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></span>;
const AgentIcon = () => <span className="AgentIcon"><svg viewBox="0 0 24 24" width="20px" height="20px" style={{ marginRight: '8px'}}><path d="M12 1.99C6.47 1.99 2 6.48 2 12s4.47 10 10 10h5v-2h-5c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8v1.43c0 .79-.71 1.57-1.5 1.57s-1.5-.78-1.5-1.57V12c0-2.21-1.79-4-4-4s-4 1.79-4 4 1.79 4 4 4c.78 0 1.45.36 2 .93V19h2.08L19.5 22l1.42-1.42L12 11.66V1.99zM16 15.5c-1.08 0-2.04.43-2.75 1.14L12 18l-1.25-1.36C9.04 15.93 8.08 15.5 7 15.5c-1.49 0-2.7 1.21-2.7 2.7s1.21 2.7 2.7 2.7c1.08 0 2.04-.43 2.75-1.14L12 18l1.25 1.36c.71.71 1.67 1.14 2.75 1.14 1.49 0 2.7-1.21 2.7-2.7s-1.21-2.7-2.7-2.7z"/></svg></span>;
const BlockIcon = () => <span className="BlockIcon"><svg viewBox="0 0 24 24" width="20px" height="20px" style={{ marginRight: '8px'}}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13H7v-2h10v2z"/></svg></span>;
const ArchiveIcon = () => <span className="ArchiveIcon"><svg fill={colors.textSec} viewBox="0 0 24 24" width="20px" height="20px" style={{ marginRight: '8px'}}><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/></svg></span>;
const SaveKBIcon = ({ onClick, saved }) => (
    <svg onClick={onClick} fill={saved ? colors.accent : colors.textSec} viewBox="0 0 24 24" width="18px" height="18px"
        style={{ cursor: 'pointer', opacity: saved ? 1 : 0.6, transition: 'opacity 0.2s, fill 0.2s', marginLeft: '8px', flexShrink: 0 }}
        title="Guardar como Pregunta/Respuesta en Base de Conocimiento">
        <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
    </svg>
);

function ChatView({ sessionId, messages, currentSessionStatus, currentUser, setSessionStatuses }) {
  const [agentInput, setAgentInput] = useState('');
  const [savedMessages, setSavedMessages] = useState({}); // Para el feedback del icono de Guardar en KB
  const messagesEndRef = useRef(null);

  const isBlocked = currentSessionStatus === SESSION_STATUS.BLOCKED;
  const isArchived = currentSessionStatus === SESSION_STATUS.ARCHIVED;

  // --- CONSOLE.LOG SUGERIDO 1: useEffect para rastrear cambios en currentSessionStatus ---
  useEffect(() => {
      console.log(`[ChatView] PROP currentSessionStatus CAMBIÓ a: '${currentSessionStatus}' para sessionId: ${sessionId}`);
  }, [currentSessionStatus, sessionId]);

  // Scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Limpiar input cuando cambia la sesión
  useEffect(() => {
    setAgentInput('');
    setSavedMessages({}); // Resetear feedback de guardado en KB al cambiar de chat
  }, [sessionId]);

  const formatDisplayDate = useCallback((isoString) => {
      if (!isoString) return ''; const date = new Date(isoString);
      return isNaN(date.getTime()) ? '' : date.toLocaleString();
  }, []);

  const handleSendReply = async () => {
    if (!currentUser || !currentUser.id || !sessionId || isBlocked || isArchived || !agentInput.trim()) return;
    const messageContent = agentInput.trim();
    setAgentInput(''); // Limpiar input inmediatamente

    const result = await sendAgentMessageViaN8N({ sessionId, messageContent, agentId: currentUser.id });

    if (result.success) {
      // El mensaje aparecerá vía suscripción. Opcionalmente, actualizar estado local si la suscripción es lenta.
      // Si el estado actual no es 'agent_active', lo cambiamos.
      if (currentSessionStatus !== SESSION_STATUS.AGENT_ACTIVE && setSessionStatuses) {
        setSessionStatuses(prev => ({ ...prev, [sessionId]: { ...(prev[sessionId] || {}), status: SESSION_STATUS.AGENT_ACTIVE, agent_id: currentUser.id } }));
      }
    } else {
      alert(`Error al enviar mensaje: ${result.details?.message || result.errorType || 'Error desconocido.'}`);
    }
  };

  const handleChangeSessionState = async (newStatus) => {
    if (!currentUser || !currentUser.id || !sessionId) {
      console.error("[ChatView] handleChangeSessionState: Faltan currentUser, currentUser.id o sessionId.", {currentUser, sessionId});
      alert('Error: No se pudo identificar al usuario o la sesión.');
      return;
    }
    // No permitir cambios de estado si está bloqueado o archivado (estas acciones se manejan diferente)
    if (isBlocked || isArchived) {
        console.log("[ChatView] handleChangeSessionState: Acción no permitida en estado", currentSessionStatus);
        return;
    }

    const agentActualId = (newStatus === SESSION_STATUS.AGENT_ACTIVE) ? currentUser.id : null;
    
    console.log(`[ChatView] handleChangeSessionState: Intentando cambiar sesión ${sessionId} a ${newStatus} por agente ${agentActualId || 'NADIE (bot)'}.`);
    
    // Actualización optimista de UI
    if (setSessionStatuses) {
      setSessionStatuses(prev => ({
        ...prev,
        [sessionId]: { ...(prev[sessionId] || {}), status: newStatus, agent_id: agentActualId }
      }));
    } else {
      console.warn("[ChatView] handleChangeSessionState: setSessionStatuses no fue pasado como prop.");
    }

    const success = await updateSessionStatus(sessionId, newStatus, agentActualId);
    
    if (success) {
      console.log(`[ChatView] handleChangeSessionState: Estado de sesión ${sessionId} actualizado en DB a ${newStatus}.`);
    } else {
      console.error(`[ChatView] handleChangeSessionState: FALLO al actualizar estado de sesión ${sessionId} a ${newStatus} en la DB.`);
      alert(`Error al intentar cambiar el estado del chat. Revisa la consola.`);
      // Revertir el cambio de estado local si falló la DB (si es necesario, pero la suscripción debería corregirlo)
      // if (setSessionStatuses) {
      //    setSessionStatuses(prev => ({ ...prev, [sessionId]: { ...(prev[sessionId] || {}), status: currentSessionStatus, agent_id: currentUser.id } }));
      // }
    }
  };

  const handleBlockSession = async () => {
    if (!currentUser || !currentUser.id || !sessionId || isArchived) return; // No bloquear si está archivado
    if (window.confirm("¿Estás seguro de que quieres bloquear a este usuario? No recibirás más mensajes de él.")) {
        console.log(`[ChatView] handleBlockSession: Bloqueando sesión ${sessionId}`);
        if (setSessionStatuses) {
            setSessionStatuses(prev => ({ ...prev, [sessionId]: { ...(prev[sessionId] || {}), status: SESSION_STATUS.BLOCKED, agent_id: currentUser.id } }));
        }
        const success = await blockSession(sessionId, currentUser.id);
        if (!success) {
            alert("Error al bloquear la sesión. Revisa la consola.");
            if (setSessionStatuses) { // Revertir si falla
                setSessionStatuses(prev => ({ ...prev, [sessionId]: { ...(prev[sessionId] || {}), status: currentSessionStatus } }));
            }
        } else {
            alert("Usuario bloqueado.");
        }
    }
  };

  const handleUnblockSession = async () => {
      console.log("[ChatView] handleUnblockSession INVOCADA para sessionId:", sessionId);
      if (!currentUser || !currentUser.id || !sessionId || isArchived) {
          console.error("[ChatView] handleUnblockSession: Precondiciones no cumplidas.", {currentUser, sessionId, isArchived});
          return;
      }
      
      if (setSessionStatuses) {
          setSessionStatuses(prev => ({ ...prev, [sessionId]: { ...(prev[sessionId] || {}), status: SESSION_STATUS.BOT_ACTIVE, agent_id: null } }));
          console.log("[ChatView] handleUnblockSession: Estado local tentativamente actualizado a BOT_ACTIVE.");
      }
      
      const success = await unblockSession(sessionId);
      
      if (success) {
          console.log(`[ChatView] handleUnblockSession: Sesión ${sessionId} desbloqueada exitosamente en DB.`);
          alert("Usuario desbloqueado. El chat volverá al bot.");
      } else {
          console.error(`[ChatView] handleUnblockSession: FALLO al desbloquear sesión ${sessionId} en la DB.`);
          alert("Error al intentar desbloquear al usuario. Revisa la consola.");
          if (setSessionStatuses) { // Revertir si falla
              setSessionStatuses(prev => ({ ...prev, [sessionId]: { ...(prev[sessionId] || {}), status: SESSION_STATUS.BLOCKED } }));
          }
      }
  };

  const handleSaveToKB = async (answerMessage, messageIndex) => {
    if (!currentUser || !currentUser.id || !answerMessage || messageIndex === 0 || savedMessages[answerMessage.id] || isArchived || isBlocked) return;
    let questionMessage = null;
    for (let i = messageIndex - 1; i >= 0; i--) {
        if (messages[i].type === 'human' && !messages[i].isAgentMessage) { questionMessage = messages[i]; break; }
    }
    if (!questionMessage) { alert("No se encontró un mensaje de usuario anterior para usar como pregunta."); return; }
    if (window.confirm(`¿Guardar en Base de Conocimiento?\n\nPregunta: ${questionMessage.content}\n\nRespuesta: ${answerMessage.content}`)) {
        const success = await saveToKnowledgeBase(questionMessage.content, answerMessage.content, currentUser.id, answerMessage.id, sessionId);
        if (success) { alert("¡Guardado en la Base de Conocimiento!"); setSavedMessages(prev => ({ ...prev, [answerMessage.id]: true })); }
        else { alert("Error al guardar en la Base de Conocimiento."); }
    }
  };

  const buttonBaseStyle = { border: 'none', padding: '8px 20px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', transition: 'filter 0.2s ease, transform 0.1s ease', color: 'white' };
  const buttonHoverStyle = (e) => { e.currentTarget.style.filter = 'brightness(1.2)'; };
  const buttonLeaveStyle = (e) => { e.currentTarget.style.filter = 'brightness(1)'; };

  // --- CONSOLE.LOG SUGERIDO 2: Log antes del return para ver estado en cada render ---
  console.log(`[ChatView] DETALLES RENDER para sesión ${sessionId}: currentStatus: '${currentSessionStatus}', isBlocked: ${isBlocked}, isArchived: ${isArchived}`);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--wa-dark-bg-main)' }}>
      <div style={{ padding: '10px 20px', backgroundColor: 'var(--wa-dark-bg-sec)', borderBottom: `1px solid ${colors.border}` }}>
        <h3 style={{ margin: 0, color: colors.textPrimary, fontWeight: 500 }}>
          {sessionId ? `Chat: ${sessionId.substring(0, 8)}...` : 'Conversación'}
          {isBlocked && <span style={{ color: colors.alert, marginLeft: '10px', fontWeight: 'bold' }}>(BLOQUEADO)</span>}
          {isArchived && <span style={{ color: colors.textSec, marginLeft: '10px', fontWeight: 'normal', fontSize: '0.9em' }}>(ARCHIVADO)</span>}
        </h3>
      </div>

      {isBlocked && ( <div style={{ padding: '15px', backgroundColor: '#4a3232', color: colors.alert, textAlign: 'center', borderRadius: '4px', margin: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}> <BlockIcon /> <span style={{marginLeft: '5px'}}>Este usuario está bloqueado.</span> </div> )}
      {isArchived && !isBlocked && ( <div style={{ padding: '15px', backgroundColor: colors.bgSec, color: colors.textSec, textAlign: 'center', borderRadius: '4px', margin: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}> <ArchiveIcon /> <span style={{marginLeft: '5px'}}>Este chat está archivado.</span> </div> )}

      <ul style={{ listStyleType: 'none', padding: '20px', flexGrow: 1, overflowY: 'auto', marginBottom: 0, backgroundColor: 'var(--wa-dark-bg-main)' }}>
        {(messages || []).map((interaction, index) => {
          const isAgent = interaction.isAgentMessage;
          const isUser = interaction.type === 'human' && !isAgent;
          const messageStyle = { marginBottom: '12px', padding: '8px 12px', borderRadius: '8px', maxWidth: '75%', wordWrap: 'break-word', boxShadow: '0 1px 1px rgba(0,0,0,0.2)', color: colors.textPrimary, lineHeight: '1.5', position: 'relative'};
          if (isAgent) { Object.assign(messageStyle, { backgroundColor: colors.bubbleAgent, marginLeft: 'auto', borderBottomRightRadius: '0px' }); }
          else if (isUser) { Object.assign(messageStyle, { backgroundColor: colors.bubbleUser, marginRight: 'auto', borderBottomLeftRadius: '0px' }); }
          else { Object.assign(messageStyle, { backgroundColor: colors.bgSec, marginRight: 'auto', borderBottomLeftRadius: '0px', fontStyle: 'italic', opacity: 0.8 }); }
          return (
            <li key={interaction.id} style={messageStyle}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.8em', color: isAgent ? colors.accent : colors.textSec }}>
                 {isAgent ? <AgentIcon /> : isUser ? <UserIcon /> : <BotIcon />}
                <span>{isAgent ? `Agente:` : isUser ? 'Usuario:' : 'Chatbot:'}</span>
              </div>
              <p style={{ margin: 0, paddingRight: isAgent && !isBlocked && !isArchived ? '25px' : '0' }}>{interaction.content}</p>
              {interaction.time && (<small style={{ fontSize: '0.7em', color: colors.textSec, display: 'block', textAlign: 'right', marginTop: '5px', opacity: 0.8 }}>{formatDisplayDate(interaction.time)}</small>)}
              {isAgent && !isBlocked && !isArchived && (
                  <div style={{ position: 'absolute', right: '5px', top: '5px' }}>
                    <SaveKBIcon onClick={(e) => { e.stopPropagation(); handleSaveToKB(interaction, index); }}
                        saved={savedMessages[interaction.id] || false} />
                  </div>
              )}
            </li>
          );
        })}
        <div ref={messagesEndRef} />
      </ul>

      <div style={{ padding: '15px', borderTop: `1px solid ${colors.border}`, backgroundColor: colors.bgMain }}>
          {!isBlocked && !isArchived && (currentSessionStatus === SESSION_STATUS.AGENT_ACTIVE || currentSessionStatus === SESSION_STATUS.NEEDS_AGENT) && (
            <div className="agent-reply-form" style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px' }}>
              <textarea value={agentInput} onChange={(e) => setAgentInput(e.target.value)}
                placeholder="Escribe tu respuesta..." rows={2} style={{ flexGrow: 1 }}
                onKeyPress={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleSendReply(); } }} />
              <button onClick={handleSendReply} style={{ ...buttonBaseStyle, backgroundColor: colors.btnSend, padding: '10px 25px' }}
                onMouseEnter={buttonHoverStyle} onMouseLeave={(e) => buttonLeaveStyle(e, colors.btnSend)}> Enviar </button>
            </div>
          )}
          <div className="session-controls" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              {!isBlocked && !isArchived ? (
                  <>
                      {currentSessionStatus === SESSION_STATUS.AGENT_ACTIVE ? (
                          <button onClick={() => handleChangeSessionState(SESSION_STATUS.BOT_ACTIVE)} style={{ ...buttonBaseStyle, backgroundColor: colors.btnGreen }}
                              onMouseEnter={buttonHoverStyle} onMouseLeave={(e) => buttonLeaveStyle(e, colors.btnGreen)}>Devolver al Bot</button>
                      ) : ( (currentSessionStatus === SESSION_STATUS.BOT_ACTIVE || currentSessionStatus === SESSION_STATUS.NEEDS_AGENT) &&
                          <button onClick={() => handleChangeSessionState(SESSION_STATUS.AGENT_ACTIVE)} style={{ ...buttonBaseStyle, backgroundColor: colors.btnYellow }}
                              onMouseEnter={buttonHoverStyle} onMouseLeave={(e) => buttonLeaveStyle(e, colors.btnYellow)}
                          >{currentSessionStatus === SESSION_STATUS.NEEDS_AGENT ? 'Atender' : 'Tomar Chat'}</button>
                      )}
                      <button onClick={handleBlockSession} style={{ ...buttonBaseStyle, backgroundColor: colors.btnRed }}
                          onMouseEnter={buttonHoverStyle} onMouseLeave={(e) => buttonLeaveStyle(e, colors.btnRed)}>Bloquear</button>
                  </>
              ) : ( isBlocked && !isArchived && // Solo mostrar Desbloquear si está Bloqueado Y NO Archivado
                  <button onClick={handleUnblockSession} style={{ ...buttonBaseStyle, backgroundColor: colors.btnBlue }}
                      onMouseEnter={buttonHoverStyle} onMouseLeave={(e) => buttonLeaveStyle(e, colors.btnBlue)}>Desbloquear Usuario</button>
              )}
              {/* Si el chat está archivado, no se muestran controles de estado/bloqueo aquí usualmente */}
          </div>
      </div>
    </div>
  );
}

export default ChatView;