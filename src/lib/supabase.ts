import { createClient } from '@supabase/supabase-js';

// Instância oficial do Supabase da TENNO
const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL || 'https://dwqmlzcwfpmjywhliket.supabase.co';
const supabaseAnonKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_3aM8VD_Dcf2sGslkUtTIpQ_kS54fuGU';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
