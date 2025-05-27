// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Error Crítico: Supabase URL o Anon Key no están definidas. " +
    "Verifica tus variables de entorno (.env) y reinicia el servidor de desarrollo."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

if (supabaseUrl) {
    const urlParts = supabaseUrl.split('.');
    const projectRef = urlParts.length > 1 ? urlParts[0].split('//')[1] : "URL_incompleta";
    console.log(`[SupabaseClient] Initialized for Supabase project ref: ${projectRef}`);
}

/**
 * Obtiene el historial de chat.
 * Si no se especifica sessionIdToFilterBy, trae los 'initialLoadLimit' mensajes más recientes globalmente.
 * Si se especifica sessionIdToFilterBy, trae todos los mensajes de esa sesión.
 * @param {string} [sessionIdToFilterBy] - Opcional. Filtra mensajes por este ID de sesión.
 * @param {number} [initialLoadLimit=50] - Número de mensajes más recientes a cargar inicialmente si no se filtra por sesión.
 * @returns {Promise<Array>} Interacciones o array vacío en caso de error.
 */
export async function getChatHistory(sessionIdToFilterBy, initialLoadLimit = 50) {
  if (!supabase.auth) {
    console.error("[SupabaseClient] getChatHistory - Supabase client no inicializado.");
    return [];
  }

  let query;

  if (sessionIdToFilterBy) {
    console.log(`[SupabaseClient] getChatHistory: Fetching all messages for session ${sessionIdToFilterBy}, ordered chronologically.`);
    query = supabase
      .from('n8n_chat_histories')
      .select('*') // Incluye sent_by_agent
      .eq('session_id', sessionIdToFilterBy)
      .order('time', { ascending: true }); // Mensajes más antiguos primero para esta sesión
  } else {
    console.log(`[SupabaseClient] getChatHistory: Fetching last ${initialLoadLimit} messages globally, ordered most recent first.`);
    query = supabase
      .from('n8n_chat_histories')
      .select('*') // Incluye sent_by_agent
      .order('time', { ascending: false }) // Mensajes más recientes primero globalmente
      .limit(initialLoadLimit);
  }

  try {
    const { data, error } = await query;
    if (error) {
      console.error('[SupabaseClient] Error en getChatHistory:', error);
      return [];
    }
    // Si la carga global fue descending, la invertimos aquí para que en React siempre se manejen ascending
    // antes de agrupar, para consistencia dentro de las sesiones.
    const finalData = (data && !sessionIdToFilterBy) ? data.reverse() : (data || []);
    console.log('[SupabaseClient] Data fetched by getChatHistory (count):', finalData.length);
    return finalData;
  } catch (err) {
    console.error('[SupabaseClient] Excepción en getChatHistory:', err);
    return [];
  }
}

// --- sendAgentMessageViaN8N, getSessionStatus, updateSessionStatus ---
// (Estas funciones se mantienen igual que en la última versión completa que te proporcioné,
//  asegúrate de tener la versión que incluye el manejo de `agentId` y la llamada al webhook.)

