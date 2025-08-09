import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseUrl, supabaseAnonKey } from './env';

let _supabase: SupabaseClient | null = null;
let _supabaseAnon: SupabaseClient | null = null;

const getSupabase = () => {
  if (_supabase) return _supabase;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not set.');
  }
  _supabase = createClient(supabaseUrl, supabaseAnonKey);
  return _supabase;
};

const getSupabaseAnon = () => {
  if (_supabaseAnon) return _supabaseAnon;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are not set for anon client.');
  }
  _supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return _supabaseAnon;
};

const supabaseSingleton = { get client() { return getSupabase(); } };
const supabaseAnonSingleton = { get client() { return getSupabaseAnon(); } };

export const supabase = supabaseSingleton.client;
export const supabaseAnon = supabaseAnonSingleton.client;
