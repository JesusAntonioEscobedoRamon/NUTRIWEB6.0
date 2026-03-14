import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/app/context/AuthContext';
import { Layout } from '@/app/components/Layout';
import { Toaster } from '@/app/components/ui/sonner';
import { useAuth } from '@/app/context/useAuth';
import { useOffline } from '@/hooks/useOffline';
import { initDB } from '@/utils/db';

const importLogin = () => import('@/app/components/Login').then(m => ({ default: m.Login }));
const importResetPassword = () => import('@/app/components/ResetPassword').then(m => ({ default: m.ResetPassword }));
const importDashboardAdmin = () => import('@/app/components/admin/DashboardAdmin').then(m => ({ default: m.DashboardAdmin }));
const importGestionNutriologos = () => import('@/app/components/admin/GestionNutriologos').then(m => ({ default: m.GestionNutriologos }));
const importEstadisticasAdmin = () => import('@/app/components/admin/EstadisticasAdmin').then(m => ({ default: m.EstadisticasAdmin }));
const importDashboardNutriologo = () => import('@/app/components/nutriologo/DashboardNutriologo').then(m => ({ default: m.DashboardNutriologo }));
const importGestionPacientes = () => import('@/app/components/nutriologo/GestionPacientes').then(m => ({ default: m.GestionPacientes }));
const importGestionCitas = () => import('@/app/components/nutriologo/GestionCitas').then(m => ({ default: m.GestionCitas }));
const importGestionDietas = () => import('@/app/components/nutriologo/GestionDietas').then(m => ({ default: m.GestionDietas }));
const importGestionPagos = () => import('@/app/components/nutriologo/GestionPagos').then(m => ({ default: m.GestionPagos }));
const importGamificacion = () => import('@/app/components/nutriologo/Gamificacion').then(m => ({ default: m.Gamificacion }));
const importPerfil = () => import('@/app/components/nutriologo/Perfil').then(m => ({ default: m.Perfil }));

const Login = lazy(importLogin);
const ResetPassword = lazy(importResetPassword);
const DashboardAdmin = lazy(importDashboardAdmin);
const GestionNutriologos = lazy(importGestionNutriologos);
const EstadisticasAdmin = lazy(importEstadisticasAdmin);
const DashboardNutriologo = lazy(importDashboardNutriologo);
const GestionPacientes = lazy(importGestionPacientes);
const GestionCitas = lazy(importGestionCitas);
const GestionDietas = lazy(importGestionDietas);
const GestionPagos = lazy(importGestionPagos);
const Gamificacion = lazy(importGamificacion);
const Perfil = lazy(importPerfil);

function canPreloadOnCurrentNetwork() {
  const connection = (navigator as Navigator & {
    connection?: { effectiveType?: string; saveData?: boolean };
  }).connection;

  if (!connection) return true;
  if (connection.saveData) return false;
  if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') return false;
  return true;
}

