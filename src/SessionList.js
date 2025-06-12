// src/components/SessionList.js
import React, { useMemo } from 'react';

// Constantes y colores (sin cambios)
const SESSION_STATUS = {
    BOT_ACTIVE: 'bot_active', AGENT_ACTIVE: 'agent_active',
    NEEDS_AGENT: 'needs_agent', BLOCKED: 'blocked',
    ARCHIVED: 'archived'
};
const colors = {
    bgMain: 'var(--wa-dark-bg-main, #111b21)',
    bgHover: 'var(--wa-dark-hover, #2a3942)',
    bgSelected: 'var(--wa-dark-selected, #2a3942)',
    bgWarning: 'var(--wa-dark-warning-bg, #5c4b00)',
    border: 'var(--wa-dark-border, #374045)',
    textPrimary: 'var(--wa-dark-text-primary, #e9edef)',
    textSec: 'var(--wa-dark-text-sec, #8696a0)',
    accent: 'var(--wa-dark-accent, #00a884)',
    alert: 'var(--wa-dark-alert, #f44336)',
    orange: 'var(--wa-dark-orange, #ff9800)',
    blue: 'var(--wa-dark-blue, #53bdeb)',
    grey: 'var(--wa-dark-grey, #8696a0)',
    btnYellow: 'var(--wa-dark-btn-yellow, #ffc107)',
};

// ---- Iconos (sin cambios) ----
const BotIconMini = () => <span className="BotIconMini" title="Chat con Bot"><svg viewBox="0 0 24 24" width="16px" height="16px" style={{ marginRight: '5px', flexShrink: 0, fill: colors.textSec }}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2.5-8.5h5v1h-5zm-1.5 2.5h8V16h-8zM9 9c.83 0 1.5.67 1.5 1.5S9.83 12 9 12s-1.5-.67-1.5-1.5S8.17 9 9 9zm6 0c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5z"/></svg></span>;
const AgentIconMini = () => <span className="AgentIconMini" title="Chat con Agente"><svg viewBox="0 0 24 24" width="16px" height="16px" style={{ marginRight: '5px', flexShrink: 0, fill: colors.blue }}><path d="M12 1.99C6.47 1.99 2 6.48 2 12s4.47 10 10 10h5v-2h-5c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8v1.43c0 .79-.71 1.57-1.5 1.57s-1.5-.78-1.5-1.57V12c0-2.21-1.79-4-4-4s-4 1.79-4 4 1.79 4 4 4c.78 0 1.45.36 2 .93V19h2.08L19.5 22l1.42-1.42L12 11.66V1.99zM16 15.5c-1.08 0-2.04.43-2.75 1.14L12 18l-1.25-1.36C9.04 15.93 8.08 15.5 7 15.5c-1.49 0-2.7 1.21-2.7 2.7s1.21 2.7 2.7 2.7c1.08 0 2.04-.43 2.75-1.14L12 18l1.25 1.36c.71.71 1.67 1.14 2.75 1.14 1.49 0 2.7-1.21 2.7-2.7s-1.21-2.7-2.7-2.7z"/></svg></span>;
const AlertIconMini = () => <span className="AlertIconMini" title="Necesita Atención"><svg viewBox="0 0 24 24" width="16px" height="16px" style={{ marginRight: '5px', flexShrink: 0, fill: colors.orange }}><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg></span>;
const BlockIconMini = () => <span className="BlockIconMini" title="Bloqueado"><svg viewBox="0 0 24 24" width="16px" height="16px" style={{ marginRight: '5px', flexShrink: 0, fill: colors.alert }}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13H7v-2h10v2z"/></svg></span>;
const PinIcon = () => <span title="Fijado" style={{marginRight: '5px', fontSize: '14px', flexShrink: 0, color: colors.accent}}>📌</span>;
const ArchiveIconMini = () => <span className="ArchiveIconMini" title="Archivado"><svg fill={colors.grey} viewBox="0 0 24 24" width="16px" height="16px" style={{ marginRight: '5px', flexShrink: 0 }}><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/></svg></span>;
const MoreOptionsIcon = ({ onClick }) => (
  <svg onClick={onClick} viewBox="0 0 24 24" width="20px" height="20px"
    style={{ cursor: 'pointer', fill: colors.textSec, marginLeft: 'auto', flexShrink: 0 }}
    title="Más opciones">
    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
  </svg>
);
// NUEVO ÍCONO para la barra de búsqueda
const SearchIcon = () => (
    <svg fill={colors.textSec} width="20px" height="20px" viewBox="0 0 24 24" style={{ position: 'absolute', left: '25px', top: '50%', transform: 'translateY(-50%)', zIndex: 1 }}>
        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
    </svg>
);

// ---- Fin Iconos ----

