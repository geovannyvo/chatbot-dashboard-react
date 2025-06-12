// supabase/functions/vectorize-knowledge-base/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { OpenAI } from 'https://esm.sh/openai@4.29.2'

// ¡NUEVO! Definimos los encabezados directamente aquí.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') })

Deno.serve(async (req) => {
  // Manejo de CORS, es una buena práctica tenerlo
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Obtenemos el nuevo registro de la tabla knowledge_base que nos envía el trigger
    const { record } = await req.json()
    const { id, pregunta, respuesta } = record

    // Combinamos el texto para darle más contexto al embedding
    const content = `Pregunta: ${pregunta}\nRespuesta: ${respuesta}`

    // 1. Creamos el embedding (vector) con el modelo de OpenAI
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: content,
    })
    const embedding = embeddingResponse.data[0].embedding

    // 2. Preparamos la metadata con la respuesta limpia que usará el bot
    const metadata = {
      clean_answer: respuesta,
      source_id: id,
      question: pregunta
    }
    
    // Creamos un cliente de Supabase para poder escribir en la tabla 'documents'
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )
    
    // 3. Insertamos o actualizamos (upsert) el documento vectorizado en la tabla 'documents'
    const { error } = await supabaseClient.from('documents').upsert({
      id: id, // Usamos el mismo ID de la knowledge_base
      content: content,
      metadata: metadata,
      embedding: embedding,
    })

    if (error) throw error

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(String(err?.message ?? err), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})