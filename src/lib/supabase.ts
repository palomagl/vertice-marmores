import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase. Preencha .env.local com as chaves do projeto da Vértice.
 * Enquanto não houver chaves, `supabase` é null e o app roda 100% local
 * (o que é o comportamento esperado na casa do cliente — ver seção 11).
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anon ? createClient(url, anon) : null;

export const temSupabase = supabase != null;
