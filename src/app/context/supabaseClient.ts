import { createClient } from "@supabase/supabase-js";
import {
  dbgSupabaseKey,
  dbgGroup,
  dbgOk,
  dbgError,
  dbgGroupEnd,
} from "@/utils/debug";

const SUPABASE_URL = "https://hthnkzwjotwqhvjgqhfv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_KjVW1x9pLbfJ0cbH3UwlzQ_JzfO6Mbw";

// Diagnóstico de key al inicializar (solo en DEV)
dbgSupabaseKey(SUPABASE_URL, SUPABASE_ANON_KEY);

const instrumentedFetch: typeof fetch = async (input, init) => {
  const requestUrl = typeof input === "string" ? input : input.url;
  const isSupabaseRequest = requestUrl.includes("supabase.co");

  if (!isSupabaseRequest) {
    return fetch(input, init);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);
  const t0 = performance.now();

  try {
    const headers = new Headers(init?.headers || {});
    headers.set("cache-control", "no-cache");
    headers.set("pragma", "no-cache");

    const response = await fetch(input, {
      ...init,
      headers,
      cache: "no-store",
      signal: controller.signal,
    });

    const ms = Math.round(performance.now() - t0);
    if (import.meta.env.DEV) {
      console.log(`[SupabaseFetch] ${response.status} ${ms}ms ${requestUrl}`);
    }

    return response;
  } catch (error: any) {
    const ms = Math.round(performance.now() - t0);
    if (import.meta.env.DEV) {
      console.error(
        `[SupabaseFetch] FAIL ${ms}ms ${requestUrl}`,
        error?.name || error?.message || error,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: {
    fetch: instrumentedFetch,
  },
});

// Ping de conexión en DEV — confirma que el cliente puede hablar con Supabase
if (import.meta.env.DEV) {
  setTimeout(async () => {
    dbgGroup("supabase", "Connection ping");
    try {
      const { error } = await supabase
        .from("nutriologos")
        .select("id_nutriologo")
        .limit(1);
      if (error) {
        dbgError(`Ping FALLÓ — verifica URL y API key`, error);
        console.error(
          "[NutriU] Supabase error en ping:",
          error.message,
          "| code:",
          error.code,
        );
      } else {
        dbgOk("Ping OK — Supabase responde correctamente");
      }
    } catch (e) {
      dbgError("Ping EXCEPCIÓN — posible CORS o URL incorrecta", e);
    }
    dbgGroupEnd();
  }, 500);
}
