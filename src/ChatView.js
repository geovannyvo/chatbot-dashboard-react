// src/ChatView.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    sendAgentMessageViaN8N,
    updateSessionStatus,
    blockSession,
    unblockSession,
    saveToKnowledgeBase // <-- AÑADIDO
} from './supabaseClient';

// Constantes y Colores
const SESSION_STATUS = { BOT_ACTIVE: 'bot_active', AGENT_ACTIVE: 'agent_active', NEEDS_AGENT: 'needs_agent', BLOCKED: 'blocked' };
const colors = {
    bgMain: '#111b21', bgSec: '#202c33', border: '#374045',
    textPrimary: '#e9edef', textSec: '#8696a0',
    bubbleUser: '#202c33', bubbleAgent: '#005c4b',
    accent: '#00a884', alert: '#f44336', orange: '#ff9800',
    blue: '#2196F3', grey: '#757575',
    btnRed: '#d9534f', btnGreen: '#5cb85c', btnYellow: '#f0ad4e',
    btnBlue: '#337ab7', btnSend: '#00a884',
};

// Iconos
const BotIcon = () => <span className="BotIcon"><svg viewBox="0 0 24 24" width="20px" height="20px" style={{ marginRight: '8px'}}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2.5-8.5h5v1h-5zm-1.5 2.5h8V16h-8zM9 9c.83 0 1.5.67 1.5 1.5S9.83 12 9 12s-1.5-.67-1.5-1.5S8.17 9 9 9zm6 0c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5z"/></svg></span>;
const UserIcon = () => <span className="UserIcon"><svg viewBox="0 0 24 24" width="20px" height="20px" style={{ marginRight: '8px'}}><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></span>;
const AgentIcon = () => <span className="AgentIcon"><svg viewBox="0 0 24 24" width="20px" height="20px" style={{ marginRight: '8px'}}><path d="M12 1.99C6.47 1.99 2 6.48 2 12s4.47 10 10 10h5v-2h-5c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8v1.43c0 .79-.71 1.57-1.5 1.57s-1.5-.78-1.5-1.57V12c0-2.21-1.79-4-4-4s-4 1.79-4 4 1.79 4 4 4c.78 0 1.45.36 2 .93V19h2.08L19.5 22l1.42-1.42L12 11.66V1.99zM16 15.5c-1.08 0-2.04.43-2.75 1.14L12 18l-1.25-1.36C9.04 15.93 8.08 15.5 7 15.5c-1.49 0-2.7 1.21-2.7 2.7s1.21 2.7 2.7 2.7c1.08 0 2.04-.43 2.75-1.14L12 18l1.25 1.36c.71.71 1.67 1.14 2.75 1.14 1.49 0 2.7-1.21 2.7-2.7s-1.21-2.7-2.7-2.7z"/></svg></span>;
const BlockIcon = () => <span className="BlockIcon"><svg viewBox="0 0 24 24" width="20px" height="20px" style={{ marginRight: '8px'}}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13H7v-2h10v2z"/></svg></span>;
const SaveKBIcon = ({ onClick, saved }) => ( // <-- Icono Guardar KB
    <svg
        onClick={onClick}
        fill={saved ? colors.accent : colors.textSec}
        viewBox="0 0 24 24" width="18px" height="18px"
        style={{
            cursor: 'pointer', opacity: saved ? 1 : 0.6,
            transition: 'opacity 0.2s, fill 0.2s', marginLeft: '8px', flexShrink: 0
        }}
        title="Guardar como Pregunta/Respuesta en Base de Conocimiento"
    >
        <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
    </svg>
);

