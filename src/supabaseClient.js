// chatbot-dashboard-react/src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Asegúrate de que estas variables estén en tu archivo .env
// en la raíz de tu proyecto chatbot-dashboard-react
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const N8N_WEBHOOK_URL_AGENT_SENDS = process.env.REACT_APP_N8N_AGENT_WEBHOOK_URL; // Usado para que el agente envíe mensajes

// --- LÍNEA DE DEPURACIÓN AÑADIDA ---
console.log("VERIFICANDO URL DE SUPABASE EN USO:", supabaseUrl);
// --- FIN DE LÍNEA DE DEPURACIÓN ---

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("¡ERROR CRÍTICO! Variables de Supabase no definidas en .env para chatbot-dashboard-react.");
}
if (!N8N_WEBHOOK_URL_AGENT_SENDS) {
  console.warn("Advertencia: REACT_APP_N8N_AGENT_WEBHOOK_URL no está definida en .env. Enviar mensajes como agente podría fallar.");
}

export const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

// --- FUNCIONES PARA EL DASHBOARD DE AGENTE ---

/**
 * Obtiene el perfil del usuario/agente actualmente logueado.
 * Crucial para verificar 'needs_password_change'.
 */
export async function getCurrentUserProfile() {
  if (!supabase) {
    console.error("getCurrentUserProfile: Cliente Supabase no inicializado.");
    return null;
  }
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session || !session.user) {
    if (sessionError) console.error("Error obteniendo sesión en getCurrentUserProfile:", sessionError);
    return null;
  }

  try {
    const { data: profile, error, status } = await supabase
      .from('profiles')
      .select('id, role, email, full_name, needs_password_change') // Incluye needs_password_change
      .eq('id', session.user.id)
      .single();

    if (error && status !== 406) { // 406 = no rows found
      console.error('Error fetching current user profile:', error);
      return null;
    }
    if (!profile && status === 406) {
        console.warn("No se encontró perfil para el usuario actual:", session.user.id, "Asegúrate de que el trigger handle_new_user está funcionando correctamente.");
        return null;
    }
    return profile;
  } catch (err) {
    console.error('Error inesperado obteniendo perfil de usuario actual:', err);
    return null;
  }
}

/**
 * Actualiza el flag 'needs_password_change' para un usuario.
 * @param {string} userId - El ID del usuario (debe ser el del usuario logueado).
 * @param {boolean} needsChange - El nuevo valor para el flag.
 * @returns {Promise<boolean>}
 */
export async function updateUserPasswordChangeFlag(userId, needsChange) {
  if (!userId || !supabase) {
    console.error("updateUserPasswordChangeFlag: Faltan parámetros o cliente no inicializado.");
    return false;
  }
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        needs_password_change: needsChange,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId); // Asegura que solo actualice su propio perfil

    if (error) {
      console.error('Error actualizando flag needs_password_change:', error);
      return false;
    }
    console.log(`Flag needs_password_change para ${userId} actualizado a ${needsChange}`);
    return true;
  } catch (err) {
    console.error('Error inesperado actualizando flag needs_password_change:', err);
    return false;
  }
}

// --- Funciones que ya teníamos para el chat ---

export async function getChatHistory(sessionId = null, limit = 100) {
  if (!supabase) return null;
  try {
    let query = supabase.from('n8n_chat_histories').select('*').order('time', { ascending: false }).limit(limit);
    if (sessionId) query = query.eq('session_id', sessionId);
    const { data, error } = await query;
    if (error) { console.error('Error fetching chat history:', error); return null; }
    return data?.reverse() || []; // Devuelve array vacío si data es null
  } catch (err) { console.error('Unexpected error fetching chat history:', err); return null; }
}

