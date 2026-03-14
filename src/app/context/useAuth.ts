import { useContext } from 'react';
import { AuthContext } from './AuthContext';  // ← ahora sí existe el export

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}