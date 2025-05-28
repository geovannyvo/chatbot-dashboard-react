// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// 1. Cargar las variables de entorno
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const N8N_WEBHOOK_URL = process.env.REACT_APP_N8N_AGENT_WEBHOOK_URL;

// 2. Verificar que las variables se cargaron (¡Importante!)
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("¡ERROR CRÍTICO! Las variables de entorno de Supabase (REACT_APP_SUPABASE_URL o REACT_APP_SUPABASE_ANON_KEY) no están definidas.");
  console.error("Asegúrate de que tu archivo .env está en la raíz del proyecto y has reiniciado el servidor de desarrollo (npm start).");
}

// 3. Crear y exportar el cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- FUNCIONES EXISTENTES ---

export async function getChatHistory(sessionId = null, limit = 150) { // Aumentado a 150 por si acaso
  try {
    let query = supabase
      .from('n8n_chat_histories')
      .select('*')
      .order('time', { ascending: false })
      .limit(limit);

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }
    const { data, error } = await query;
    if (error) { console.error('Error fetching chat history:', error); return null; }
    return data.reverse();
  } catch (err) { console.error('Unexpected error fetching chat history:', err); return null; }
}

export async function getSessionStatus(sessionId) {
    try {
        const { data, error } = await supabase
            .from('chat_sessions_state')
            .select('status')
            .eq('session_id', sessionId)
            .single();
        if (error && error.code !== 'PGRST116') { console.error(`Error fetching status for ${sessionId}:`, error); return 'bot_active'; }
        return data?.status || 'bot_active';
    } catch (err) { console.error(`Unexpected error fetching status for ${sessionId}:`, err); return 'bot_active'; }
}

export async function updateSessionStatus(sessionId, newStatus, agentId = null) {
  try {
    const { error } = await supabase
      .from('chat_sessions_state')
      .upsert({
          session_id: sessionId,
          status: newStatus,
          last_updated: new Date().toISOString(),
          agent_id: agentId,
      }, { onConflict: 'session_id' });
    if (error) { console.error('Error al actualizar estado de sesión:', error); return false; }
    return true;
  } catch (error) { console.error('Error inesperado en updateSessionStatus:', error); return false; }
}

export async function sendAgentMessageViaN8N({ sessionId, messageContent, agentId }) {
    if (!N8N_WEBHOOK_URL || !N8N_WEBHOOK_URL.startsWith('http')) {
        console.error("[SupabaseClient] N8N_WEBHOOK_URL no está configurada correctamente en .env.");
        return { success: false, errorType: "config", details: "Webhook URL no configurada." };
    }
    try {
        const { data: savedMessage, error: saveError } = await supabase
            .from('n8n_chat_histories')
            .insert({
                session_id: sessionId,
                message: { type: 'ai', content: messageContent },
                time: new Date().toISOString(),
                sent_by_agent: true,
                agent_id: agentId
            })
            .select().single();
        if (saveError) { console.error('Error al guardar mensaje de agente:', saveError); return { success: false, details: saveError }; }

        const response = await fetch(N8N_WEBHOOK_URL, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: sessionId, message: messageContent }),
        });
        if (!response.ok) { console.error('Error n8n webhook:', response.statusText); return { success: false, details: `n8n respondió con ${response.status}` }; }
        return { success: true, messageId: savedMessage.id };
    } catch (error) { console.error('Error sendAgentMessageViaN8N:', error); return { success: false, details: error }; }
}

export async function blockSession(sessionId, agentId = null) {
  try {
    const { error: insertError } = await supabase.from('blocked_users').insert({ session_id: sessionId, blocked_by_agent_id: agentId });
    if (insertError && insertError.code !== '23505') { console.error('Error al insertar en blocked_users:', insertError); return false; }
    return await updateSessionStatus(sessionId, 'blocked', agentId);
  } catch (error) { console.error('Error en blockSession:', error); return false; }
}

export async function unblockSession(sessionId) {
  try {
    const { error: deleteError } = await supabase.from('blocked_users').delete().eq('session_id', sessionId);
    if (deleteError) { console.error('Error al eliminar de blocked_users:', deleteError); return false; }
    return await updateSessionStatus(sessionId, 'bot_active', null);
  } catch (error) { console.error('Error en unblockSession:', error); return false; }
}

// --- NUEVA FUNCIÓN ---
/**
 * Guarda un par de Pregunta/Respuesta en la base de conocimiento.
 * @param {string} question - La pregunta del usuario.
 * @param {string} answer - La respuesta del agente.
 * @param {string} agentId - El ID del agente que guarda.
 * @param {number | null} messageId - ID del mensaje original.
 * @param {string | null} sessionId - ID de la sesión original.
 * @returns {Promise<boolean>} - True si tuvo éxito, false si no.
 */
export async function saveToKnowledgeBase(question, answer, agentId, messageId = null, sessionId = null) {
  try {
    console.log(`[SupabaseClient] Guardando en KB: P='${question.substring(0, 20)}...' A='${answer.substring(0, 20)}...'`);

    const { error } = await supabase
      .from('knowledge_base')
      .insert({
        question: question,
        answer: answer,
        created_by_agent_id: agentId,
        source_message_id: messageId,
        source_session_id: sessionId,
      });

    if (error) {
      console.error('Error al guardar en knowledge_base:', error);
      return false;
    }

    console.log('[SupabaseClient] Q&A guardada exitosamente.');
    return true;

  } catch (error) {
    console.error('Error inesperado en saveToKnowledgeBase:', error);
    return false;
  }
}
// --- FIN NUEVA FUNCIÓN ---