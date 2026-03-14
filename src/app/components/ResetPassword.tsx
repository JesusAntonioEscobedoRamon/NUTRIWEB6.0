import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/app/context/supabaseClient';
import { toast } from 'sonner';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Eye, EyeOff, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  useEffect(() => {
    const type = searchParams.get('type');
    if (type !== 'recovery') {
      setError('Este enlace no es válido para recuperación de contraseña. Solicita uno nuevo desde la pantalla de login.');
      return;
    }
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    if (!params.has('access_token') && !params.has('type')) {
      setError('El enlace parece incompleto o ha expirado.');
    }
  }, [searchParams]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        setSuccess(true);
        toast.success('¡Contraseña cambiada exitosamente!');
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    } catch (err: any) {
      const msg = err.message?.toLowerCase() || '';
      
      if (msg.includes('expired') || msg.includes('invalid')) {
        setError('El enlace de recuperación ha expirado o ya fue usado. Solicita uno nuevo.');
      } else if (msg.includes('weak')) {
        setError('La contraseña es demasiado débil. Usa al menos 6 caracteres con letras, números y símbolos.');
      } else {
        setError(err.message || 'No se pudo cambiar la contraseña. Intenta de nuevo o solicita un nuevo enlace.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-[#F0FFF4] to-[#E0F7E9]">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border-2 border-[#D1E8D5] p-10 md:p-12">
        {!success ? (
          <>
            <div className="text-center mb-10">
              <Lock className="mx-auto h-16 w-16 text-[#2E8B57] mb-4" />
              <h1 className="text-3xl md:text-4xl font-black text-[#2E8B57] tracking-wide uppercase">
                Restablecer Contraseña
              </h1>
              <p className="text-[#3CB371] font-semibold text-base mt-3">
                Ingresa tu nueva contraseña segura
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-xl flex items-start gap-3">
                <AlertCircle className="h-6 w-6 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleReset} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-gray-500 tracking-wider">
                  Nueva Contraseña
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    className="pr-12 border-2 border-[#D1E8D5] rounded-xl h-12 focus:border-[#2E8B57] focus:ring-1 focus:ring-[#2E8B57]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#2E8B57] transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-gray-500 tracking-wider">
                  Confirmar Contraseña
                </Label>
                <div className="relative">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="pr-12 border-2 border-[#D1E8D5] rounded-xl h-12 focus:border-[#2E8B57] focus:ring-1 focus:ring-[#2E8B57]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#2E8B57] transition-colors"
                  >
                    {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2E8B57] hover:bg-[#1A3026] text-white font-black uppercase rounded-xl h-14 disabled:opacity-60 transition-all shadow-md"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    </svg>
                    Procesando...
                  </span>
                ) : (
                  'Cambiar Contraseña'
                )}
              </Button>
            </form>

            <div className="text-center mt-8">
              <button
                onClick={() => navigate('/login')}
                className="text-[#2E8B57] hover:text-[#1A3026] text-sm font-bold transition-colors"
              >
                ← Volver al inicio de sesión
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <CheckCircle2 className="mx-auto h-20 w-20 text-green-500 mb-6 animate-bounce" />
            <h1 className="text-3xl font-black text-[#2E8B57] mb-4">
              ¡Contraseña actualizada!
            </h1>
            <p className="text-gray-700 text-lg mb-8">
              Tu contraseña ha sido cambiada con éxito.
            </p>
            <p className="text-gray-500 text-sm">
              Redirigiéndote al login en unos segundos...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}