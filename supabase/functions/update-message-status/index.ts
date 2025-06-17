// File: supabase/functions/update-message-status/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'x-api-key, authorization, x-client-info, apikey, content-type',
}

console.log("Función 'update-message-status' iniciada.");

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const N8N_SECRET_TOKEN = Deno.env.get('N8N_SECRET_TOKEN');
    const apiKey = req.headers.get('x-api-key');

    if (apiKey !== N8N_SECRET_TOKEN) {
      console.warn("Intento de acceso no autorizado o API Key incorrecta.");
      return new Response(JSON.stringify({ error: 'No autorizado.' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { messageId, status } = await req.json();

    if (!messageId || !status) {
      console.error("Faltan 'messageId' o 'status' en el cuerpo de la solicitud.");
      return new Response(JSON.stringify({ error: "Faltan 'messageId' o 'status'." }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // --- CORRECCIÓN: Se elimina la actualización del campo 'updated_at' que no existe. ---
    const { data, error } = await supabaseClient
      .from('n8n_chat_histories')
      .update({ status: status }) // Solo actualizamos el estado.
      .eq('id', messageId)
      .select()
      .single();

    if (error) {
      console.error("Error al actualizar en Supabase:", error);
      throw error;
    }

    console.log(`Mensaje ${messageId} actualizado exitosamente al estado: ${status}.`);

    return new Response(JSON.stringify({ success: true, updatedMessage: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Ha ocurrido un error inesperado:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})
