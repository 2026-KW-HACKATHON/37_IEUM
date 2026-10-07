import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

if ((supabaseUrl && !supabasePublishableKey) || (!supabaseUrl && supabasePublishableKey)) {
  throw new Error("Supabase URL과 publishable/anon key를 모두 설정해야 합니다.");
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })
  : null;

export function toSupabasePhone(phone) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("82")) return `+${digits}`;
  if (digits.startsWith("0")) return `+82${digits.slice(1)}`;
  return `+82${digits}`;
}

export function toLocalPhone(phone) {
  if (!phone) return "";
  return phone.startsWith("+82") ? `0${phone.slice(3)}` : phone;
}
