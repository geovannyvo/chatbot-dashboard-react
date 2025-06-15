// src/ChatView.js
import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import EmojiPicker from 'emoji-picker-react'; 

import {
    sendAgentMessageViaN8N,
    updateSessionStatus,
    unblockSession,
    saveToKnowledgeBase,
    addOrUpdateContact
} from './supabaseClient'; 

const SESSION_STATUS = { BOT_ACTIVE: 'bot_active', AGENT_ACTIVE: 'agent_active', NEEDS_AGENT: 'needs_agent', BLOCKED: 'blocked', ARCHIVED: 'archived' };
const colors = { bgMain: 'var(--wa-dark-bg-main, #111b21)', bgSec: 'var(--wa-dark-bg-sec, #202c33)', border: 'var(--wa-dark-border, #374045)', textPrimary: 'var(--wa-dark-text-primary, #e9edef)', textSec: 'var(--wa-dark-text-sec, #8696a0)', bubbleUser: 'var(--wa-dark-bubble-user, #202c33)', bubbleAgent: 'var(--wa-dark-bubble-agent, #005c4b)', accent: 'var(--wa-dark-accent, #00a884)', alert: 'var(--wa-dark-alert, #f44336)', warningBg: 'var(--wa-dark-warning-bg, #5c4b00)', warningText: 'var(--wa-dark-warning-text, #e9edef)', btnRed: 'var(--wa-dark-button-red, #d9534f)', btnGreen: 'var(--wa-dark-button-green, #5cb85c)', btnYellow: 'var(--wa-dark-button-yellow, #f0ad4e)', btnBlue: 'var(--wa-dark-button-blue, #337ab7)', btnSend: 'var(--wa-dark-button-send, #00a884)' };

const formatSessionId = (id) => {
    if (!id) return '';
    if (id.startsWith('whatsapp:')) {
        return id.substring(9);
    }
    return id;
};

// --- Iconos ---
const EditContactIcon = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style={{marginLeft: '10px', cursor: 'pointer', opacity: 0.7}} onMouseEnter={(e) => e.currentTarget.style.opacity=1} onMouseLeave={(e) => e.currentTarget.style.opacity=0.7}><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a.9959.9959 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>;
const BotIcon = () => <span className="BotIcon"><svg viewBox="0 0 24 24" width="20px" height="20px" style={{ marginRight: '8px'}}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2.5-8.5h5v1h-5zm-1.5 2.5h8V16h-8zM9 9c.83 0 1.5.67 1.5 1.5S9.83 12 9 12s-1.5-.67-1.5-1.5S8.17 9 9 9zm6 0c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5z"/></svg></span>;
const UserIcon = () => <span className="UserIcon"><svg viewBox="0 0 24 24" width="20px" height="20px" style={{ marginRight: '8px'}}><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></span>;
const AgentIcon = () => <span className="AgentIcon"><svg viewBox="0 0 24 24" width="20px" height="20px" style={{ marginRight: '8px'}}><path d="M12 1.99C6.47 1.99 2 6.48 2 12s4.47 10 10 10h5v-2h-5c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8v1.43c0 .79-.71 1.57-1.5 1.57s-1.5-.78-1.5-1.57V12c0-2.21-1.79-4-4-4s-4 1.79-4 4 1.79 4 4 4c.78 0 1.45.36 2 .93V19h2.08L19.5 22l1.42-1.42L12 11.66V1.99zM16 15.5c-1.08 0-2.04.43-2.75 1.14L12 18l-1.25-1.36C9.04 15.93 8.08 15.5 7 15.5c-1.49 0-2.7 1.21-2.7 2.7s1.21 2.7 2.7 2.7c1.08 0 2.04-.43 2.75-1.14L12 18l1.25 1.36c.71.71 1.67 1.14 2.75 1.14 1.49 0 2.7-1.21 2.7-2.7s-1.21-2.7-2.7-2.7z"/></svg></span>;
const BlockIcon = () => <span className="BlockIcon"><svg viewBox="0 0 24 24" width="20px" height="20px" style={{ marginRight: '8px'}}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 13H7v-2h10v2z"/></svg></span>;
const ArchiveIcon = () => <span className="ArchiveIcon"><svg fill={colors.textSec} viewBox="0 0 24 24" width="20px" height="20px" style={{ marginRight: '8px'}}><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/></svg></span>;
const NeedsAgentAttentionIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={colors.warningText} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px'}}> <circle cx="12" cy="12" r="10"></circle> <line x1="12" y1="16" x2="12" y2="12"></line> <line x1="12" y1="8" x2="12.01" y2="8"></line> </svg> );
const SaveKBIcon = ({ onClick, saved }) => ( <svg onClick={onClick} fill={saved ? colors.accent : colors.textSec} viewBox="0 0 24 24" width="18px" height="18px" style={{ cursor: 'pointer', opacity: saved ? 1 : 0.7, transition: 'opacity 0.2s, fill 0.2s', marginLeft: '8px', flexShrink: 0 }} title="Guardar como Pregunta/Respuesta en Base de Conocimiento" onMouseEnter={(e) => e.currentTarget.style.opacity = 1} onMouseLeave={(e) => e.currentTarget.style.opacity = saved ? 1 : 0.7} > <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/> </svg> );


