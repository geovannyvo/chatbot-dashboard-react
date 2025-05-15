// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tarvkyuezwyskshfgbmz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhcnZreXVlend5c2tzaGZnYm16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwMDA5NjgsImV4cCI6MjA1OTU3Njk2OH0.o7a6RNkolSckxjxYUlTH7SMNS1V8I0JJyZ2lJVJuR-o';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
console.log('Supabase client initialized with URL:', supabaseUrl);

export async function getChatHistory(sessionIdToFilterBy) { // Apertura de getChatHistory
  console.log('Ejecutando getChatHistory...');

  let query = supabase
    .from('n8n_chat_histories')
    .select(`
      id,
      session_id,
      message,
      time
    `)
    .order('time', { ascending: true });

  if (sessionIdToFilterBy) { // Apertura de if
    query = query.eq('session_id', sessionIdToFilterBy);
  } // Cierre de if

  try { // Apertura de try
    const { data, error } = await query;

    if (error) { // Apertura de if (error)
      console.error('Error DENTRO de getChatHistory:', error);
      return [];
    } // Cierre de if (error)

    console.log('Datos obtenidos DENTRO de getChatHistory:', data);
    return data;

  } catch (err) { // Apertura de catch
    console.error('Error de CATCH en getChatHistory:', err);
    return [];
  } // Cierre de catch

} // Cierre de getChatHistory  <--- ESTA ES PROBABLEMENTE LA LÍNEA 41 SEGÚN TU ERROR

// AQUÍ NO DEBERÍA HABER NINGUNA LLAVE EXTRA
// Si tienes otra función, debe empezar con 'export async function otraFuncion() {' etc.