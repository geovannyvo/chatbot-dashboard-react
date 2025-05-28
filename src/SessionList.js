// src/SessionList.js
import React from 'react';

// Constantes y Colores
const SESSION_STATUS = { BOT_ACTIVE: 'bot_active', AGENT_ACTIVE: 'agent_active', NEEDS_AGENT: 'needs_agent', BLOCKED: 'blocked' };
const colors = {
    bgMain: '#111b21',
    bgHover: '#2a3942',
    bgSelected: '#2a3942',
    border: '#374045',
    textPrimary: '#e9edef',
    textSec: '#8696a0',
    accent: '#00a884',
    alert: '#f44336',
    orange: '#ff9800',
    blue: '#2196F3',
    grey: '#757575',
};

// Iconos (Usarán el fill global de App.css o clases específicas)
const BotIconMini = () => <span className="BotIconMini"><svg viewBox="0 0 24 24" width="16px" height="16px" style={{ marginRight: '5px', flexShrink: 0 }}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2.5-8.5h5v1h-5zm-1.5 2.5h8V16h-8zM9 9c.83 0 1.5.67 1.5 1.5S9.83 12 9 12s-1.5-.67-1.5-1.5S8.17 9 9 9zm6 0c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5z"/></svg></span>;
const AgentIconMini = () => <span className="AgentIconMini"><svg viewBox="0 0 24 24" width="16px" height="16px" style={{ marginRight: '5px', flexShrink: 0 }}><path d="M12 1.99C6.47 1.99 2 6.48 2 12s4.47 10 10 10h5v-2h-5c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8v1.43c0 .79-.71 1.57-1.5 1.57s-1.5-.78-1.5-1.57V12c0-2.21-1.79-4-4-4s-4 1.79-4 4 1.79 4 4 4c.78 0 1.45.36 2 .93V19h2.08L19.5 22l1.42-1.42L12 11.66V1.99zM16 15.5c-1.08 0-2.04.43-2.75 1.14L12 18l-1.25-1.36C9.04 15.93 8.08 15.5 7 15.5c-1.49 0-2.7 1.21-2.7 2.7s1.21 2.7 2.7 2.7c1.08 0 2.04-.43 2.75-1.14L12 18l1.25 1.36c.71.71 1.67 1.14 2.75 1.14 1.49 0 2.7-1.21 2.7-2.7s-1.21-2.7-2.7-2.7z"/></svg></span>;
const AlertIconMini = () => <span className="AlertIconMini"><svg viewBox="0 0 24 24" width="16px" height="16px" style={{ marginRight: '5px', flexShrink: 0 }}><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg></span>;
const BlockIconMini = () => <span className="BlockIconMini"><svg viewBox="0 0 24 24" width="16px" height="16px" style={{ marginRight: '5px', flexShrink: 0 }}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13H7v-2h10v2z"/></svg></span>;

const UnreadBadge = ({ count }) => (
  <span style={{
    backgroundColor: colors.accent, color: 'white', borderRadius: '12px',
    padding: '2px 8px', fontSize: '0.75em', fontWeight: 'bold',
    minWidth: '24px', textAlign: 'center', display: 'inline-block',
    lineHeight: '1.5', marginLeft: 'auto', flexShrink: 0,
  }}>{count}</span>
);

function SessionList({ groupedInteractions, sessionStatuses, onSelectSession, selectedSessionId, unreadCounts }) {
  if (Object.keys(groupedInteractions).length === 0) {
    return <p style={{ padding: '10px', color: colors.textSec }}>No hay sesiones activas.</p>;
  }
  const orderedSessionIds = Object.keys(groupedInteractions);

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {orderedSessionIds.map(sessionId => {
        const messages = groupedInteractions[sessionId] || [];
        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
        const status = sessionStatuses[sessionId] || SESSION_STATUS.BOT_ACTIVE;
        const isSelected = sessionId === selectedSessionId;
        const unreadCount = unreadCounts[sessionId] || 0;
        const isBlocked = status === SESSION_STATUS.BLOCKED;

        let itemStyle = {
          padding: '12px 15px', borderBottom: `1px solid ${colors.border}`,
          cursor: isBlocked ? 'default' : 'pointer',
          backgroundColor: isSelected ? colors.bgSelected : colors.bgMain,
          transition: 'background-color 0.2s ease', opacity: isBlocked ? 0.6 : 1,
          display: 'flex', flexDirection: 'column',
        };

        let statusIndicator = null;
        if (isBlocked) { statusIndicator = <BlockIconMini />; }
        else if (status === SESSION_STATUS.NEEDS_AGENT) { statusIndicator = <AlertIconMini />; }
        else if (status === SESSION_STATUS.AGENT_ACTIVE) { statusIndicator = <AgentIconMini />; }
        else { statusIndicator = <BotIconMini />; }

        const handleMouseEnter = (e) => { if (!isSelected && !isBlocked) e.currentTarget.style.backgroundColor = colors.bgHover; };
        const handleMouseLeave = (e) => { if (!isSelected && !isBlocked) e.currentTarget.style.backgroundColor = colors.bgMain; };

        return (
          <li key={sessionId} style={itemStyle} onClick={() => !isBlocked && onSelectSession(sessionId)}
              onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
              {statusIndicator}
              <span style={{
                  fontWeight: '600', fontSize: '0.9em', color: colors.textPrimary,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  flexGrow: 1, paddingRight: '5px', textDecoration: isBlocked ? 'line-through' : 'none'
              }} title={sessionId}>
                {sessionId.substring(0, 12)}...
              </span>
              {unreadCount > 0 && !isSelected && !isBlocked && <UnreadBadge count={unreadCount} />}
            </div>
            {lastMessage && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '21px' }}>
                 <p style={{
                    fontSize: '0.85em', color: colors.textSec, margin: 0,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    fontWeight: unreadCount > 0 && !isSelected && !isBlocked ? 'bold' : 'normal',
                    flexGrow: 1, paddingRight: '10px', textDecoration: isBlocked ? 'line-through' : 'none',
                 }} title={lastMessage.content}>
                  {lastMessage.isAgentMessage ? `Agente: ${lastMessage.content}` :
                   lastMessage.type === 'human' ? `Usuario: ${lastMessage.content}` :
                   `Bot: ${lastMessage.content}`}
                </p>
                <small style={{
                    fontSize: '0.75em',
                    color: unreadCount > 0 && !isSelected && !isBlocked ? colors.accent : colors.textSec,
                    fontWeight: unreadCount > 0 && !isSelected && !isBlocked ? 'bold' : 'normal',
                    flexShrink: 0, textDecoration: isBlocked ? 'line-through' : 'none',
                 }}>
                  {new Date(lastMessage.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </small>
              </div>
            )}
             {!lastMessage && <p style={{ fontSize: '0.8em', color: colors.textSec, margin: 0, paddingLeft: '21px' }}>Sin mensajes aún.</p>}
          </li>
        );
      })}
    </ul>
  );
}
export default SessionList;