function AnimatedLoadingScreen() {
  const iconRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const iconElement = iconRef.current;
    const textElement = textRef.current;
    const dotsElement = dotsRef.current;

    if (iconElement) {
      iconElement.animate(
        [
          { transform: 'rotate(0deg) scale(1)', opacity: 0.8 },
          { transform: 'rotate(360deg) scale(1.2)', opacity: 1 },
          { transform: 'rotate(720deg) scale(1)', opacity: 0.8 }
        ],
        {
          duration: 3000,
          iterations: Infinity,
          easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)'
        }
      );
    }

    if (textElement) {
      textElement.animate(
        [
          { opacity: 0.5 },
          { opacity: 1 },
          { opacity: 0.5 }
        ],
        {
          duration: 2000,
          iterations: Infinity,
          easing: 'ease-in-out'
        }
      );
    }

    if (dotsElement) {
      const dots = dotsElement.children;
      Array.from(dots).forEach((dot, index) => {
        (dot as HTMLElement).animate(
          [
            { transform: 'scale(0.8)', opacity: 0.5 },
            { transform: 'scale(1.2)', opacity: 1 },
            { transform: 'scale(0.8)', opacity: 0.5 }
          ],
          {
            duration: 1500,
            delay: index * 200,
            iterations: Infinity,
            easing: 'ease-in-out'
          }
        );
      });
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0FFF4]">
      <div className="text-center">
        <div className="flex justify-center mb-8">
          <div 
            ref={iconRef}
            className="text-[#2E8B57]"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="64" 
              height="64" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
            </svg>
          </div>
        </div>
        
        <div 
          ref={textRef}
          className="text-[#2E8B57] font-bold text-2xl mb-6"
        >
          Cargando sesión...
        </div>
        
        <div 
          ref={dotsRef}
          className="flex justify-center gap-2"
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full bg-[#2E8B57]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (location.pathname === '/reset-password') {
    return children;
  }

  if (loading) {
    return <AnimatedLoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppContent() {
  const { user } = useAuth();
  const { isOnline } = useOffline();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [showRestoredBanner, setShowRestoredBanner] = useState(false);
  const hasMounted = useRef(false);
  const lastOfflineTime = useRef<number | null>(null); // Evita re-trigger mientras offline
  useEffect(() => {
    initDB()
  }, []);

  useEffect(() => {
    if (!user) return;

    if (!canPreloadOnCurrentNetwork()) return;

    const firstWave = user.rol === 'admin'
      ? [importGestionNutriologos, importEstadisticasAdmin]
      : [importGestionPacientes, importGestionCitas];

    const secondWave = user.rol === 'admin'
      ? []
      : [importGestionDietas, importGestionPagos, importGamificacion, importPerfil];

    const runWave = async (loaders: Array<() => Promise<unknown>>) => {
      await Promise.allSettled(loaders.map((loader) => loader()));
    };

    let firstTimeoutId: number | null = null;
    let secondTimeoutId: number | null = null;

    firstTimeoutId = window.setTimeout(() => {
      void runWave(firstWave);
    }, 1500);

    if (secondWave.length > 0) {
      secondTimeoutId = window.setTimeout(() => {
        void runWave(secondWave);
      }, 4200);
    }

    return () => {
      if (firstTimeoutId !== null) {
        window.clearTimeout(firstTimeoutId);
      }

      if (secondTimeoutId !== null) {
        window.clearTimeout(secondTimeoutId);
      }
    };
  }, [user]);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    let timer: NodeJS.Timeout | null = null;

    if (!isOnline) {
      const now = Date.now();
      if (!lastOfflineTime.current || now - lastOfflineTime.current > 3000) {
        setShowOfflineBanner(true);
        lastOfflineTime.current = now;
        timer = setTimeout(() => setShowOfflineBanner(false), 3000);
      }
      setShowRestoredBanner(false);
    } else if (isOnline && lastOfflineTime.current) {
      setShowOfflineBanner(false);
      setShowRestoredBanner(true);
      timer = setTimeout(() => {
        setShowRestoredBanner(false);
        lastOfflineTime.current = null; // Reset para próximo ciclo
      }, 3000);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isOnline]);

  if (!user) {
    return null;
  }
  const renderContent = () => {
    if (user.rol === 'admin') {
      switch (activeTab) {
        case 'dashboard':
          return <DashboardAdmin />;
        case 'nutriologos':
          return <GestionNutriologos />;
        case 'estadisticas':
          return <EstadisticasAdmin />;
        default:
          return <DashboardAdmin />;
      }
    } else if (user.rol === 'nutriologo') {
      switch (activeTab) {
        case 'dashboard':
          return <DashboardNutriologo onTabChange={setActiveTab} />;
        case 'pacientes':
          return <GestionPacientes />;
        case 'citas':
          return <GestionCitas />;
        case 'dietas':
          return <GestionDietas />;
        case 'pagos':
          return <GestionPagos />;
        case 'gamificacion':
          return <Gamificacion />;
        case 'perfil':
          return <Perfil />;
        default:
          return <DashboardNutriologo onTabChange={setActiveTab} />;
      }
    } else {
      return (
        <div className="p-10 text-center text-xl text-red-600 font-bold">
          Rol no reconocido: {user.rol}
        </div>
      );
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {showOfflineBanner && (
        <div className="bg-red-600/95 text-white text-center py-3 px-4 font-medium sticky top-0 z-50 shadow-md animate-fade-out">
          Sin conexión a internet
        </div>
      )}
      {showRestoredBanner && (
        <div className="bg-green-600/90 text-white text-center py-3 px-4 font-medium sticky top-0 z-50 shadow-md animate-fade-out">
          Conexión restaurada
        </div>
      )}

      <Suspense fallback={<AnimatedLoadingScreen />}>
        {renderContent()}
      </Suspense>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route
          path="/login"
          element={
            <Suspense fallback={<AnimatedLoadingScreen />}>
              <Login />
            </Suspense>
          }
        />
        <Route
          path="/reset-password"
          element={
            <Suspense fallback={<AnimatedLoadingScreen />}>
              <ResetPassword />
            </Suspense>
          }
        />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppContent />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <Toaster />
    </AuthProvider>
  );
}