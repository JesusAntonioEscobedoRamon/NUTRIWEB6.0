-- ════════════════════════════════════════════════════════════════
-- SISTEMA DE CANJES DE PUNTOS (REWARDS/DISCOUNTS)
-- 
-- Este script crea las tablas necesarias para el sistema de canjes:
-- 1. rangos_puntos: Define rangos de puntos por nutriólogo
-- 2. canjes: Define qué canje corresponde a cada rango
-- 3. canjes_paciente: Tracking de canjes por paciente
-- ════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- 1. RANGOS_PUNTOS: Rango de puntos para cada nutriólogo
--    Permite que cada nutriólogo defina sus propios rangos
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rangos_puntos (
  id_rango SERIAL PRIMARY KEY,
  id_nutriologo INTEGER NOT NULL REFERENCES nutriologos(id_nutriologo) ON DELETE CASCADE,
  nombre_rango VARCHAR(100) NOT NULL, -- 'Bronce', 'Plata', 'Oro', 'Diamante'
  puntos_minimo INTEGER NOT NULL,     -- e.g., 100
  puntos_maximo INTEGER,              -- e.g., 999 (NULL para último rango)
  descripcion TEXT,                   -- Descripción del rango
  icono_nivel VARCHAR(50),            -- Para UI: 'bronce', 'plata', 'oro', 'diamante'
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT NOW(),
  actualizado_en TIMESTAMP DEFAULT NOW(),
  UNIQUE(id_nutriologo, nombre_rango),
  CHECK (puntos_minimo >= 0),
  CHECK (puntos_maximo IS NULL OR puntos_maximo > puntos_minimo)
);

-- ────────────────────────────────────────────────────────────────
-- 2. CANJES: Define rewards/discounts para cada rango
--    Cada nutriólogo puede crear múltiples canjes por rango
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS canjes (
  id_canje SERIAL PRIMARY KEY,
  id_nutriologo INTEGER NOT NULL REFERENCES nutriologos(id_nutriologo) ON DELETE CASCADE,
  id_rango INTEGER NOT NULL REFERENCES rangos_puntos(id_rango) ON DELETE CASCADE,
  nombre_canje VARCHAR(255) NOT NULL, -- e.g., '10% de descuento', 'Consulta gratis'
  tipo_canje VARCHAR(50) NOT NULL,    -- 'descuento' o 'consulta_gratis'
  valor_descuento INTEGER,            -- Solo para descuentos: % (0-100)
  cantidad_consultas INTEGER DEFAULT 1, -- Para 'consulta_gratis': cuántas consultas
  descripcion TEXT,                   -- Descripción detallada del canje
  monto_minimo_consulta NUMERIC(10,2), -- Monto mínimo de consulta para aplicar el canje (evita pérdidas)
  activo BOOLEAN DEFAULT TRUE,
  creado_en TIMESTAMP DEFAULT NOW(),
  actualizado_en TIMESTAMP DEFAULT NOW(),
  CONSTRAINT chk_tipo_canje CHECK (tipo_canje IN ('descuento', 'consulta_gratis')),
  CONSTRAINT chk_descuento_rango CHECK (
    (tipo_canje = 'descuento' AND valor_descuento IS NOT NULL AND valor_descuento >= 0 AND valor_descuento <= 100) OR
    (tipo_canje != 'descuento')
  ),
  CONSTRAINT chk_tarifa_minima CHECK (monto_minimo_consulta IS NULL OR monto_minimo_consulta > 0)
);

-- ────────────────────────────────────────────────────────────────
-- 3. CANJES_PACIENTE: Tracking de canjes por paciente
--    Registra qué canjes tiene cada paciente y su estado
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS canjes_paciente (
  id_canje_paciente SERIAL PRIMARY KEY,
  id_paciente INTEGER NOT NULL REFERENCES pacientes(id_paciente) ON DELETE CASCADE,
  id_canje INTEGER NOT NULL REFERENCES canjes(id_canje) ON DELETE CASCADE,
  id_nutriologo INTEGER NOT NULL REFERENCES nutriologos(id_nutriologo) ON DELETE CASCADE,
  estado VARCHAR(50) DEFAULT 'disponible', -- 'disponible', 'en_uso', 'usado', 'expirado', 'cancelado'
  fecha_obtenido TIMESTAMP DEFAULT NOW(),
  fecha_usado TIMESTAMP,
  id_cita_usado INTEGER REFERENCES citas(id_cita) ON DELETE SET NULL, -- Qué cita fue usada
  observaciones TEXT, -- Notas adicionales (ej: "Usado con 15% del descuento")
  creado_en TIMESTAMP DEFAULT NOW(),
  actualizado_en TIMESTAMP DEFAULT NOW(),
  CONSTRAINT chk_estado CHECK (estado IN ('disponible', 'en_uso', 'usado', 'expirado', 'cancelado')),
  CONSTRAINT chk_fecha_usado CHECK (
    (estado = 'usado' AND fecha_usado IS NOT NULL) OR
    (estado != 'usado' AND fecha_usado IS NULL)
  )
);