const ContextMenu = React.memo(({
    sessionId, sessionData, unreadCounts,
    onPinSession, onMarkAsUnread, onMarkAsRead,
    onArchiveSession, onUnarchiveSession,
    onBlockSession, onUnblockSession,
    onClose
}) => {
    // ... (El código del Menú Contextual no cambia) ...
    const isPinned = sessionData?.is_pinned || false;
    const isArchived = sessionData?.status === SESSION_STATUS.ARCHIVED;
    const isBlocked = sessionData?.status === SESSION_STATUS.BLOCKED;
    const currentUnreadCount = unreadCounts && unreadCounts[sessionId] ? unreadCounts[sessionId] : 0;
    const isCurrentlyUnread = currentUnreadCount > 0;

    const handleAction = (actionFunction, actionName, e) => {
        if (e) e.stopPropagation();
        if (typeof actionFunction === 'function') {
            actionFunction(sessionId);
        } else {
            console.error(`[ContextMenu] handleAction: actionFunction para ${actionName} NO es una función.`);
        }
        onClose();
    };
    
    const menuItemStyle = { padding: '10px 15px', cursor: 'pointer', fontSize: '0.9em' };
    const menuItemHoverStyle = { backgroundColor: colors.bgHover };

    return (
        <div onClick={(e) => e.stopPropagation()} style={{
            position: 'absolute', right: '30px', top: '10px', 
            backgroundColor: 'var(--wa-dark-bg-context-menu, #233138)', 
            border: `1px solid ${colors.border}`, borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 1000, width: '200px', color: colors.textPrimary
        }}>
            <ul style={{ listStyle: 'none', margin: 0, padding: '5px 0' }}>
                {!isBlocked && (
                    <>
                        {!isArchived && ( 
                            <li style={menuItemStyle}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = menuItemHoverStyle.backgroundColor}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                onClick={(e) => handleAction(onPinSession, "onPinSession", e)}>
                                {isPinned ? "Desfijar Chat" : "Fijar Chat"}
                            </li>
                        )}
                        <li style={menuItemStyle}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = menuItemHoverStyle.backgroundColor}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            onClick={(e) => handleAction(isCurrentlyUnread ? onMarkAsRead : onMarkAsUnread, isCurrentlyUnread ? "onMarkAsRead" : "onMarkAsUnread", e)}>
                            {isCurrentlyUnread ? "Marcar como leído" : "Marcar como no leído"}
                        </li>
                        <li style={menuItemStyle}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = menuItemHoverStyle.backgroundColor}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            onClick={(e) => handleAction(isArchived ? onUnarchiveSession : onArchiveSession, isArchived ? "onUnarchiveSession" : "onArchiveSession", e)}>
                            {isArchived ? "Desarchivar Chat" : "Archivar Chat"}
                        </li>
                         <hr style={{ margin: '5px 0', borderColor: colors.border, opacity: 0.5 }} />
                        <li style={{ ...menuItemStyle, color: colors.alert }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = menuItemHoverStyle.backgroundColor}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            onClick={(e) => handleAction(onBlockSession, "onBlockSession", e)}>
                            Bloquear Usuario
                        </li>
                    </>
                )}
                {isBlocked && ( 
                    <>
                        {isArchived && ( 
                             <li style={menuItemStyle}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = menuItemHoverStyle.backgroundColor}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                onClick={(e) => handleAction(onUnarchiveSession, "onUnarchiveSession", e)}>
                                Desarchivar Chat
                            </li>
                        )}
                        <li style={{ ...menuItemStyle, color: colors.blue }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = menuItemHoverStyle.backgroundColor}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            onClick={(e) => handleAction(onUnblockSession, "onUnblockSession", e)}>
                            Desbloquear Usuario
                        </li>
                    </>
                )}
            </ul>
        </div>
    );
});

const UnreadBadge = React.memo(() => (
    <span style={{
        backgroundColor: colors.accent,
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        display: 'inline-block',
        marginLeft: 'auto',  
        marginRight: '8px', 
        flexShrink: 0,
    }} title="Mensajes no leídos"></span>
));

