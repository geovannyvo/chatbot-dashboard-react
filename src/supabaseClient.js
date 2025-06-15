// chatbot-dashboard-react/src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';
import { toast } from 'react-toastify'; // <-- Importación añadida

// Asegúrate de que estas variables estén en tu archivo .env
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
const N8N_WEBHOOK_URL_AGENT_SENDS = process.env.REACT_APP_N8N_AGENT_WEBHOOK_URL;

console.log("VERIFICANDO URL DE SUPABASE EN USO:", supabaseUrl);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("¡ERROR CRÍTICO! Variables de Supabase no definidas en .env para chatbot-dashboard-react.");
}
if (!N8N_WEBHOOK_URL_AGENT_SENDS) {
  console.warn("Advertencia: REACT_APP_N8N_AGENT_WEBHOOK_URL no está definida en .env. Enviar mensajes como agente podría fallar.");
}

export const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

// --- FUNCIONES PARA EL DASHBOARD DE AGENTE ---

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
      .select('id, role, email, full_name, needs_password_change')
      .eq('id', session.user.id)
      .single();

    if (error && status !== 406) {
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
      .eq('id', userId);

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
    return data?.reverse() || [];
  } catch (err) { console.error('Unexpected error fetching chat history:', err); return null; }
}

export async function getSessionStatus(sessionId) {
  const defaultState = {
    session_id: sessionId,
    status: 'bot_active',
    agent_id: null,
    is_pinned: false,
    last_updated: new Date().toISOString()
  };

  if (!supabase) {
    console.warn("getSessionStatus: Cliente Supabase no inicializado. Devolviendo estado por defecto.");
    return defaultState;
  }

  if (!sessionId) {
    console.warn("getSessionStatus: sessionId es nulo o indefinido. Devolviendo estado por defecto.");
    return { ...defaultState, session_id: null };
  }

  try {
    const { data, error } = await supabase
      .from('chat_sessions_state')
      .select('session_id, status, agent_id, is_pinned, last_updated')
      .eq('session_id', sessionId)
      .maybeSingle();

    if (error) {
      console.error(`Error al obtener el estado de la sesión ${sessionId} desde Supabase:`, error);
      return defaultState;
    }
    return data || defaultState;
  } catch (err) {
    console.error(`Error inesperado en getSessionStatus para la sesión ${sessionId}:`, err);
    return defaultState;
  }
}

export async function updateSessionStatus(sessionId, newStatus, agentId = null) {
  if (!supabase) return false;
  try {
    const updateData = {
      session_id: sessionId,
      status: newStatus,
      agent_id: agentId,
      last_updated: new Date().toISOString()
    };
    const { error } = await supabase.from('chat_sessions_state').upsert(updateData, { onConflict: 'session_id' });
    if (error) { console.error('Error updating session status:', error); return false; }
    return true;
  } catch (err) { console.error('Error inesperado en updateSessionStatus:', err); return false; }
}

export async function sendAgentMessageViaN8N({ sessionId, messageContent, agentId }) {
  if (!N8N_WEBHOOK_URL_AGENT_SENDS || !N8N_WEBHOOK_URL_AGENT_SENDS.startsWith('http')) {
    return { success: false, errorType: "config", details: "REACT_APP_N8N_AGENT_WEBHOOK_URL no configurada." };
  }
  if (!supabase) return { success: false, errorType: "supabase", details: "Cliente Supabase no inicializado." };

  try {
    const { data: savedMessage, error: saveError } = await supabase.from('n8n_chat_histories').insert({
      session_id: sessionId, message: { type: 'ai', content: messageContent },
      time: new Date().toISOString(), sent_by_agent: true, agent_id: agentId
    }).select().single();
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
    if (error) { console.error(`Error setting pin status for ${sessionId}:`, error); return false; }
    return true;
  } catch (error) { console.error(`Unexpected error in setPinStatus for ${sessionId}:`, error); return false; }
}

export async function archiveSession(sessionId) {
  if (!supabase) return false;
  try {
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
    const { error } = await supabase.from('chat_sessions_state')
      .update({ status: 'bot_active', agent_id: null, last_updated: new Date().toISOString() })
      .eq('session_id', sessionId);
    if (error) { console.error(`Error unarchiving session ${sessionId}:`, error); return false; }
    return true;
  } catch (error) { console.error(`Unexpected error in unarchiveSession for ${sessionId}:`, error); return false; }
}

export async function blockSession(sessionId, agentId = null) {
  if (!supabase) return false;
  try {
    const { error: insertError } = await supabase.from('blocked_users').insert({
      session_id: sessionId,
      blocked_by_agent_id: agentId,
    });
    if (insertError && insertError.code !== '23505') {
      console.error(`Error inserting into blocked_users for session ${sessionId}:`, insertError);
      return false;
    }
    return await updateSessionStatus(sessionId, 'blocked', agentId);
  } catch (error) { console.error(`Unexpected error in blockSession for ${sessionId}:`, error); return false; }
}

export async function unblockSession(sessionId) {
  if (!supabase) return false;
  try {
    const { error: deleteError } = await supabase.from('blocked_users').delete().eq('session_id', sessionId);
    if (deleteError) {
      console.error(`Error deleting from blocked_users for session ${sessionId}:`, deleteError);
      return false;
    }
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
      source_message_id: messageId,
      source_session_id: sessionId,
    });
    if (error) { console.error('Error al guardar en knowledge_base:', error); return false; }
    return true;
  } catch (error) { console.error('Error inesperado en saveToKnowledgeBase:', error); return false; }
}

// --- FUNCIONES PARA LA GESTIÓN DE CONTACTOS ---

/**
 * Obtiene todos los contactos de la base de datos.
 * @returns {Promise<Array>} Una lista de objetos de contacto.
 */
export async function getContacts() {
    if (!supabase) return [];
    const { data, error } = await supabase
        .from('contacts')
        .select('phone_number, display_name');

    if (error) {
        console.error("Error al obtener contactos:", error);
        return [];
    }
    return data;
}

/**
 * Añade un nuevo contacto o actualiza el nombre de uno existente.
 * La base de datos se encarga de manejar el conflicto en 'phone_number' gracias a la restricción UNIQUE.
 * @param {string} phoneNumber - El número de teléfono del contacto.
 * @param {string} displayName - El nombre a mostrar para el contacto.
 * @param {string} agentId - El ID del agente que crea/actualiza el contacto.
 * @returns {Promise<Object|null>} El contacto creado/actualizado o null si hay un error.
 */
export async function addOrUpdateContact(phoneNumber, displayName, agentId) {
    if (!phoneNumber || !displayName || !agentId) {
        console.error("Faltan datos para crear/actualizar el contacto.");
        return null;
    }
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('contacts')
        .upsert(
            {
                phone_number: phoneNumber,
                display_name: displayName,
                created_by: agentId
            },
            {
                onConflict: 'phone_number', // Si el número ya existe, actualiza los otros campos.
            }
        )
        .select()
        .single();

    if (error) {
        console.error("Error al añadir o actualizar contacto:", error);
        toast.error("No se pudo guardar el contacto.");
        return null;
    }

    toast.success(`Contacto "${displayName}" guardado.`);
    return data;
}
