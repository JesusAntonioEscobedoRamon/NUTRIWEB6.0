/**
 * NutriU — Debug / Diagnóstico
 * Solo activo en DEV. En producción todas las funciones son no-ops.
 */

const IS_DEV = import.meta.env.DEV;

const COLORS = {
  auth: "#4ade80", // verde
  supabase: "#60a5fa", // azul
  screen: "#f97316", // naranja
  error: "#f87171", // rojo
  warn: "#fbbf24", // amarillo
  ok: "#34d399", // esmeralda
};

function badge(label: string, color: string) {
  return [
    `%c ${label} `,
    `background:${color};color:#000;font-weight:bold;border-radius:3px`,
  ];
}

/** Log de sección con color */
export function dbgGroup(
  area: "auth" | "supabase" | "screen" | "error",
  label: string,
) {
  if (!IS_DEV) return;
  const [text, style] = badge(area.toUpperCase(), COLORS[area]);
  console.group(text + ` %c${label}`, style, "font-weight:normal;color:#ccc");
}

export function dbgGroupEnd() {
  if (!IS_DEV) return;
  console.groupEnd();
}

export function dbgLog(msg: string, data?: unknown) {
  if (!IS_DEV) return;
  if (data !== undefined) {
    console.log(`  ▸ ${msg}`, data);
  } else {
    console.log(`  ▸ ${msg}`);
  }
}

export function dbgOk(msg: string, data?: unknown) {
  if (!IS_DEV) return;
  const [text, style] = badge("OK", COLORS.ok);
  if (data !== undefined) {
    console.log(text + ` %c${msg}`, style, "color:#34d399", data);
  } else {
    console.log(text + ` %c${msg}`, style, "color:#34d399");
  }
}

export function dbgWarn(msg: string, data?: unknown) {
  if (!IS_DEV) return;
  const [text, style] = badge("WARN", COLORS.warn);
  if (data !== undefined) {
    console.warn(text + ` %c${msg}`, style, "color:#fbbf24", data);
  } else {
    console.warn(text + ` %c${msg}`, style, "color:#fbbf24");
  }
}

export function dbgError(msg: string, err?: unknown) {
  if (!IS_DEV) return;
  const [text, style] = badge("ERR", COLORS.error);
  if (err !== undefined) {
    console.error(text + ` %c${msg}`, style, "color:#f87171", err);
  } else {
    console.error(text + ` %c${msg}`, style, "color:#f87171");
  }
}

/** Mide cuánto tarda una promesa y la loguea */
export async function dbgTime<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (!IS_DEV) return fn();
  const t0 = performance.now();
  try {
    const result = await fn();
    const ms = (performance.now() - t0).toFixed(0);
    console.log(`  ⏱  ${label}: ${ms}ms`);
    return result;
  } catch (e) {
    const ms = (performance.now() - t0).toFixed(0);
    console.error(`  ⏱  ${label}: ${ms}ms — FAILED`, e);
    throw e;
  }
}

/**
 * Imprime una tabla diagnóstica de la key de Supabase.
 * Llámalo desde supabaseClient.ts al inicializar.
 */
export function dbgSupabaseKey(url: string, key: string) {
  if (!IS_DEV) return;
  dbgGroup("supabase", "Supabase Client Init");

  dbgLog("URL", url);

  const keyType = key.startsWith("eyJ")
    ? "JWT (formato clásico)"
    : key.startsWith("sb_publishable_")
      ? "Publishable Key (formato nuevo v2.90+)"
      : "⚠️  Formato desconocido — puede ser inválida";

  const keyPreview =
    key.length > 20 ? `${key.slice(0, 15)}...${key.slice(-6)}` : key;

  dbgLog("Key type", keyType);
  dbgLog("Key preview", keyPreview);
  dbgLog("Key length", key.length);

  if (!key.startsWith("eyJ") && !key.startsWith("sb_publishable_")) {
    dbgError(
      "La API key NO tiene formato reconocido. Verifica en Supabase Dashboard → Settings → API → anon key",
    );
  } else {
    dbgOk("Key con formato válido");
  }

  dbgGroupEnd();
}
