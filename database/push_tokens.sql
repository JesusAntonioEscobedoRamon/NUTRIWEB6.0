-- Tabla para almacenar tokens de dispositivos móviles para notificaciones push
CREATE TABLE IF NOT EXISTS push_tokens (
  id SERIAL PRIMARY KEY,
  id_paciente INTEGER NOT NULL REFERENCES pacientes(id_paciente) ON DELETE CASCADE,
  token TEXT NOT NULL,
  device_type VARCHAR(20) DEFAULT 'mobile', -- 'ios', 'android', 'mobile'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(id_paciente, token)
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_push_tokens_paciente ON push_tokens(id_paciente) WHERE is_active = true;
CREATE INDEX idx_push_tokens_active ON push_tokens(is_active) WHERE is_active = true;

-- Función para actualizar el timestamp de updated_at
CREATE OR REPLACE FUNCTION update_push_token_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar automáticamente el timestamp
CREATE TRIGGER trigger_update_push_token_timestamp
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_push_token_timestamp();

-- Comentarios para documentación
COMMENT ON TABLE push_tokens IS 'Almacena tokens de dispositivos móviles para enviar notificaciones push a través de Expo';
COMMENT ON COLUMN push_tokens.token IS 'Token de Expo Push Notifications (formato: ExponentPushToken[xxxxxx])';
COMMENT ON COLUMN push_tokens.device_type IS 'Tipo de dispositivo: ios, android, o mobile';
COMMENT ON COLUMN push_tokens.is_active IS 'Indica si el token está activo y debe recibir notificaciones';
