import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Central Supabase client for general use
// Note: In Next.js 13+, prefer getServerClient for Server Components and getBrowserClient for Client Components
export const supabase = createClient(supabaseUrl, supabaseKey);

// Server Component client with schema specification
export const getServerClient = () =>
  createClient(supabaseUrl, supabaseKey, {
    db: { schema: 'public' },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

// Client Component browser client
export const getBrowserClient = () =>
  createClient(supabaseUrl, supabaseKey, {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

export type SupabaseClient = ReturnType<typeof createClient>;