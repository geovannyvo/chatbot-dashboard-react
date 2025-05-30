// src/SessionList.js
import React from 'react';

const SESSION_STATUS = {
    BOT_ACTIVE: 'bot_active', AGENT_ACTIVE: 'agent_active',
    NEEDS_AGENT: 'needs_agent', BLOCKED: 'blocked',
    ARCHIVED: 'archived'
};
const colors = { // Heredados de App.css via var()
    bgMain: 'var(--wa-dark-bg-main)', bgHover: 'var(--wa-dark-hover)', bgSelected: 'var(--wa-dark-hover)',
    border: 'var(--wa-dark-border)', textPrimary: 'var(--wa-dark-text-primary)', textSec: 'var(--wa-dark-text-sec)',
    accent: 'var(--wa-dark-accent)', alert: 'var(--wa-dark-alert)', orange: 'var(--wa-dark-orange)',
    blue: 'var(--wa-dark-blue)', grey: 'var(--wa-dark-grey)',
};

// Iconos (sin cambios, asumo que están bien)
const BotIconMini = () => <span className="BotIconMini"><svg viewBox="0 0 24 24" width="16px" height="16px" style={{ marginRight: '5px', flexShrink: 0 }}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2.5-8.5h5v1h-5zm-1.5 2.5h8V16h-8zM9 9c.83 0 1.5.67 1.5 1.5S9.83 12 9 12s-1.5-.67-1.5-1.5S8.17 9 9 9zm6 0c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5z"/></svg></span>;
const AgentIconMini = () => <span className="AgentIconMini"><svg viewBox="0 0 24 24" width="16px" height="16px" style={{ marginRight: '5px', flexShrink: 0 }}><path d="M12 1.99C6.47 1.99 2 6.48 2 12s4.47 10 10 10h5v-2h-5c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8v1.43c0 .79-.71 1.57-1.5 1.57s-1.5-.78-1.5-1.57V12c0-2.21-1.79-4-4-4s-4 1.79-4 4 1.79 4 4 4c.78 0 1.45.36 2 .93V19h2.08L19.5 22l1.42-1.42L12 11.66V1.99zM16 15.5c-1.08 0-2.04.43-2.75 1.14L12 18l-1.25-1.36C9.04 15.93 8.08 15.5 7 15.5c-1.49 0-2.7 1.21-2.7 2.7s1.21 2.7 2.7 2.7c1.08 0 2.04-.43 2.75-1.14L12 18l1.25 1.36c.71.71 1.67 1.14 2.75 1.14 1.49 0 2.7-1.21 2.7-2.7s-1.21-2.7-2.7-2.7z"/></svg></span>;
const AlertIconMini = () => <span className="AlertIconMini"><svg viewBox="0 0 24 24" width="16px" height="16px" style={{ marginRight: '5px', flexShrink: 0 }}><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg></span>;
const BlockIconMini = () => <span className="BlockIconMini"><svg viewBox="0 0 24 24" width="16px" height="16px" style={{ marginRight: '5px', flexShrink: 0 }}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13H7v-2h10v2z"/></svg></span>;
const PinIcon = () => <span title="Fijado" style={{marginRight: '5px', fontSize: '14px', flexShrink: 0, color: 'var(--wa-dark-accent)'}}>📌</span>;
const ArchiveIconMini = () => <span className="ArchiveIconMini"><svg fill="var(--wa-dark-text-sec)" viewBox="0 0 24 24" width="16px" height="16px" style={{ marginRight: '5px', flexShrink: 0 }}><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/></svg></span>;

const MoreOptionsIcon = ({ onClick }) => (
  <svg onClick={onClick} viewBox="0 0 24 24" width="20px" height="20px"
    style={{ cursor: 'pointer', fill: 'var(--wa-dark-text-sec)', marginLeft: 'auto', flexShrink: 0 }}
    title="Más opciones">
    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
  </svg>
);

