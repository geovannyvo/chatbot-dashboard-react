// src/ChatbotInteractions.js
import React, { useState, useEffect } from 'react';
import { supabase, getChatHistory } from './supabaseClient';

function ChatbotInteractions() {
  const [groupedInteractions, setGroupedInteractions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const formatInteractionData = (item) => {
    // console.log('[DEBUG] formatInteractionData - Input item:', item, 'Input item.time:', item?.time);
    const messageType = item.message?.type || 'unknown';
    const messageContent = item.message?.content || 'Mensaje vacío';
    const interactionTime = item.time; // Capturamos time aquí
    // console.log('[DEBUG] formatInteractionData - Captured time:', interactionTime);
    return {
      id: item.id,
      sessionId: item.session_id,
      type: messageType,
      content: messageContent,
      time: interactionTime, // Aseguramos que time se retorna
    };
  };

  // Función para agrupar y ordenar tanto interacciones como sesiones
  const processAndSetGroupedInteractions = (interactionsArray) => {
   // console.log('[DEBUG] processAndSetGroupedInteractions - Input interactionsArray:', interactionsArray);
    if (!interactionsArray || interactionsArray.length === 0) {
      setGroupedInteractions({});
      return {}; // Retornar el nuevo estado para la suscripción
    }

    const formattedAndSortedInteractions = [...interactionsArray]
      .map(item => (item.time && item.sessionId ? item : formatInteractionData(item))) // Formatear solo si no está ya formateado
      .sort((a, b) => new Date(a.time) - new Date(b.time)); // Asegurar orden cronológico (viejos primero)
   // console.log('[DEBUG] processAndSetGroupedInteractions - formattedAndSortedInteractions (viejos primero):', formattedAndSortedInteractions);

    const groupedBySession = formattedAndSortedInteractions.reduce((acc, interaction) => {
      const sessionId = interaction.sessionId;
      if (!acc[sessionId]) {
        acc[sessionId] = { messages: [], lastMessageTime: 0 };
      }
      acc[sessionId].messages.push(interaction);
      const interactionTimeMs = new Date(interaction.time).getTime();
      if (!isNaN(interactionTimeMs)) { // Asegurarse que es un número válido
        acc[sessionId].lastMessageTime = Math.max(acc[sessionId].lastMessageTime, interactionTimeMs);
      } else {
        console.warn('[DEBUG] processAndSetGroupedInteractions - Invalid time for interaction:', interaction);
      }
      return acc;
    }, {});
   // console.log('[DEBUG] processAndSetGroupedInteractions - groupedBySession (con lastMessageTime):', groupedBySession);

    const sortedSessionEntries = Object.entries(groupedBySession)
      .sort(([, sessionA], [, sessionB]) => sessionB.lastMessageTime - sessionA.lastMessageTime); // Sesiones con actividad más reciente primero
   // console.log('[DEBUG] processAndSetGroupedInteractions - sortedSessionEntries (sesiones recientes primero):', sortedSessionEntries);

    const finalGroupedState = sortedSessionEntries.reduce((obj, [sessionId, sessionData]) => {
      obj[sessionId] = sessionData.messages;
      return obj;
    }, {});
    
   // console.log('[DEBUG] processAndSetGroupedInteractions - finalGroupedState for UI:', finalGroupedState);
    setGroupedInteractions(finalGroupedState); // Actualiza el estado principal aquí
    return finalGroupedState; // Retornar el nuevo estado para la suscripción
  };


  useEffect(() => {
    async function initialLoad() {
      try {
        setLoading(true);
        // getChatHistory en supabaseClient.js debe tener .order('time', { ascending: true });
        const rawData = await getChatHistory();
       // console.log('[DEBUG] initialLoad - Datos crudos de getChatHistory:', rawData);
        processAndSetGroupedInteractions(rawData || []); // Llamar a la función centralizada
        setError(null);
      } catch (err) {
        console.error("[DEBUG] initialLoad - Error fetching initial interactions:", err);
        setError(err);
        setGroupedInteractions({});
      } finally {
        setLoading(false);
      }
    }

    initialLoad();

    const channel = supabase
      .channel('public:n8n_chat_histories')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'n8n_chat_histories' },
        (payload) => {
         // console.log('[DEBUG] Suscripción - Nueva interacción (payload.new):', payload.new);
          const newInteraction = formatInteractionData(payload.new);
         // console.log('[DEBUG] Suscripción - Nueva interacción formateada:', newInteraction);

          // Actualizar estado usando el callback para asegurar que usamos el estado más reciente
          setGroupedInteractions(prevGrouped => {
            let allCurrentMessages = [];
            // Desagrupar el estado anterior
            Object.values(prevGrouped).forEach(sessionMessages => {
              allCurrentMessages = allCurrentMessages.concat(sessionMessages);
            });
            // Añadir la nueva interacción
            allCurrentMessages.push(newInteraction);
            // Reprocesar todo (esto llamará a setGroupedInteractions internamente,
            // pero como processAndSetGroupedInteractions retorna el nuevo estado, lo usamos aquí)
            return processAndSetGroupedInteractions(allCurrentMessages);
          });
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
         // console.log('[DEBUG] Suscripción - Conectado a Supabase para n8n_chat_histories!');
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[DEBUG] Suscripción - Error:', err || status);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatDisplayDate = (isoString) => {
    if (!isoString) return 'Fecha no disponible';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) { // Comprobar si la fecha es inválida
        console.warn("[DEBUG] formatDisplayDate - Invalid date string received:", isoString);
        return 'Fecha inválida';
    }
    return date.toLocaleString(); 
  };

  if (loading) return <p>Cargando interacciones...</p>;
  if (error) return <p>Error al cargar las interacciones: {error.message}</p>;

  const sessionIdsInOrder = Object.keys(groupedInteractions);
 // console.log('[DEBUG] Render - sessionIdsInOrder:', sessionIdsInOrder);
 // console.log('[DEBUG] Render - current groupedInteractions state:', groupedInteractions);


  return (
    <div className="chatbot-interactions-container">
      <h2>Interacciones del Chatbot</h2>
      {sessionIdsInOrder.length > 0 ? (
        sessionIdsInOrder.map(sessionId => (
          <div key={sessionId} className="session-group">
            <h3>Sesión: {sessionId}</h3>
            <ul className="interactions-list">
              {(groupedInteractions[sessionId] || []).map((interaction) => {
               // console.log('[DEBUG] Render - Renderizando interaction:', interaction, 'Interaction.time:', interaction?.time);
                return (
                 <li key={interaction.id} className={`interaction-item message-${interaction.type}`}>
                    <div className="message-header">
                      <strong>{interaction.type === 'human' ? 'Usuario' : 'Chatbot'}</strong>
                    </div>
                    <p className="message-content-text">{interaction.content}</p>
                    {interaction.time && (
                      <small className="message-timestamp">
                        Fecha: {formatDisplayDate(interaction.time)}
                      </small>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))
      ) : (
        <p>No hay interacciones registradas.</p>
      )}
      <style jsx="true">{`
        .session-group {
          margin-bottom: 30px;
          padding: 15px;
          border: 1px solid #ccc;
          border-radius: 5px;
          background-color: #f0f8ff;
        }
        .session-group h3 {
          margin-top: 0;
          padding-bottom: 10px;
          border-bottom: 1px solid #ddd;
          color: #0056b3;
        }
        .chatbot-interactions-container {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 20px auto;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
          background-color: #f9f9f9;
        }
        h2 {
          text-align: center;
          color: #333;
        }
        .interactions-list {
          list-style-type: none;
          padding: 0;
        }
        .interaction-item {
          background-color: #fff;
          border: 1px solid #eee;
          border-radius: 5px;
          padding: 15px;
          margin-bottom: 10px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .message-human {
          border-left: 4px solid #007bff;
        }
        .message-ai {
          border-left: 4px solid #28a745;
        }
        .message-unknown {
          border-left: 4px solid #ffc107;
        }
        .message-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .message-header strong {
          font-size: 1.1em;
        }
        .session-id { /* Si decides volver a mostrarlo por mensaje */
          font-size: 0.9em;
          color: #666;
          background-color: #e9ecef;
          padding: 2px 6px;
          border-radius: 3px;
        }
        .message-content-text {
          margin: 10px 0;
          color: #333;
          line-height: 1.6;
        }
        .message-timestamp {
          font-size: 0.8em;
          color: #777;
          display: block;
          text-align: right;
          margin-top: 8px;
        }
      `}</style>
    </div>
  );
}

export default ChatbotInteractions;