function ChatView({ sessionId, messages, currentSessionStatus, currentUser, setSessionStatuses }) {
  const [agentInput, setAgentInput] = useState('');
  const [savedMessages, setSavedMessages] = useState({}); // <-- Estado para KB
  const messagesEndRef = useRef(null);
  const isBlocked = currentSessionStatus === SESSION_STATUS.BLOCKED;

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
  useEffect(scrollToBottom, [messages]);

  const formatDisplayDate = useCallback((isoString) => {
      if (!isoString) return ''; const date = new Date(isoString);
      return isNaN(date.getTime()) ? '' : date.toLocaleString();
  }, []);

  const handleSendReply = async () => { /* ... (Sin cambios) ... */
    if (!currentUser || !sessionId || isBlocked || !agentInput.trim()) return;
    const messageContent = agentInput.trim();
    setAgentInput('');
    const result = await sendAgentMessageViaN8N({ sessionId, messageContent, agentId: currentUser.id });
    if (result.success) { setSessionStatuses(prev => ({ ...prev, [sessionId]: SESSION_STATUS.AGENT_ACTIVE })); }
    else { alert(`Error al enviar mensaje.`); }
  };
  const handleChangeSessionState = async (newStatus) => { /* ... (Sin cambios) ... */
    if (!currentUser || !sessionId || isBlocked) return;
    const agentActualId = (newStatus === SESSION_STATUS.AGENT_ACTIVE) ? currentUser.id : null;
    const result = await updateSessionStatus(sessionId, newStatus, agentActualId);
    if (result) { setSessionStatuses(prev => ({ ...prev, [sessionId]: newStatus })); }
    else { alert(`Error al actualizar estado.`); }
  };
  const handleBlockSession = async () => { /* ... (Sin cambios) ... */
    if (!currentUser || !sessionId) return;
    if (window.confirm("¿Seguro que quieres bloquear a este usuario?")) {
        const success = await blockSession(sessionId, currentUser.id);
        if (success) { setSessionStatuses(prev => ({ ...prev, [sessionId]: SESSION_STATUS.BLOCKED })); }
        else { alert("Error al bloquear."); }
    }
  };
  const handleUnblockSession = async () => { /* ... (Sin cambios) ... */
      if (!currentUser || !sessionId) return;
      const success = await unblockSession(sessionId);
      if (success) { setSessionStatuses(prev => ({ ...prev, [sessionId]: SESSION_STATUS.BOT_ACTIVE })); }
      else { alert("Error al desbloquear."); }
  };

  // --- NUEVA FUNCIÓN PARA GUARDAR EN KB ---
  const handleSaveToKB = async (answerMessage, messageIndex) => {
    if (!currentUser || !answerMessage || messageIndex === 0 || savedMessages[answerMessage.id]) return;

    let questionMessage = null;
    for (let i = messageIndex - 1; i >= 0; i--) {
        if (messages[i].type === 'human' && !messages[i].isAgentMessage) {
            questionMessage = messages[i];
            break;
        }
    }

    if (!questionMessage) {
      alert("No se encontró un mensaje de usuario anterior para usar como pregunta.");
      return;
    }

    const confirmSave = window.confirm(
      `¿Guardar en Base de Conocimiento?\n\nPregunta: ${questionMessage.content}\n\nRespuesta: ${answerMessage.content}`
    );

    if (!confirmSave) return;

    const success = await saveToKnowledgeBase(
      questionMessage.content, answerMessage.content,
      currentUser.id, answerMessage.id, sessionId
    );

    if (success) {
      alert("¡Guardado en la Base de Conocimiento!");
      setSavedMessages(prev => ({ ...prev, [answerMessage.id]: true }));
    } else {
      alert("Error al guardar en la Base de Conocimiento.");
    }
  };
  // --- FIN NUEVA FUNCIÓN ---

  const buttonBaseStyle = { border: 'none', padding: '8px 20px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', transition: 'filter 0.2s ease, transform 0.1s ease', color: 'white' };
  const buttonHoverStyle = (e) => { e.currentTarget.style.filter = 'brightness(1.2)'; };
  const buttonLeaveStyle = (e) => { e.currentTarget.style.filter = 'brightness(1)'; };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: colors.bgMain }}>
      <div style={{ padding: '10px 20px', backgroundColor: colors.bgSec, borderBottom: `1px solid ${colors.border}` }}>
        <h3 style={{ margin: 0, color: colors.textPrimary, fontWeight: 500 }}>
          {sessionId ? sessionId.substring(0, 12) + '...' : 'Conversación'}
          {isBlocked && <span style={{ color: colors.alert, marginLeft: '10px', fontWeight: 'bold' }}>(BLOQUEADO)</span>}
        </h3>
      </div>

      {isBlocked && (
          <div style={{ padding: '15px', backgroundColor: '#4a3232', color: colors.alert, textAlign: 'center', borderRadius: '4px', margin: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BlockIcon /> <span style={{marginLeft: '5px'}}>Este usuario está bloqueado.</span>
          </div>
      )}

      <ul style={{ listStyleType: 'none', padding: '20px', flexGrow: 1, overflowY: 'auto', marginBottom: 0, backgroundColor: colors.bgMain }}>
        {(messages || []).map((interaction, index) => { // <-- Añadido 'index'
          const isAgent = interaction.isAgentMessage;
          const isUser = interaction.type === 'human' && !isAgent;
          const messageStyle = { marginBottom: '12px', padding: '8px 12px', borderRadius: '8px', maxWidth: '75%', wordWrap: 'break-word', boxShadow: '0 1px 1px rgba(0,0,0,0.2)', color: colors.textPrimary, lineHeight: '1.5', position: 'relative'}; // Añadido position relative
          if (isAgent) { Object.assign(messageStyle, { backgroundColor: colors.bubbleAgent, marginLeft: 'auto', borderBottomRightRadius: '0px' }); }
          else if (isUser) { Object.assign(messageStyle, { backgroundColor: colors.bubbleUser, marginRight: 'auto', borderBottomLeftRadius: '0px' }); }
          else { Object.assign(messageStyle, { backgroundColor: colors.bgSec, marginRight: 'auto', borderBottomLeftRadius: '0px', fontStyle: 'italic', opacity: 0.8 }); }
          return (
            <li key={interaction.id} style={messageStyle}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px', fontWeight: 'bold', fontSize: '0.8em', color: isAgent ? colors.accent : colors.textSec }}>
                 {isAgent ? <AgentIcon /> : isUser ? <UserIcon /> : <BotIcon />}
                <span>{isAgent ? `Agente:` : isUser ? 'Usuario:' : 'Chatbot:'}</span>
              </div>
              <p style={{ margin: 0, paddingRight: isAgent ? '25px' : '0' /* Espacio para el botón */ }}>{interaction.content}</p> {/* Contenido del mensaje */}
              {interaction.time && (<small style={{ fontSize: '0.7em', color: colors.textSec, display: 'block', textAlign: 'right', marginTop: '5px', opacity: 0.8 }}>{formatDisplayDate(interaction.time)}</small>)}

              {/* --- AÑADIR EL BOTÓN DE GUARDAR SI ES AGENTE --- */}
              {isAgent && !isBlocked && (
                  <div style={{ position: 'absolute', right: '5px', top: '5px' }}>
                    <SaveKBIcon
                        onClick={(e) => {
                            e.stopPropagation();
                            handleSaveToKB(interaction, index);
                        }}
                        saved={savedMessages[interaction.id] || false}
                    />
                  </div>
              )}
              {/* --- FIN BOTÓN GUARDAR --- */}
            </li>
          );
        })}
        <div ref={messagesEndRef} />
      </ul>

      <div style={{ padding: '15px', borderTop: `1px solid ${colors.border}`, backgroundColor: colors.bgMain }}>
          {!isBlocked && (currentSessionStatus === SESSION_STATUS.AGENT_ACTIVE || currentSessionStatus === SESSION_STATUS.NEEDS_AGENT) && (
            <div className="agent-reply-form" style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px' }}>
              <textarea value={agentInput} onChange={(e) => setAgentInput(e.target.value)}
                placeholder="Escribe tu respuesta..." rows={2} style={{ flexGrow: 1 }}
                onKeyPress={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleSendReply(); } }}
              />
              <button onClick={handleSendReply}
                style={{ ...buttonBaseStyle, backgroundColor: colors.btnSend, padding: '10px 25px' }}
                onMouseEnter={buttonHoverStyle} onMouseLeave={(e) => buttonLeaveStyle(e, colors.btnSend)}
              > Enviar </button>
            </div>
          )}
          <div className="session-controls" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              {!isBlocked ? (
                  <>
                      {currentSessionStatus === SESSION_STATUS.AGENT_ACTIVE ? (
                          <button onClick={() => handleChangeSessionState(SESSION_STATUS.BOT_ACTIVE)} style={{ ...buttonBaseStyle, backgroundColor: colors.btnGreen }}
                              onMouseEnter={buttonHoverStyle} onMouseLeave={(e) => buttonLeaveStyle(e, colors.btnGreen)}
                          >Devolver al Bot</button>
                      ) : ( (currentSessionStatus === SESSION_STATUS.BOT_ACTIVE || currentSessionStatus === SESSION_STATUS.NEEDS_AGENT) &&
                          <button onClick={() => handleChangeSessionState(SESSION_STATUS.AGENT_ACTIVE)} style={{ ...buttonBaseStyle, backgroundColor: colors.btnYellow }}
                              onMouseEnter={buttonHoverStyle} onMouseLeave={(e) => buttonLeaveStyle(e, colors.btnYellow)}
                          >{currentSessionStatus === SESSION_STATUS.NEEDS_AGENT ? 'Atender' : 'Tomar Chat'}</button>
                      )}
                      <button onClick={handleBlockSession} style={{ ...buttonBaseStyle, backgroundColor: colors.btnRed }}
                          onMouseEnter={buttonHoverStyle} onMouseLeave={(e) => buttonLeaveStyle(e, colors.btnRed)}
                      >Bloquear</button>
                  </>
              ) : (
                  <>
                      <button onClick={handleUnblockSession} style={{ ...buttonBaseStyle, backgroundColor: colors.btnBlue }}
                          onMouseEnter={buttonHoverStyle} onMouseLeave={(e) => buttonLeaveStyle(e, colors.btnBlue)}
                      >Desbloquear</button>
                  </>
              )}
          </div>
      </div>
    </div>
  );
}

export default ChatView;