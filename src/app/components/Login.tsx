import { useState, useEffect, memo } from 'react';
import { useAuth } from '@/app/context/useAuth';
import { useNavigate } from 'react-router-dom'; // ← Import nuevo para redirigir
import { 
  User, 
  Lock, 
  Leaf, 
  Apple, 
  Stethoscope, 
  HeartPulse, 
  Salad, 
  ChevronRight, 
  AlertCircle,
  Activity,
  Eye, 
  EyeOff, 
  X,
  Mail
} from 'lucide-react';
import { supabase } from '@/app/context/supabaseClient';
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogDescription,
  DialogFooter
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
const StaticBackground = memo(() => {
  const icons = [
    <Leaf size={26} />, <Apple size={26} />, <Stethoscope size={26} />, 
    <HeartPulse size={26} />, <Salad size={26} />, <Activity size={26} />
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-[#F0FFF4]">
      {[...Array(260)].map((_, i) => {
        const columns = 16;
        const col = i % columns;
        const row = Math.floor(i / columns);
        const horizontalShift = (row % 2 === 0 ? 3 : -1); 
        const left = (col * (100 / columns)) + horizontalShift;
        const top = (row * 5.8);
        const rotate = (i * 40) % 360;
        const scale = 0.9 + (i % 4) * 0.1;

        return (
          <div
            key={i}
            className="absolute opacity-[0.22]"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              transform: `rotate(${rotate}deg) scale(${scale})`,
              color: '#1B4332',
            }}
          >
            {icons[i % icons.length]}
          </div>
        );
      })}
    </div>
  );
});