-- ────────────────────────────────────────────────────────────────
-- ÍNDICES para performance
-- ────────────────────────────────────────────────────────────────

-- Búsqueda rápida de rangos por nutriólogo
CREATE INDEX IF NOT EXISTS idx_rangos_nutriologo 
  ON rangos_puntos(id_nutriologo) WHERE activo = TRUE;

-- Búsqueda rápida de canjes por nutriólogo y rango
CREATE INDEX IF NOT EXISTS idx_canjes_nutriologo_rango 
  ON canjes(id_nutriologo, id_rango) WHERE activo = TRUE;

-- Búsqueda de canjes disponibles del paciente
CREATE INDEX IF NOT EXISTS idx_canjes_paciente_estado 
  ON canjes_paciente(id_paciente, estado) WHERE estado = 'disponible';

-- Búsqueda de canjes usados del paciente
CREATE INDEX IF NOT EXISTS idx_canjes_paciente_historial 
  ON canjes_paciente(id_paciente, fecha_usado) WHERE estado = 'usado';

-- ────────────────────────────────────────────────────────────────
-- DATOS INICIALES (SAMPLE): Rangos estándar por nutriólogo
-- ────────────────────────────────────────────────────────────────
-- Estos son ejemplos. En producción, el nutriólogo los crea desde la UI

-- INSERT INTO rangos_puntos (id_nutriologo, nombre_rango, puntos_minimo, puntos_maximo, descripcion, icono_nivel)
-- VALUES 
--   (1, 'Bronce', 100, 999, 'Tu primer hito en el camino del bienestar', 'bronce'),
--   (1, 'Plata', 1000, 4999, 'Ya estás en el camino, continúa progresando', 'plata'),
--   (1, 'Oro', 5000, 9999, 'Grandes logros, sigues adelante', 'oro'),
--   (1, 'Diamante', 10000, NULL, 'Eres un leyenda en tu salud', 'diamante');

-- INSERT INTO canjes (id_nutriologo, id_rango, nombre_canje, tipo_canje, valor_descuento, descripcion, monto_minimo_consulta)
-- VALUES
--   (1, 1, '5% de descuento', 'descuento', 5, 'Pequeño descuento para pacientes en Bronce', 100.00),
--   (1, 2, '10% de descuento', 'descuento', 10, 'Descuento intermedio para pacientes en Plata', 100.00),
--   (1, 3, '15% de descuento', 'descuento', 15, 'Gran descuento para pacientes en Oro', 100.00),
--   (1, 4, 'Consulta gratis', 'consulta_gratis', NULL, 'Una consulta completamente gratis', 500.00);

-- ════════════════════════════════════════════════════════════════
-- NOTAS DE IMPLEMENTACIÓN
-- ════════════════════════════════════════════════════════════════
-- 
-- 1. SEGURIDAD:
--    - Cada canje está vinculado a un nutriólogo específico
--    - Los pacientes solo ven canjes de su nutriólogo asignado
--    - El monto_minimo_consulta asegura que el consultorio gana > $1 por consulta
--
-- 2. FLUJO DE CANJES:
--    a) Paciente llega a rango (ej: 1000+ puntos → Plata)
--    b) Sistema automáticamente crea regs en canjes_paciente con estado='disponible'
--    c) Al pagar una cita, el paciente ve sus canjes disponibles
--    d) Si elige uno, se aplica el descuento (desc% * tarifa_consulta)
--    e) Descuento se resta del monto → garantiza ganancia mínima de $1
--    f) Se marca canjeado: UPDATE canjes_paciente SET estado='usado', fecha_usado=NOW()
--
-- 3. CONTROL DE PÉRDIDAS:
--    - monto_minimo_consulta: Ej, si descuento es 50% y tarifa=$100
--      → descuento máx = $50 → monto_minimo_consulta = 100.00 → app valida
--    - Lógica en backend: aplicar_descuento <= tarifa_consulta - 1.00
--    - "Consulta gratis" se interpreta como consulta bonificada dejando cargo mínimo de $1 MXN
--
-- 4. EXTENSIÓN FUTURA:
--    - Expiración automática (agregar expira_en TIMESTAMP)
--    - Límite de usos (agregar usos_maximos INTEGER)
--    - Periodos especiales (descuentos temporales)
-- ════════════════════════════════════════════════════════════════
