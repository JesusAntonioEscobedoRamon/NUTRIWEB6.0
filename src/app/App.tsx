import { useState, useEffect, useRef } from 'react'; // ← ESTO YA LO TENÍAS, pero asegúrate de que esté
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/app/context/AuthContext';
import { Login } from '@/app/components/Login';
import { ResetPassword } from '@/app/components/ResetPassword';
import { Layout } from '@/app/components/Layout';
import { Toaster } from '@/app/components/ui/sonner';
import { useAuth } from '@/app/context/useAuth';

// Admin components
import { DashboardAdmin } from '@/app/components/admin/DashboardAdmin';
import { GestionNutriologos } from '@/app/components/admin/GestionNutriologos';
import { EstadisticasAdmin } from '@/app/components/admin/EstadisticasAdmin';

// Nutriologo components
import { DashboardNutriologo } from '@/app/components/nutriologo/DashboardNutriologo';
import { GestionPacientes } from '@/app/components/nutriologo/GestionPacientes';
import { GestionCitas } from '@/app/components/nutriologo/GestionCitas';
import { GestionDietas } from '@/app/components/nutriologo/GestionDietas';
import { GestionPagos } from '@/app/components/nutriologo/GestionPagos';
import { Gamificacion } from '@/app/components/nutriologo/Gamificacion';
import { Perfil } from '@/app/components/nutriologo/Perfil';

// Componente de carga animado
function AnimatedLoadingScreen() {
  const iconRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Animación del icono (hoja)
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

// Componente protegido
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
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!user) {
    return null;
  }

  console.log('[AppContent] Renderizando dashboard para rol:', user.rol);

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
          return <DashboardNutriologo />;
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
          return <DashboardNutriologo />;
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
      {renderContent()}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />

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