function ChatView({ sessionId, messages, currentSessionStatus, currentUser, setSessionStatuses, contacts, setContacts }) {
    const [agentInput, setAgentInput] = useState('');
    const [savedMessages, setSavedMessages] = useState({});
    const messagesEndRef = useRef(null);
    const [showPicker, setShowPicker] = useState(false);
    
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [confirmModalData, setConfirmModalData] = useState({ question: '', answer: '', action: null });
    
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [editingContactName, setEditingContactName] = useState('');

    const isBlocked = currentSessionStatus === SESSION_STATUS.BLOCKED;
    const isArchived = currentSessionStatus === SESSION_STATUS.ARCHIVED;
    const needsAgentAttention = currentSessionStatus === SESSION_STATUS.NEEDS_AGENT;

    useLayoutEffect(() => { messagesEndRef.current?.scrollIntoView(); }, [messages]);

    useEffect(() => {
        setAgentInput(''); 
        setSavedMessages({});
        setIsContactModalOpen(false);
    }, [sessionId]);

    const formatDisplayDate = useCallback((isoString) => { if (!isoString) return ''; const date = new Date(isoString); return isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }); }, []);
    const onEmojiClick = (emojiObject) => { setAgentInput(prevInput => prevInput + emojiObject.emoji); setShowPicker(false); };
    
    const handleOpenContactModal = () => {
        const contactName = contacts[sessionId] || '';
        setEditingContactName(contactName);
        setIsContactModalOpen(true);
    };

    const handlePickContact = async () => {
        if ('contacts' in navigator && 'select' in navigator.contacts) {
            try {
                const contact = await navigator.contacts.select(['name', 'tel'], { multiple: false });
                if (contact.length > 0) {
                    if (contact[0].name && contact[0].name.length > 0) {
                        setEditingContactName(contact[0].name[0]);
                    }
                    toast.success("Contacto seleccionado.");
                }
            } catch (ex) {
                console.error("Error al seleccionar contacto:", ex);
                toast.error("No se pudo seleccionar el contacto.");
            }
        } else {
            toast.info("Tu navegador no soporta la selección de contactos.");
        }
    };

    const handleSaveContact = async () => {
        const trimmedName = editingContactName.trim();
        if (!trimmedName) {
            toast.error("El nombre no puede estar vacío.");
            return;
        }
        const updatedContact = await addOrUpdateContact(sessionId, trimmedName, currentUser.id);
        if (updatedContact) {
            setContacts(prev => ({ ...prev, [sessionId]: trimmedName }));
            setIsContactModalOpen(false);
        }
    };
    
    const handleSendReply = async () => { /* Sin cambios */ };
    const handleChangeSessionState = async (newStatus) => { /* Sin cambios */ };
    const handleUnblockSession = async () => { /* Sin cambios */ };

    const handleSaveToKB = (answerMessage, messageIndex) => {
        if (!currentUser || !currentUser.id || !answerMessage || messageIndex < 0 || savedMessages[answerMessage.id] || isArchived || isBlocked) return;
        let questionMessage = null;
        for (let i = messageIndex - 1; i >= 0; i--) {
            if (messages[i].type === 'human' && !messages[i].isAgentMessage) {
                questionMessage = messages[i];
                break;
            }
        }
        if (!questionMessage) {
            toast.warn("No se encontró un mensaje de usuario anterior claro para usar como pregunta.");
            return;
        }
        setConfirmModalData({
            question: questionMessage.content,
            answer: answerMessage.content,
            action: async () => {
                const success = await saveToKnowledgeBase(questionMessage.content, answerMessage.content, currentUser.id, answerMessage.id, sessionId);
                if (success) {
                    toast.success("¡Guardado en la Base de Conocimiento!");
                    setSavedMessages(prev => ({ ...prev, [answerMessage.id]: true }));
                } else {
                    toast.error("Error al guardar en la Base de Conocimiento.");
                }
            }
        });
        setIsConfirmModalOpen(true);
    };
    const handleConfirmAndCloseModal = async () => { if (confirmModalData.action) { await confirmModalData.action(); } setIsConfirmModalOpen(false); };

    const buttonBaseStyle = { border: 'none', padding: '8px 15px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', transition: 'filter 0.2s ease', color: 'white', fontSize: '0.9em' };
    const buttonHoverStyle = (e) => { e.currentTarget.style.filter = 'brightness(1.15)'; };
    const buttonLeaveStyle = (e) => { e.currentTarget.style.filter = 'brightness(1)';};

    const contactDisplayName = contacts[sessionId] || formatSessionId(sessionId);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: colors.bgSec, position: 'relative' }}>
            
            {/* --- CÓDIGO DEL MODAL DE CONFIRMACIÓN RESTAURADO --- */}
            {isConfirmModalOpen && (
                <>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100 }}
                         onClick={() => setIsConfirmModalOpen(false)}>
                    </div>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: colors.bgSec, padding: '25px', borderRadius: '8px', zIndex: 101, width: '90%', maxWidth: '500px', border: `1px solid ${colors.border}`, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                        <h3 style={{ marginTop: 0, color: colors.textPrimary }}>Confirmar Guardado</h3>
                        <div style={{ fontSize: '0.9em', color: colors.textSec, marginBottom: '20px' }}>
                            <p style={{ margin: '5px 0' }}><strong>Pregunta:</strong> {confirmModalData.question}</p>
                            <p style={{ margin: '5px 0' }}><strong>Respuesta:</strong> {confirmModalData.answer}</p>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={() => setIsConfirmModalOpen(false)} style={{ ...buttonBaseStyle, backgroundColor: colors.textSec }}>Cancelar</button>
                            <button onClick={handleConfirmAndCloseModal} style={{ ...buttonBaseStyle, backgroundColor: colors.accent }}>Confirmar</button>
                        </div>
                    </div>
                </>
            )}
            
            {isContactModalOpen && (
                <>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100 }}
                         onClick={() => setIsContactModalOpen(false)}>
                    </div>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: colors.bgSec, padding: '25px', borderRadius: '8px', zIndex: 101, width: '90%', maxWidth: '400px', border: `1px solid ${colors.border}`, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
                        <h3 style={{ marginTop: 0, color: colors.textPrimary }}>Editar Contacto</h3>
                        <p style={{ fontSize: '0.9em', color: colors.textSec, marginBottom: '15px' }}>
                            Número: <strong>{formatSessionId(sessionId)}</strong>
                        </p>
                        <div style={{marginBottom: '20px'}}>
                            <label htmlFor="contact-name" style={{display: 'block', marginBottom: '5px', color: colors.textSec}}>Nombre:</label>
                            <input
                                id="contact-name"
                                type="text"
                                value={editingContactName}
                                onChange={(e) => setEditingContactName(e.target.value)}
                                placeholder="Nombre del contacto"
                                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: `1px solid ${colors.border}`, backgroundColor: colors.bgMain, color: colors.textPrimary }}
                            />
                        </div>
                        <button onClick={handlePickContact} style={{...buttonBaseStyle, backgroundColor: colors.btnBlue, width: '100%', marginBottom: '10px'}}>Importar desde el Teléfono</button>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                            <button onClick={() => setIsContactModalOpen(false)} style={{ ...buttonBaseStyle, backgroundColor: colors.textSec }}>Cancelar</button>
                            <button onClick={handleSaveContact} style={{ ...buttonBaseStyle, backgroundColor: colors.accent }}>Guardar</button>
                        </div>
                    </div>
                </>
            )}

            <div style={{ padding: '10px 20px', backgroundColor: colors.bgSec, borderBottom: `1px solid ${colors.border}`, flexShrink: 0 }}>
                <h3 style={{ margin: 0, color: colors.textPrimary, fontWeight: 500, display: 'flex', alignItems: 'center', fontSize: '1.1em' }}>
                    {sessionId ? `Chat: ${contactDisplayName}` : 'Conversación'}
                    {sessionId && <span onClick={handleOpenContactModal}><EditContactIcon /></span>}
                    {isBlocked && <span style={{ color: colors.alert, marginLeft: '10px', fontWeight: 'bold', fontSize: '0.9em' }}>(BLOQUEADO)</span>}
                    {isArchived && !isBlocked && <span style={{ color: colors.textSec, marginLeft: '10px', fontWeight: 'normal', fontSize: '0.9em' }}>(ARCHIVADO)</span>}
                </h3>
            </div>
            
            {needsAgentAttention && !isBlocked && !isArchived && ( <div style={{ padding: '10px 15px', backgroundColor: colors.warningBg, color: colors.warningText, textAlign: 'center', margin: '10px 15px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${colors.btnYellow}`, flexShrink: 0 }}> <NeedsAgentAttentionIcon /> <span style={{marginLeft: '10px', fontWeight: 'bold', fontSize: '0.9em'}}>Este usuario requiere atención de un agente.</span> </div> )}
            {isBlocked && ( <div style={{ padding: '10px 15px', backgroundColor: '#4a3232', color: colors.alert, textAlign: 'center', margin: '10px 15px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}> <BlockIcon /> <span style={{marginLeft: '5px', fontSize: '0.9em'}}>Este usuario está bloqueado.</span> </div> )}
            {isArchived && !isBlocked && ( <div style={{ padding: '10px 15px', backgroundColor: colors.bgSec, color: colors.textSec, textAlign: 'center', margin: '10px 15px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}> <ArchiveIcon /> <span style={{marginLeft: '5px', fontSize: '0.9em'}}>Este chat está archivado.</span> </div> )}
            
            <ul style={{ listStyleType: 'none', paddingTop: '10px', paddingBottom: '20px', paddingLeft: '20px', paddingRight: '20px', flexGrow: 1, overflowY: 'auto', marginBottom: 0, backgroundColor: colors.bgMain }}>
                {(messages || []).map((interaction, index) => {
                    const isAgent = interaction.isAgentMessage;
                    const isUser = interaction.type === 'human' && !isAgent;
                    const messageStyle = { marginBottom: '12px', padding: '8px 12px', borderRadius: '8px', maxWidth: '75%', wordWrap: 'break-word', boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)', color: colors.textPrimary, lineHeight: '1.4', position: 'relative' };
                    if (isAgent) { Object.assign(messageStyle, { backgroundColor: colors.bubbleAgent, marginLeft: 'auto', borderBottomRightRadius: '0px' }); }
                    else if (isUser) { Object.assign(messageStyle, { backgroundColor: colors.bubbleUser, marginRight: 'auto', borderBottomLeftRadius: '0px' }); }
                    else { Object.assign(messageStyle, { backgroundColor: colors.bgSec, marginRight: 'auto', borderBottomLeftRadius: '0px', fontStyle: 'italic', opacity: 0.8 }); }
                    return (
                        <li key={interaction.id || index} style={messageStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', fontWeight: 'bold', fontSize: '0.8em', color: isAgent ? '#a3e6d6' : colors.textSec, opacity: 0.9 }}>
                                {isAgent ? <AgentIcon /> : isUser ? <UserIcon /> : <BotIcon />}
                                <span>{isAgent ? (currentUser?.full_name || 'Agente') : isUser ? contactDisplayName : 'Chatbot Asistente'}</span>
                            </div>
                            <p style={{ margin: 0, paddingRight: isAgent && !isBlocked && !isArchived ? '25px' : '0' }}>{interaction.content}</p>
                            {interaction.time && (<small style={{ fontSize: '0.7em', color: isAgent ? '#a3e6d6' : colors.textSec, display: 'block', textAlign: 'right', marginTop: '4px', opacity: 0.7 }}>{formatDisplayDate(interaction.time)}</small>)}
                            {isAgent && !isBlocked && !isArchived && (
                                <div style={{ position: 'absolute', right: '8px', top: '8px' }}>
                                    <SaveKBIcon onClick={(e) => { e.stopPropagation(); handleSaveToKB(interaction, index); }} saved={savedMessages[interaction.id] || false} />
                                </div>
                            )}
                        </li>
                    );
                })}
                <div ref={messagesEndRef} /> 
            </ul>
            
            <div style={{ padding: '10px 15px', borderTop: `1px solid ${colors.border}`, backgroundColor: colors.bgSec, flexShrink: 0, position: 'relative' }}>
                {showPicker && ( <div style={{ position: 'absolute', bottom: '110px', right: '15px', zIndex: 10 }}> <EmojiPicker onEmojiClick={onEmojiClick} pickerStyle={{ width: '100%' }} theme="dark" /> </div> )}
                {!isBlocked && !isArchived && (currentSessionStatus === SESSION_STATUS.AGENT_ACTIVE || currentSessionStatus === SESSION_STATUS.NEEDS_AGENT) && ( <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '10px' }}> <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', borderRadius: '20px', backgroundColor: colors.bgMain, padding: '0 8px 0 15px', border: `1px solid ${colors.border}` }}> <button onClick={() => setShowPicker(val => !val)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', marginRight: '10px' }} title="Insertar emoji" > <svg fill={colors.textSec} height="24px" width="24px" viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"></path></svg> </button> <textarea value={agentInput} onChange={(e) => setAgentInput(e.target.value)} placeholder="Escribe un mensaje" rows={1} style={{ flexGrow: 1, padding: '10px 0', border: 'none', backgroundColor: 'transparent', color: colors.textPrimary, resize: 'none', outline: 'none', minHeight: '22px', maxHeight: '100px', overflowY: 'auto', lineHeight: '1.4' }} onKeyPress={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleSendReply(); } }} onInput={(e) => { e.target.style.height = 'auto'; let scrollHeight = e.target.scrollHeight; const maxHeight = 100; if (scrollHeight > maxHeight) { e.target.style.height = maxHeight + 'px'; e.target.style.overflowY = 'auto'; } else { e.target.style.height = scrollHeight + 'px'; e.target.style.overflowY = 'hidden'; } }} /> </div> <button onClick={handleSendReply} style={{ ...buttonBaseStyle, backgroundColor: colors.btnSend, padding: '10px 20px', alignSelf: 'flex-end' }} onMouseEnter={buttonHoverStyle} onMouseLeave={(e) => buttonLeaveStyle(e)}> Enviar </button> </div> )}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}> {!isBlocked && !isArchived ? ( <> {currentSessionStatus === SESSION_STATUS.AGENT_ACTIVE ? ( <button onClick={() => handleChangeSessionState(SESSION_STATUS.BOT_ACTIVE)} style={{ ...buttonBaseStyle, backgroundColor: colors.btnGreen }} onMouseEnter={buttonHoverStyle} onMouseLeave={buttonLeaveStyle}>Devolver al Bot</button> ) : ( (currentSessionStatus === SESSION_STATUS.BOT_ACTIVE || currentSessionStatus === SESSION_STATUS.NEEDS_AGENT) && <button onClick={() => handleChangeSessionState(SESSION_STATUS.AGENT_ACTIVE)} style={{ ...buttonBaseStyle, backgroundColor: colors.btnYellow }} onMouseEnter={buttonHoverStyle} onMouseLeave={buttonLeaveStyle} >{currentSessionStatus === SESSION_STATUS.NEEDS_AGENT ? 'Atender Chat' : 'Tomar Chat'}</button> )} </> ) : ( isBlocked && !isArchived && <button onClick={handleUnblockSession} style={{ ...buttonBaseStyle, backgroundColor: colors.btnBlue }} onMouseEnter={buttonHoverStyle} onMouseLeave={buttonLeaveStyle}>Desbloquear</button> )} </div>
            </div>
        </div>
    );
}

export default ChatView;