export async function sendAgentMessageViaN8N({ sessionId, messageContent, agentId = null }) {
  if (!supabase.auth) {
    console.error("[SupabaseClient] sendAgentMessageViaN8N - Supabase client no inicializado.");
    return { success: false, errorType: 'config', details: 'Supabase client no inicializado' };
  }
  console.log(`[SupabaseClient] Attempting to send agent message. Session: ${sessionId}, Message: ${messageContent}, AgentID: ${agentId}`);

  const agentMessageJsonForSupabase = {
    type: 'ai', // Mensajes de agente se guardan con type 'ai' para la memoria del bot
    content: messageContent,
  };

  // 1. Guardar mensaje del agente en Supabase
  const { data: supabaseInsertData, error: supabaseInsertError } = await supabase
    .from('n8n_chat_histories')
    .insert([{
      session_id: sessionId,
      message: agentMessageJsonForSupabase,
      sent_by_agent: true,
    }])
    .select()
    .single();

  if (supabaseInsertError) {
    console.error('[SupabaseClient] Error saving agent message to Supabase:', supabaseInsertError);
    return { success: false, errorType: 'supabase_message_insert', details: supabaseInsertError };
  }
  console.log('[SupabaseClient] Agent message saved to Supabase:', supabaseInsertData);

  // 2. Actualizar el estado de la sesión a 'agent_active'
  const statusUpdateResult = await updateSessionStatus(sessionId, 'agent_active', agentId);
  if (!statusUpdateResult) {
    console.warn(`[SupabaseClient] Failed to update session ${sessionId} status to agent_active, but message was processed in Supabase.`);
  }

  // 3. Llamar al webhook de n8n para enviar a WhatsApp
  const n8nWebhookUrl = process.env.REACT_APP_N8N_AGENT_WEBHOOK_URL;
  const placeholderUrl = 'PON_AQUI_TU_URL_DEL_WEBHOOK_DE_N8N_PARA_ENVIAR_WHATSAPP';

  if (!n8nWebhookUrl || n8nWebhookUrl === placeholderUrl || n8nWebhookUrl.trim() === '') {
    console.warn("[SupabaseClient] N8N Webhook URL no configurada o es placeholder. El mensaje NO se enviará a WhatsApp.");
    return { success: true, data: supabaseInsertData, warning: 'N8N Webhook URL no configurada o es placeholder' };
  }

  try {
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient_whatsapp_id: sessionId,
        text_message: messageContent,
      }),
    });

    if (!response.ok) {
      const errorDataN8N = await response.json().catch(() => ({ message: "Error desconocido al parsear respuesta de n8n" }));
      console.error(`[SupabaseClient] Error sending message via n8n to WhatsApp (${response.status}):`, errorDataN8N);
      return { success: false, errorType: 'n8n_webhook', details: errorDataN8N, savedToSupabase: true, supabaseData: supabaseInsertData };
    }

    const n8nResponseData = await response.json().catch(() => ({}));
    console.log('[SupabaseClient] Message sent via n8n to WhatsApp:', n8nResponseData);
    return { success: true, data: supabaseInsertData };

  } catch (networkError) {
    console.error('[SupabaseClient] Network error calling n8n webhook:', networkError);
    return { success: false, errorType: 'network', details: networkError, savedToSupabase: true, supabaseData: supabaseInsertData };
  }
}

export async function getSessionStatus(sessionId) {
  if (!supabase.auth) { return 'bot_active'; }
  if (!sessionId) { return 'bot_active'; }
  try {
    const { data, error } = await supabase
      .from('chat_sessions_state')
      .select('status, agent_id')
      .eq('session_id', sessionId)
      .maybeSingle();
    if (error) { console.error('[SupabaseClient] Error obteniendo estado de sesión para', sessionId, ':', error); return 'bot_active'; }
    return data ? data.status : 'bot_active';
  } catch (err) { console.error('[SupabaseClient] Excepción en getSessionStatus para', sessionId, ':', err); return 'bot_active'; }
}

export async function updateSessionStatus(sessionId, newStatus, agentId = null) {
  if (!supabase.auth) { return null; }
  if (!sessionId) { console.error('[SupabaseClient] updateSessionStatus: sessionId es undefined.'); return null; }
  const updatePayload = { session_id: sessionId, status: newStatus, last_updated: new Date().toISOString() };
  if (agentId && typeof agentId === 'string') { updatePayload.agent_id = agentId; }
  else if (agentId) { console.warn(`[SupabaseClient] updateSessionStatus: agentId para sesión ${sessionId} no es string válido. Valor:`, agentId); }
  try {
    const { data, error } = await supabase
      .from('chat_sessions_state')
      .upsert(updatePayload, { onConflict: 'session_id' })
      .select().single();
    if (error) { console.error(`[SupabaseClient] Error actualizando estado de sesión ${sessionId} a ${newStatus}:`, error); return null; }
    console.log(`[SupabaseClient] Sesión ${sessionId} actualizada a ${newStatus} (Agente: ${agentId || 'N/A'})`);
    return data;
  } catch (err) { console.error(`[SupabaseClient] Excepción en updateSessionStatus para ${sessionId}:`, err); return null; }
}
