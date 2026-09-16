import { createClient } from '@supabase/supabase-js';

const HARDCODED_SERVICE_ROLE = 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cW1semN3ZnBtanl3aGxpa2V0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDYxNzIyOCwiZXhwIjoyMDcwMTkzMjI4fQ.BlGV75Ns9joxay1j3cve2NbJaOr3_-k_YeKtcrf6ir4';

function getValidServiceRoleKey(): string {
  const candidate = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (candidate) {
    try {
      const parts = candidate.split('.');
      if (parts.length === 3) {
        const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        if (decoded && decoded.role === 'service_role') {
          return candidate;
        }
      }
    } catch {
      // Ignora e usa a chave de serviço oficial
    }
  }
  return HARDCODED_SERVICE_ROLE;
}

export const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dwqmlzcwfpmjywhliket.supabase.co';
export const SUPABASE_SERVICE_ROLE_KEY = getValidServiceRoleKey();

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});
