import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { toast } from 'sonner';
import { dbgGroup, dbgGroupEnd, dbgLog, dbgOk, dbgWarn, dbgError } from '@/utils/debug';

export interface User {
  id: string;
  nutriologoId?: string;
  adminId?: string;
  email: string;
  nombre: string;
  apellido: string;
  nombreUsuario: string;
  celular: string;
  rol: 'admin' | 'nutriologo';
  tarifa?: number;
  descripcion?: string;
  fotoPerfil?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  loading: boolean;
}
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_MAX_WAIT_MS = 8000;

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timeout after ${ms}ms`));
    }, ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let restoredFromCache = false;
    let cachedUserId: string | null = null;

    const cached = localStorage.getItem('nutriu_user');
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as User;
        setUser(parsed);
        restoredFromCache = true;
        cachedUserId = parsed.id;
        setLoading(false);
      } catch (e) {
        localStorage.removeItem('nutriu_user');
      }
    }

    const initializeAuth = async () => {
      dbgGroup('auth', `initializeAuth — restoredFromCache=${restoredFromCache}`);
      if (!restoredFromCache) {
        setLoading(true);
      }

      try {
        dbgLog('Llamando supabase.auth.getSession()...');
        const { data: { session }, error } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_MAX_WAIT_MS,
          'getSession'
        );
        if (error) {
          dbgError('getSession() error', error);
          throw error;
        }

        if (session?.user) {
          dbgOk(`Sesión activa — userId=${session.user.id}`);
          const sameUserAsCache = restoredFromCache && cachedUserId === session.user.id;
          dbgLog(`sameUserAsCache=${sameUserAsCache}`);
          if (sameUserAsCache) {
            withTimeout(fetchUserData(session.user.id, 0, true), AUTH_MAX_WAIT_MS, 'fetchUserData(background)').catch((err) => {
              dbgError('fetchUserData background error', err);
            });
          } else {
            await withTimeout(fetchUserData(session.user.id), AUTH_MAX_WAIT_MS, 'fetchUserData');
          }
        } else {
          dbgWarn('getSession() → sin sesión activa (no logueado)');
          if (restoredFromCache && cachedUserId) {
            dbgWarn('Conservando sesión cacheada temporalmente y revalidando perfil en background');
            withTimeout(fetchUserData(cachedUserId, 0, true), AUTH_MAX_WAIT_MS, 'fetchUserData(cache-revalidate)').catch((err) => {
              dbgError('cache-revalidate error', err);
            });
          } else {
            setUser(null);
            localStorage.removeItem('nutriu_user');
          }
        }
      } catch (err: any) {
        dbgError('initializeAuth catch', err);
        if (restoredFromCache) {
          dbgWarn('initializeAuth falló, pero se conserva usuario cacheado para evitar redirect innecesario');
        } else {
          setUser(null);
          localStorage.removeItem('nutriu_user');
        }
      } finally {
        setLoading(false);
        dbgGroupEnd();
      }
    };

    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      dbgLog(`onAuthStateChange: event=${event}`, session?.user?.id ?? null);
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          await withTimeout(fetchUserData(session.user.id), AUTH_MAX_WAIT_MS, 'fetchUserData(SIGNED_IN)');
        } catch (err) {
          dbgError('SIGNED_IN fetchUserData timeout/error', err);
          setLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        localStorage.removeItem('nutriu_user');
      } else if (event === 'PASSWORD_RECOVERY') {
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchUserData = async (userId: string, retryCount = 0, preserveExistingUser = false): Promise<boolean> => {
    dbgGroup('auth', `fetchUserData — userId=${userId} retry=${retryCount}`);
    try {
      dbgLog('Consultando administradores + nutriologos en paralelo...');
      const [adminResponse, nutriResponse] = await Promise.all([
        supabase
          .from('administradores')
          .select('id_admin, nombre, apellido, correo, numero_celular')
          .eq('id_auth_user', userId)
          .maybeSingle(),
        supabase
          .from('nutriologos')
          .select('id_nutriologo, nombre, apellido, correo, numero_celular, tarifa_consulta, nombre_usuario, descripcion, foto_perfil')
          .eq('id_auth_user', userId)
          .maybeSingle(),
      ]);

      const { data: adminData, error: adminError } = adminResponse;
      const { data: nutriData, error: nutriError } = nutriResponse;

      if (adminError) {
        dbgError('Error query administradores', adminError);
        throw adminError;
      }
      if (nutriError) {
        dbgError('Error query nutriologos', nutriError);
        throw nutriError;
      }

      dbgLog('adminData', adminData);
      dbgLog('nutriData', nutriData);

      if (adminData) {
        dbgOk(`Perfil admin encontrado — id_admin=${adminData.id_admin}`);
        const newUser: User = {
          id: userId,
          adminId: adminData.id_admin.toString(),
          email: adminData.correo || '',
          nombre: adminData.nombre || '',
          apellido: adminData.apellido || '',
          nombreUsuario: '',
          celular: adminData.numero_celular || '',
          rol: 'admin',
        };
        setUser(newUser);
        localStorage.setItem('nutriu_user', JSON.stringify(newUser));
        dbgGroupEnd();
        return true;
      }

      if (nutriData) {
        dbgOk(`Perfil nutriólogo encontrado — id=${nutriData.id_nutriologo}, usuario=${nutriData.nombre_usuario}`);
        const newUser: User = {
          id: userId,
          nutriologoId: nutriData.id_nutriologo.toString(),
          email: nutriData.correo || '',
          nombre: nutriData.nombre || '',
          apellido: nutriData.apellido || '',
          nombreUsuario: nutriData.nombre_usuario || '',
          celular: nutriData.numero_celular || '',
          rol: 'nutriologo',
          tarifa: nutriData.tarifa_consulta,
          descripcion: nutriData.descripcion || '',
          fotoPerfil: nutriData.foto_perfil || null,
        };
        setUser(newUser);
        localStorage.setItem('nutriu_user', JSON.stringify(newUser));
        dbgGroupEnd();
        return true;
      }

      dbgWarn('No se encontró admin NI nutriólogo para userId=' + userId);
      if (!preserveExistingUser) {
        toast.warning('No se encontró perfil asociado a esta cuenta');
        setUser(null);
        localStorage.removeItem('nutriu_user');
      } else {
        dbgWarn('Se conserva usuario cacheado (preserveExistingUser=true)');
      }
      dbgGroupEnd();
      return false;
    } catch (error: any) {
      const errorMessage = String(error?.message || '');
      const isAbortError = error?.name === 'AbortError' || /aborted/i.test(errorMessage);

      if (isAbortError && retryCount < 2) {
        dbgWarn(`AbortError en fetchUserData — reintentando (${retryCount + 1})...`);
        await new Promise(resolve => setTimeout(resolve, 200));
        return fetchUserData(userId, retryCount + 1, preserveExistingUser);
      }

      if (isAbortError) {
        dbgError('AbortError agotado — devolviendo false');
        dbgGroupEnd();
        return false;
      }
      dbgError('fetchUserData catch', error);
      if (!preserveExistingUser) {
        toast.error('Error al cargar el perfil: ' + (error.message || 'Intenta nuevamente'));
        setUser(null);
        localStorage.removeItem('nutriu_user');
      } else {
        dbgWarn('Error en refresh de perfil, se conserva usuario cacheado');
      }
      dbgGroupEnd();
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        AUTH_MAX_WAIT_MS,
        'signInWithPassword'
      );
      if (error) throw error;

      if (data.user) {
        const profileLoaded = await withTimeout(
          fetchUserData(data.user.id),
          AUTH_MAX_WAIT_MS,
          'fetchUserData(login)'
        );
        if (!profileLoaded) {
          await supabase.auth.signOut();
          return false;
        }
        return true;
      }
      return false;
    } catch (error: any) {
      toast.error('Error al iniciar sesión: ' + (error.message || 'Credenciales inválidas'));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      localStorage.removeItem('nutriu_user');
      toast.success('Sesión cerrada correctamente');
    } catch (error: any) {
      toast.error('Error al cerrar sesión');
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) {
      toast.error('No hay sesión activa');
      return;
    }

    const table = user.rol === 'admin' ? 'administradores' : 'nutriologos';
    const updateData: any = {};

    if (data.nombre) updateData.nombre = data.nombre;
    if (data.apellido) updateData.apellido = data.apellido;
    if (data.celular) updateData.numero_celular = data.celular;

    if (user.rol === 'nutriologo') {
      if (data.tarifa !== undefined) updateData.tarifa_consulta = data.tarifa;
      if (data.descripcion !== undefined) updateData.descripcion = data.descripcion;
      if (data.fotoPerfil !== undefined) updateData.foto_perfil = data.fotoPerfil;
      if (data.nombreUsuario !== undefined) updateData.nombre_usuario = data.nombreUsuario;
    }

    if (Object.keys(updateData).length === 0) return;

    try {
      const { error } = await supabase
        .from(table)
        .update(updateData)
        .eq('id_auth_user', user.id);

      if (error) throw error;

      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      localStorage.setItem('nutriu_user', JSON.stringify(updatedUser));
      toast.success('Perfil actualizado correctamente');
    } catch (error: any) {
      toast.error('No se pudo actualizar el perfil: ' + (error.message || 'Intenta de nuevo'));
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}