// --- VERSIÓN REFINADA DE getSessionStatus ---
export async function getSessionStatus(sessionId) {
  // Define un estado por defecto completo que coincida con la estructura de tu tabla chat_sessions_state
  // Ajusta los campos y valores por defecto según sea necesario.
  const defaultState = {
    session_id: sessionId, // Incluye el session_id para consistencia si no se encuentra
    status: 'bot_active',
    agent_id: null,
    is_pinned: false,
    last_updated: new Date().toISOString() // O null si prefieres no tener un timestamp por defecto
  };

  if (!supabase) {
    console.warn("getSessionStatus: Cliente Supabase no inicializado. Devolviendo estado por defecto.");
    return defaultState;
  }

  if (!sessionId) {
    console.warn("getSessionStatus: sessionId es nulo o indefinido. Devolviendo estado por defecto.");
    // Devuelve el defaultState, pero con session_id explícitamente null si ese fue el caso.
    return { ...defaultState, session_id: null };
  }

  try {
    const { data, error } = await supabase
      .from('chat_sessions_state')
      // Selecciona explícitamente los campos que esperas de la tabla
      .select('session_id, status, agent_id, is_pinned, last_updated')
      .eq('session_id', sessionId)
      .maybeSingle(); // <--- Usa maybeSingle() para evitar error si no hay fila

    if (error) {
      // Con maybeSingle(), un error aquí es un problema de base de datos/red, no "0 filas".
      console.error(`Error al obtener el estado de la sesión ${sessionId} desde Supabase:`, error);
      return defaultState; // Devuelve el estado por defecto en caso de error real.
    }

    // Si data es null (porque no se encontró la fila y maybeSingle() no da error por eso),
    // devuelve el estado por defecto. De lo contrario, devuelve los datos encontrados.
    // El objeto 'data', si existe, tendrá los campos seleccionados.
    // Si 'data' es null, se usa 'defaultState'.
    return data || defaultState;

  } catch (err) {
    // Captura cualquier otro error inesperado durante la ejecución de esta función.
    console.error(`Error inesperado en getSessionStatus para la sesión ${sessionId}:`, err);
    return defaultState;
  }
}
// --- FIN DE VERSIÓN REFINADA DE getSessionStatus ---

export async function updateSessionStatus(sessionId, newStatus, agentId = null) {
  if (!supabase) return false;
  try {
    // Asegúrate que los campos aquí (status, agent_id, last_updated)
    // sean consistentes con lo que esperas en getSessionStatus
    const updateData = {
        session_id: sessionId,
        status: newStatus,
        agent_id: agentId,
        last_updated: new Date().toISOString()
    };
    // Si el estado es 'bot_active', no debería haber agent_id (a menos que tu lógica lo requiera)
    // Si estás devolviendo al bot, agent_id usualmente es null.
    if (newStatus === 'bot_active' || newStatus === 'archived' || newStatus === 'blocked') {
        // updateData.agent_id = null; // Descomenta si esta es la regla general
    }


    const { error } = await supabase.from('chat_sessions_state').upsert(updateData, { onConflict: 'session_id' });
    if (error) { console.error('Error updating session status:', error); return false; }
    return true;
  } catch (err) { console.error('Error inesperado en updateSessionStatus:', err); return false; }
}

// Para que el AGENTE envíe mensajes
export async function sendAgentMessageViaN8N({ sessionId, messageContent, agentId }) {
  if (!N8N_WEBHOOK_URL_AGENT_SENDS || !N8N_WEBHOOK_URL_AGENT_SENDS.startsWith('http')) {
    return { success: false, errorType: "config", details: "REACT_APP_N8N_AGENT_WEBHOOK_URL no configurada." };
  }
  if (!supabase) return { success: false, errorType: "supabase", details: "Cliente Supabase no inicializado." };

  try {
    const { data: savedMessage, error: saveError } = await supabase.from('n8n_chat_histories').insert({
        session_id: sessionId, message: { type: 'ai', content: messageContent }, // 'ai' podría ser 'agent' para claridad
        time: new Date().toISOString(), sent_by_agent: true, agent_id: agentId
    }).select().single(); // .single() aquí asume que la inserción siempre es exitosa y devuelve una fila.
    if (saveError) { return { success: false, errorType: "supabase_save", details: saveError }; }

    const response = await fetch(N8N_WEBHOOK_URL_AGENT_SENDS, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionId, message: messageContent, agentId: agentId }),
    });
    if (!response.ok) { return { success: false, errorType: "n8n_webhook", details: `n8n respondió con ${response.status}` }; }
    return { success: true, messageId: savedMessage.id };
  } catch (error) { return { success: false, errorType: "network_or_code", details: error }; }
}

