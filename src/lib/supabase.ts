import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

if (typeof window !== 'undefined') {
    if (supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1')) {
        console.warn("Supabase is configured to a local URL. This will not work on mobile devices over a public network (cellular data).");
    }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const isSupabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const assertSupabaseConfigured = () => {
    if (!isSupabaseConfigured) {
        throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    }
};