StaticBackground.displayName = 'StaticBackground';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [notification, setNotification] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);
  const [isExiting, setIsExiting] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate(); // ← Para redirigir después del login

  const { login } = useAuth();

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const validateEmail = (email: string) => {
    const allowedDomains = /@(gmail\.com|hotmail\.com|outlook\.com|yahoo\.com|nutriu\.com)$/i;
    return allowedDomains.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setNotification({ msg: 'Por favor, completa todos los campos', type: 'error' });
      return;
    }
    if (!validateEmail(email)) {
      setNotification({ msg: 'Usa un correo válido (Gmail, Hotmail, etc.)', type: 'error' });
      return;
    }
    try {
      const success = await login(email, password);
      if (!success) {
        setNotification({ msg: 'Credenciales incorrectas o usuario no autorizado', type: 'error' });
      } else {
        setNotification({ msg: '¡Bienvenido de nuevo!', type: 'success' });
        setTimeout(() => setIsExiting(true), 1000);
        setTimeout(() => navigate('/'), 1600); // ← Redirigir a ruta protegida (dashboard)
      }
    } catch (error) {
      setNotification({ msg: 'Error al iniciar sesión. Intenta de nuevo.', type: 'error' });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error('Ingresa tu correo electrónico');
      return;
    }
    if (!validateEmail(resetEmail)) {
      toast.error('Ingresa un correo válido');
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password` // URL donde el usuario cambiará la contraseña
      });

      if (error) throw error;

      toast.success('¡Enlace de recuperación enviado! Revisa tu correo.');
      setResetOpen(false);
      setResetEmail('');
    } catch (error: any) {
      toast.error(error.message || 'Error al enviar el enlace de recuperación');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 font-sans relative overflow-hidden bg-[#F0FFF4]">
      <StaticBackground />
      {notification && (
        <div className={`fixed top-8 right-8 z-[100] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border-2 animate-slide-in ${
          notification.type === 'error' 
            ? 'bg-white border-red-200 text-red-600' 
            : 'bg-white border-green-200 text-green-600'
        }`}>
          {notification.type === 'error' ? <AlertCircle size={20} /> : <Leaf size={20} />}
          <p className="font-bold text-sm uppercase tracking-tight">{notification.msg}</p>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-50 transition-opacity">
            <X size={16} />
          </button>
        </div>
      )}
      <div className={`w-full max-w-lg bg-white/95 backdrop-blur-2xl rounded-[3rem] shadow-[0_40px_100px_rgba(27,67,50,0.25)] border-2 border-[#D1E8D5] overflow-hidden z-10 relative 
        ${isExiting ? 'animate-exit-scale' : 'animate-enter-up'}`}>
        <div className="px-12 pt-16 pb-8 text-center">
          <div className="inline-flex flex-col items-center">
            <div className="h-24 overflow-hidden flex items-center justify-center mb-1">
              <img src="/assets/logo.png" alt="Logo Nutri U" className="h-full w-auto object-contain" />
            </div>
          </div>
          <p className="text-[#6B7280] text-[13px] font-black mt-8 uppercase tracking-[4px] opacity-60">
            Panel de Acceso Profesional
          </p>
        </div>

        <div className="px-12 pb-16">
          <form onSubmit={handleSubmit} className="space-y-7" noValidate>
            <div className="space-y-3">
              <label className="block text-xs font-black uppercase tracking-[2px] text-[#4A4A4A] ml-2">
                Correo Electrónico
              </label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#2D6A4F] group-focus-within:scale-110 transition-transform">
                  <User size={24} />
                </div>
                <input
                  type="email"
                  placeholder="usuario@nutriu.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-16 pr-6 py-5 bg-white border-2 border-[#D1E8D5] rounded-3xl focus:border-[#2D6A4F] focus:ring-8 focus:ring-green-100 outline-none transition-all text-[#1A3026] text-lg font-medium shadow-sm"
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="block text-xs font-black uppercase tracking-[2px] text-[#4A4A4A] ml-2">
                Contraseña
              </label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[#2D6A4F] group-focus-within:scale-110 transition-transform">
                  <Lock size={24} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-16 pr-16 py-5 bg-white border-2 border-[#D1E8D5] rounded-3xl focus:border-[#2D6A4F] focus:ring-8 focus:ring-green-100 outline-none transition-all text-[#1A3026] text-lg shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-[#A0AEC0] hover:text-[#2D6A4F] transition-colors"
                >
                  {showPassword ? <EyeOff size={24} /> : <Eye size={24} />}
                </button>
              </div>
            </div>
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setResetOpen(true)}
                className="text-[#2D6A4F] hover:text-[#3CB371] font-bold text-sm underline transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <button
              type="submit"
              className="w-full py-5 bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-black text-lg uppercase tracking-[4px] rounded-3xl shadow-2xl shadow-green-200 transition-all active:scale-[0.96] flex items-center justify-center gap-4 mt-6 overflow-hidden relative group"
            >
              <span className="relative z-10">Entrar al Sistema</span>
              <ChevronRight size={24} className="relative z-10 group-hover:translate-x-2 transition-transform" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
            </button>
          </form>

          <div className="flex justify-center mt-12 italic">
            <p className="text-[12px] text-[#6B7280] font-black tracking-[4px] uppercase opacity-90">
              Nutri U • v1.0 • Secure Access
            </p>
          </div>
        </div>
      </div>
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-md max-h-[90vh] overflow-y-auto rounded-[2rem] sm:rounded-[2.5rem] border-2 border-[#D1E8D5] p-4 sm:p-6 md:p-8 bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-[900] text-[#2E8B57] uppercase tracking-[2px]">
              Recuperar Contraseña
            </DialogTitle>
            <DialogDescription className="text-gray-600 mt-2">
              Ingresa tu correo electrónico y te enviaremos un enlace para crear una nueva contraseña.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-6 mt-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                Correo Electrónico
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2E8B57]" size={18} />
                <Input
                  type="email"
                  placeholder="usuario@nutriu.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="pl-12 border-2 border-[#D1E8D5] rounded-2xl h-12"
                  required
                />
              </div>
            </div>

            <DialogFooter className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetOpen(false)}
                className="flex-1 border-2 border-[#D1E8D5] text-gray-500 font-black uppercase rounded-xl h-14"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={resetLoading}
                className="flex-1 bg-[#2E8B57] hover:bg-[#1A3026] text-white font-black uppercase rounded-xl h-14 disabled:opacity-50"
              >
                {resetLoading ? 'Enviando...' : 'Enviar Enlace'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes enterUp {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes exitScale {
          from { transform: scale(1); opacity: 1; }
          to { transform: scale(0.9); opacity: 0; filter: blur(10px); }
        }

        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }

        .animate-enter-up {
          animation: enterUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animate-exit-scale {
          animation: exitScale 0.6s cubic-bezier(0.7, 0, 0.84, 0) forwards;
        }

        .animate-slide-in {
          animation: slideIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        .animate-shimmer {
          animation: shimmer 1.5s infinite;
        }
      `}</style>
    </div>
  );
}