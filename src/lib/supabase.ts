/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

let supabaseClient: ReturnType<typeof createClient> | null = null;
let initAttempted = false;

export const getSupabase = (): ReturnType<typeof createClient> | null => {
  if (supabaseClient) return supabaseClient;
  if (initAttempted) return null;

  initAttempted = true;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[Supabase] Credenciais não encontradas (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). Operando em modo local.');
    return null;
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseClient;
};

// Export a proxy that returns null-safe operations
export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get: (_target, prop) => {
    const client = getSupabase();
    if (!client) return undefined;
    return (client as any)[prop];
  }
});