function SessionList({
    groupedInteractions, sessionStatuses, onSelectSession, selectedSessionId, unreadCounts,
    openContextMenuForSessionId, onToggleContextMenu, onPinSession,
    onMarkAsUnread, onMarkAsRead,
    onArchiveSession, onUnarchiveSession,
    onBlockSession, onUnblockSession,
    chatViewFilter,
    // --- NUEVAS PROPS PARA LA BÚSQUEDA ---
    searchTerm,
    onSearchChange
}) {
    const orderedSessionIds = useMemo(() => {
        // --- LÓGICA DE FILTRADO Y ORDENAMIENTO ACTUALIZADA ---
        return Object.keys(groupedInteractions)
            // 1. PRIMER FILTRO: Por término de búsqueda
            .filter(sessionId => {
                if (!searchTerm.trim()) return true; // Si no hay búsqueda, mostrar todos
                return sessionId.toLowerCase().includes(searchTerm.toLowerCase());
            })
            // 2. SEGUNDO FILTRO: Por el filtro de vista (activo, archivado, etc.)
            .filter(sessionId => {
                const statusData = sessionStatuses[sessionId];
                const status = statusData?.status;
                if (!status) return false; 

                if (chatViewFilter === 'active') {
                    return status !== SESSION_STATUS.ARCHIVED &&
                           status !== SESSION_STATUS.BLOCKED &&
                           status !== SESSION_STATUS.NEEDS_AGENT;
                } else if (chatViewFilter === 'archived') {
                    return status === SESSION_STATUS.ARCHIVED;
                } else if (chatViewFilter === 'blocked') {
                    return status === SESSION_STATUS.BLOCKED;
                } else if (chatViewFilter === 'needs_agent') {
                    return status === SESSION_STATUS.NEEDS_AGENT;
                }
                // Fallback por si acaso
                return status !== SESSION_STATUS.ARCHIVED && status !== SESSION_STATUS.BLOCKED && status !== SESSION_STATUS.NEEDS_AGENT;
            })
            // 3. ORDENAMIENTO: Como lo tenías antes
            .sort((aId, bId) => {
                const sessionA_status = sessionStatuses[aId] || {};
                const sessionB_status = sessionStatuses[bId] || {};
                const unreadA = unreadCounts[aId] || 0;
                const unreadB = unreadCounts[bId] || 0;
                
                const lastMessageA = groupedInteractions[aId]?.[groupedInteractions[aId].length - 1];
                const lastMessageB = groupedInteractions[bId]?.[groupedInteractions[bId].length - 1];
                const lastMessageTimeA = lastMessageA ? new Date(lastMessageA.time).getTime() : 0;
                const lastMessageTimeB = lastMessageB ? new Date(lastMessageB.time).getTime() : 0;

                if (chatViewFilter === 'active' || chatViewFilter === 'needs_agent') {
                    const pinnedA = sessionA_status.is_pinned || false;
                    const pinnedB = sessionB_status.is_pinned || false;
                    if (pinnedA && !pinnedB) return -1;
                    if (!pinnedA && pinnedB) return 1;
                }
                
                const statusA = sessionA_status.status;
                const statusB = sessionB_status.status;

                if (statusA !== SESSION_STATUS.BLOCKED && statusB !== SESSION_STATUS.BLOCKED) {
                    if (unreadA > 0 && unreadB === 0) return -1;
                    if (unreadA === 0 && unreadB > 0) return 1;
                }
                return lastMessageTimeB - lastMessageTimeA;
            });
    }, [groupedInteractions, sessionStatuses, chatViewFilter, unreadCounts, searchTerm]); // AÑADIR searchTerm A LAS DEPENDENCIAS

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            backgroundColor: colors.bgSec,
            borderRight: `1px solid ${colors.border}`
        }}>
            {/* --- NUEVA BARRA DE BÚSQUEDA --- */}
            <div style={{ padding: '10px 15px', position: 'relative', flexShrink: 0, backgroundColor: colors.bgSec, borderBottom: `1px solid ${colors.border}`}}>
                <SearchIcon />
                <input
                    type="text"
                    placeholder="Buscar"
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    style={{
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '8px 15px 8px 45px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: colors.bgMain,
                        color: colors.textPrimary,
                        fontSize: '0.9em',
                        outline: 'none'
                    }}
                />
            </div>
            
            {/* Lista de Sesiones (renderizado condicional si no hay resultados) */}
            {orderedSessionIds.length === 0 ? (
                <p style={{ padding: '20px', textAlign: 'center', color: colors.textSec, fontSize: '0.9em' }}>
                    {searchTerm ? 'No se encontraron chats.' : `No hay chats en esta vista.`}
                </p>
            ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, height: '100%', overflowY: 'auto' }}>
                    {orderedSessionIds.map(sessionId => {
                       // ... (el código de renderizado de cada <li> es idéntico a tu versión)
                       const messages = groupedInteractions[sessionId] || [];
                       const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
                       const sessionData = sessionStatuses[sessionId] || { status: SESSION_STATUS.BOT_ACTIVE, is_pinned: false };
                       const status = sessionData.status;
                       const isSelected = sessionId === selectedSessionId;
                       const unreadCount = unreadCounts[sessionId] || 0;
                       const isBlocked = status === SESSION_STATUS.BLOCKED;
                       const isPinned = sessionData.is_pinned;
                       const showUnreadIndicator = unreadCount > 0 && !isBlocked;

                       let itemStyle = {
                           padding: '12px 15px', borderBottom: `1px solid ${colors.border}`,
                           cursor: 'pointer',
                           backgroundColor: isSelected ? colors.bgSelected : colors.bgMain,
                           transition: 'background-color 0.1s ease-out',
                           opacity: (isBlocked && chatViewFilter !== 'blocked') ? 0.6 : 1, 
                           display: 'flex', flexDirection: 'column', position: 'relative' 
                       };
                       
                       if (status === SESSION_STATUS.NEEDS_AGENT && !isSelected) {
                           itemStyle.backgroundColor = colors.bgWarning;
                           itemStyle.borderLeft = `3px solid ${colors.btnYellow}`;
                       }

                       let statusIndicator = null;
                       if (isBlocked) { statusIndicator = <BlockIconMini />; }
                       else if (status === SESSION_STATUS.NEEDS_AGENT) { statusIndicator = <AlertIconMini />; }
                       else if (status === SESSION_STATUS.AGENT_ACTIVE) { statusIndicator = <AgentIconMini />; }
                       else if (status === SESSION_STATUS.ARCHIVED) { statusIndicator = <ArchiveIconMini />; }
                       else { statusIndicator = <BotIconMini />; }

                       const handleMouseEnter = (e) => { if (!isSelected) e.currentTarget.style.backgroundColor = colors.bgHover; };
                       const handleMouseLeave = (e) => {
                           if (!isSelected) {
                               e.currentTarget.style.backgroundColor = (status === SESSION_STATUS.NEEDS_AGENT) ? colors.bgWarning : colors.bgMain;
                           }
                       };
                       
                       const lastMessageContent = lastMessage ? (
                           lastMessage.isAgentMessage ? `Agente: ${lastMessage.content}` :
                           lastMessage.type === 'human' ? `Usuario: ${lastMessage.content}` : `Bot: ${lastMessage.content}`
                       ) : 'Sin mensajes aún.';

                       const lastMessageTimeFormatted = lastMessage ? 
                           new Date(lastMessage.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                       return (
                           <li key={sessionId} style={itemStyle}
                               onClick={() => onSelectSession(sessionId)}
                               onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
                           >
                               <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                                   {(isPinned && (chatViewFilter === 'active' || chatViewFilter === 'needs_agent')) && <PinIcon />}
                                   {statusIndicator}
                                   <span style={{ 
                                       fontWeight: '600', fontSize: '0.9em', color: colors.textPrimary,
                                       whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                       flexGrow: 1, paddingRight: '5px', 
                                       textDecoration: isBlocked ? 'line-through' : 'none'
                                   }} title={sessionId}>
                                       {sessionId.length > 15 ? sessionId.substring(0, 12) + "..." : sessionId}
                                   </span>
                                   <MoreOptionsIcon onClick={(e) => onToggleContextMenu(sessionId, e)} />
                               </div>
                               
                               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '21px' }}>
                                   <p style={{
                                       fontSize: '0.85em', color: colors.textSec, margin: 0,
                                       whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                       fontWeight: showUnreadIndicator ? 'bold' : 'normal', 
                                       flexGrow: 1, paddingRight: '10px',
                                       textDecoration: isBlocked ? 'line-through' : 'none',
                                   }} title={lastMessage?.content}>
                                       {lastMessageContent}
                                   </p>
                                   {showUnreadIndicator && <UnreadBadge />}
                                   {lastMessage && (
                                       <small style={{
                                           fontSize: '0.75em',
                                           marginLeft: showUnreadIndicator ? '0px' : '5px', 
                                           color: showUnreadIndicator ? colors.accent : colors.textSec, 
                                           fontWeight: showUnreadIndicator ? 'bold' : 'normal',
                                           flexShrink: 0,
                                           textDecoration: isBlocked ? 'line-through' : 'none',
                                       }}>
                                           {lastMessageTimeFormatted}
                                       </small>
                                   )}
                               </div>
                               
                               {openContextMenuForSessionId === sessionId && (
                                   <ContextMenu
                                       sessionId={sessionId} sessionData={sessionData} unreadCounts={unreadCounts}
                                       onPinSession={onPinSession}
                                       onMarkAsUnread={onMarkAsUnread}
                                       onMarkAsRead={onMarkAsRead}
                                       onArchiveSession={onArchiveSession} onUnarchiveSession={onUnarchiveSession}
                                       onBlockSession={onBlockSession}
                                       onUnblockSession={onUnblockSession}
                                       onClose={() => onToggleContextMenu(null, null)} 
                                   />
                               )}
                           </li>
                       );
                   })}
                </ul>
            )}
        </div>
    );
}

export default React.memo(SessionList);