const ContextMenu = ({ sessionId, sessionData, onPinSession, onMarkAsUnread, onArchiveSession, onUnarchiveSession, onClose }) => {
  const isPinned = sessionData?.is_pinned || false;
  const isArchived = sessionData?.status === SESSION_STATUS.ARCHIVED;
  const handleAction = (action, e) => { e.stopPropagation(); action(sessionId); onClose(); };

  return (
    <div onClick={(e) => e.stopPropagation()} style={{
      position: 'absolute', right: '25px', top: '5px', backgroundColor: 'var(--wa-dark-bg-sec)',
      border: `1px solid var(--wa-dark-border)`, borderRadius: '4px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.3)', zIndex: 100, width: '180px', color: 'var(--wa-dark-text-primary)'
    }}>
      <ul style={{ listStyle: 'none', margin: 0, padding: '5px 0' }}>
        {!isArchived && ( // No mostrar opciones de fijar/marcar no leído si está archivado
            <>
                <li style={{ padding: '8px 15px', cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--wa-dark-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={(e) => handleAction(onPinSession, e)}>
                {isPinned ? "Desfijar Chat" : "Fijar Chat"}
                </li>
                <li style={{ padding: '8px 15px', cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--wa-dark-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    onClick={(e) => handleAction(onMarkAsUnread, e)}>
                Marcar como no leído
                </li>
            </>
        )}
        <li style={{ padding: '8px 15px', cursor: 'pointer' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--wa-dark-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            onClick={(e) => handleAction(isArchived ? onUnarchiveSession : onArchiveSession, e)}>
          {isArchived ? "Desarchivar Chat" : "Archivar Chat"}
        </li>
      </ul>
    </div>
  );
};

const UnreadBadge = ({ count }) => (
  <span style={{
    backgroundColor: 'var(--wa-dark-accent)', color: 'white', borderRadius: '12px',
    padding: '2px 8px', fontSize: '0.75em', fontWeight: 'bold', minWidth: '20px',
    textAlign: 'center', display: 'inline-block', lineHeight: '1.5',
    marginLeft: '5px', flexShrink: 0,
  }}>{count}</span>
);

function SessionList({
  groupedInteractions, sessionStatuses, onSelectSession, selectedSessionId, unreadCounts,
  openContextMenuForSessionId, onToggleContextMenu, onPinSession, onMarkAsUnread,
  onArchiveSession, onUnarchiveSession,
  chatViewFilter 
}) {

  // --- LÓGICA DE FILTRADO CORREGIDA ---
  const orderedSessionIds = Object.keys(groupedInteractions)
    .filter(sessionId => {
      const status = sessionStatuses[sessionId]?.status;
      if (chatViewFilter === 'active') {
        // En 'active', no mostrar ni archivados ni bloqueados
        return status !== SESSION_STATUS.ARCHIVED && status !== SESSION_STATUS.BLOCKED;
      } else if (chatViewFilter === 'archived') {
        return status === SESSION_STATUS.ARCHIVED;
      } else if (chatViewFilter === 'blocked') {
        return status === SESSION_STATUS.BLOCKED;
      }
      return true; // Por si acaso, aunque el filtro debería ser uno de los anteriores
    })
    .sort((aId, bId) => {
        const sessionA = sessionStatuses[aId] || { is_pinned: false, status: SESSION_STATUS.BOT_ACTIVE };
        const sessionB = sessionStatuses[bId] || { is_pinned: false, status: SESSION_STATUS.BOT_ACTIVE };
        const unreadA = unreadCounts[aId] || 0;
        const unreadB = unreadCounts[bId] || 0;
        const lastMessageTimeA = groupedInteractions[aId]?.[groupedInteractions[aId].length - 1]?.time || 0;
        const lastMessageTimeB = groupedInteractions[bId]?.[groupedInteractions[bId].length - 1]?.time || 0;

        // Prioridad 1: Chats fijados (solo si no estamos en la vista de archivados)
        if (chatViewFilter !== 'archived') {
            if (sessionA.is_pinned && !sessionB.is_pinned) return -1;
            if (!sessionA.is_pinned && sessionB.is_pinned) return 1;
        }
        // Prioridad 2: Chats no leídos (solo si no estamos en archivados o bloqueados)
        if (chatViewFilter === 'active') { // No leídos solo importan para activos
            if (unreadA > 0 && unreadB === 0) return -1;
            if (unreadA === 0 && unreadB > 0) return 1;
        }
        // Prioridad 3: Por tiempo del último mensaje (más reciente primero)
        return new Date(lastMessageTimeB).getTime() - new Date(lastMessageTimeA).getTime();
    });

  if (orderedSessionIds.length === 0) {
    // --- MENSAJE DE PLACEHOLDER CORREGIDO ---
    let placeholderMessage = 'No hay sesiones activas.';
    if (chatViewFilter === 'archived') {
      placeholderMessage = 'No hay chats archivados.';
    } else if (chatViewFilter === 'blocked') {
      placeholderMessage = 'No hay chats bloqueados.';
    }
    return (
        <p style={{ padding: '20px', textAlign: 'center', color: 'var(--wa-dark-text-sec)' }}>
            {placeholderMessage}
        </p>
    );
  }

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {orderedSessionIds.map(sessionId => {
        const messages = groupedInteractions[sessionId] || [];
        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
        const sessionData = sessionStatuses[sessionId] || { status: SESSION_STATUS.BOT_ACTIVE, is_pinned: false };
        const status = sessionData.status;
        const isSelected = sessionId === selectedSessionId;
        const unreadCount = unreadCounts[sessionId] || 0;
        const isBlocked = status === SESSION_STATUS.BLOCKED;
        const isPinned = sessionData.is_pinned;
        const isArchived = status === SESSION_STATUS.ARCHIVED;


        let itemStyle = {
          padding: '12px 15px', borderBottom: `1px solid ${colors.border}`,
          cursor: 'pointer', // Permitir click siempre, DashboardPage validará la selección
          backgroundColor: isSelected ? colors.bgSelected : colors.bgMain,
          transition: 'background-color 0.2s ease', 
          opacity: (isBlocked && chatViewFilter !== 'blocked') || (isArchived && chatViewFilter !== 'archived') ? 0.6 : 1, // Atenuar si está bloqueado/archivado fuera de su vista
          display: 'flex', flexDirection: 'column', position: 'relative'
        };
        // Si está bloqueado y no estamos en la vista de bloqueados, no debería ser seleccionable
        // o debería tener un comportamiento visual diferente. De momento, se atenúa.

        let statusIndicator = null;
        if (isBlocked) { statusIndicator = <BlockIconMini />; }
        else if (status === SESSION_STATUS.NEEDS_AGENT) { statusIndicator = <AlertIconMini />; }
        else if (status === SESSION_STATUS.AGENT_ACTIVE) { statusIndicator = <AgentIconMini />; }
        else if (isArchived) { statusIndicator = <ArchiveIconMini />; } 
        else { statusIndicator = <BotIconMini />; }

        const handleMouseEnter = (e) => { if (!isSelected) e.currentTarget.style.backgroundColor = colors.bgHover; };
        const handleMouseLeave = (e) => { if (!isSelected) e.currentTarget.style.backgroundColor = colors.bgMain; };

        return (
          <li key={sessionId} style={itemStyle}
              onClick={() => onSelectSession(sessionId)} // Dejar que DashboardPage decida si se puede seleccionar
              onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
              {isPinned && chatViewFilter !== 'archived' && chatViewFilter !== 'blocked' && <PinIcon />} {/* Pin solo en activos */}
              {statusIndicator}
              <span style={{ fontWeight: '600', fontSize: '0.9em', color: colors.textPrimary,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  flexGrow: 1, paddingRight: '5px', textDecoration: isBlocked ? 'line-through' : 'none'
              }} title={sessionId}>
                {sessionId.substring(0, 12)}...
              </span>
              <MoreOptionsIcon onClick={(e) => onToggleContextMenu(sessionId, e)} />
            </div>
            {lastMessage && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '21px' }}>
                  <p style={{ fontSize: '0.85em', color: colors.textSec, margin: 0,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      fontWeight: unreadCount > 0 && !isSelected && !isBlocked && !isArchived ? 'bold' : 'normal',
                      flexGrow: 1, paddingRight: '10px', textDecoration: isBlocked ? 'line-through' : 'none',
                  }} title={lastMessage.content}>
                    {lastMessage.isAgentMessage ? `Agente: ${lastMessage.content}` :
                     lastMessage.type === 'human' ? `Usuario: ${lastMessage.content}` : `Bot: ${lastMessage.content}`}
                  </p>
                  {unreadCount > 0 && !isSelected && !isBlocked && !isArchived && <UnreadBadge count={unreadCount} />}
                  <small style={{ fontSize: '0.75em', marginLeft: '5px',
                      color: unreadCount > 0 && !isSelected && !isBlocked && !isArchived ? colors.accent : colors.textSec,
                      fontWeight: unreadCount > 0 && !isSelected && !isBlocked && !isArchived ? 'bold' : 'normal',
                      flexShrink: 0, textDecoration: isBlocked ? 'line-through' : 'none',
                  }}>
                    {new Date(lastMessage.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </small>
              </div>
            )}
            {!lastMessage && <p style={{ fontSize: '0.8em', color: colors.textSec, margin: 0, paddingLeft: '21px' }}>Sin mensajes aún.</p>}
            {openContextMenuForSessionId === sessionId && (
              <ContextMenu
                sessionId={sessionId} sessionData={sessionData}
                onPinSession={onPinSession} onMarkAsUnread={onMarkAsUnread}
                onArchiveSession={onArchiveSession} onUnarchiveSession={onUnarchiveSession}
                onClose={() => onToggleContextMenu(sessionId, null)}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
export default SessionList;