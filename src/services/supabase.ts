import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../data/database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

let supabase: SupabaseClient<Database> | null = null;
let configurationError: string | null = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (error) {
    configurationError = error instanceof Error
      ? `The Supabase configuration is invalid. ${error.message}`
      : "The Supabase configuration is invalid.";
  }
}

export const isSupabaseConfigured = supabase !== null;

export function getSupabaseConfigurationError(): string {
  if (configurationError) return configurationError;
  return "Supabase is not configured. Add the project URL and anon key to .env to enable private data storage.";
}

let anonymousUserPromise: Promise<string> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error(getSupabaseConfigurationError());
  }
  return supabase;
}

export async function getBrainDumpUserId(client: SupabaseClient<Database>): Promise<string> {
  if (anonymousUserPromise) return anonymousUserPromise;

  anonymousUserPromise = (async () => {
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    if (sessionData.session?.user) return sessionData.session.user.id;

    const { data, error } = await client.auth.signInAnonymously();
    if (error) {
      throw new Error(
        `Could not start a private workspace session. Enable anonymous sign-ins in Supabase Authentication. ${error.message}`,
      );
    }
    if (!data.user) throw new Error("Supabase did not return a user for this Brain Dump session.");
    return data.user.id;
  })();

  try {
    return await anonymousUserPromise;
  } catch (error) {
    anonymousUserPromise = null;
    throw error;
  }
}