export async function setPinStatus(sessionId, newPinnedState) {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('chat_sessions_state')
      .update({ is_pinned: newPinnedState, last_updated: new Date().toISOString() })
      .eq('session_id', sessionId);
    // Deberías verificar si la actualización fue exitosa, no solo si hay error.
    // Por ejemplo, si la session_id no existe, update no dará error pero no actualizará nada.
    // Sin embargo, para este caso, si no existe, getSessionStatus ya daría un default.
    if (error) { console.error(`Error setting pin status for ${sessionId}:`, error); return false; }
    return true;
  } catch (error) { console.error(`Unexpected error in setPinStatus for ${sessionId}:`, error); return false; }
}

export async function archiveSession(sessionId) {
  if (!supabase) return false;
  try {
    // Al archivar, también se resetea is_pinned y agent_id
    const { error } = await supabase.from('chat_sessions_state')
      .update({ status: 'archived', agent_id: null, is_pinned: false, last_updated: new Date().toISOString() })
      .eq('session_id', sessionId);
    if (error) { console.error(`Error archiving session ${sessionId}:`, error); return false; }
    return true;
  } catch (error) { console.error(`Unexpected error in archiveSession for ${sessionId}:`, error); return false; }
}

export async function unarchiveSession(sessionId) {
  if (!supabase) return false;
  try {
    // Al desarchivar, se asume que vuelve a bot_active y sin agente asignado.
    // is_pinned no se modifica aquí, se maneja por setPinStatus.
    const { error } = await supabase.from('chat_sessions_state')
      .update({ status: 'bot_active', agent_id: null, last_updated: new Date().toISOString() })
      .eq('session_id', sessionId);
    if (error) { console.error(`Error unarchiving session ${sessionId}:`, error); return false; }
    return true;
  } catch (error) { console.error(`Unexpected error in unarchiveSession for ${sessionId}:`, error); return false; }
}

export async function blockSession(sessionId, agentId = null) { // Asumimos que el agente que bloquea es el logueado
  if (!supabase) return false;
  try {
    // Primero intenta insertar en blocked_users
    const { error: insertError } = await supabase.from('blocked_users').insert({
        session_id: sessionId,
        blocked_by_agent_id: agentId,
        // blocked_at se podría añadir aquí con DEFAULT NOW() en la DB o explícitamente
    });
    // Si el error es '23505' (violación de unicidad), significa que ya estaba bloqueado. No es un fallo crítico.
    if (insertError && insertError.code !== '23505') {
        console.error(`Error inserting into blocked_users for session ${sessionId}:`, insertError);
        return false;
    }
    // Luego actualiza el estado en chat_sessions_state
    return await updateSessionStatus(sessionId, 'blocked', agentId);
  } catch (error) { console.error(`Unexpected error in blockSession for ${sessionId}:`, error); return false; }
}

export async function unblockSession(sessionId) {
  if (!supabase) return false;
  try {
    const { error: deleteError } = await supabase.from('blocked_users').delete().eq('session_id', sessionId);
    if (deleteError) {
        // Podrías querer diferenciar 'no row to delete' de otros errores.
        console.error(`Error deleting from blocked_users for session ${sessionId}:`, deleteError);
        return false;
    }
    // Al desbloquear, se pasa a bot_active y se quita el agente.
    return await updateSessionStatus(sessionId, 'bot_active', null);
  } catch (error) { console.error(`Unexpected error in unblockSession for ${sessionId}:`, error); return false; }
}

export async function saveToKnowledgeBase(question, answer, agentId, messageId = null, sessionId = null) {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('knowledge_base').insert({
        question,
        answer,
        created_by_agent_id: agentId,
        source_message_id: messageId, // Asegúrate que estos nombres de columna coincidan con tu tabla
        source_session_id: sessionId,
        // created_at suele ser manejado por la BD con DEFAULT NOW()
    });
    if (error) { console.error('Error al guardar en knowledge_base:', error); return false; }
    return true;
  } catch (error) { console.error('Error inesperado en saveToKnowledgeBase:', error); return false; }
}