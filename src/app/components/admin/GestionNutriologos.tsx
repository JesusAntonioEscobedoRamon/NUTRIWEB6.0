import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/app/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/app/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { UserPlus, Edit, Trash2, KeyRound, AlertTriangle, BadgeDollarSign, Mail, Phone, UserCircle, RefreshCw, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/app/context/supabaseClient';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';

interface Nutriologo {
  id_nutriologo: number;
  id_auth_user: string | null;
  nombre: string;
  apellido: string;
  correo: string;
  numero_celular?: string;
  tarifa_consulta: number;
  fecha_registro: string;
  activo: boolean;
  foto_perfil?: string;
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
            <Stethoscope size={80} strokeWidth={1.5} />
          </div>
        </div>
        
        <div 
          ref={textRef}
          className="text-[#2E8B57] font-bold text-2xl mb-6"
        >
          Cargando profesionales de la salud...
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

export function GestionNutriologos() {
  const [nutriologos, setNutriologos] = useState<Nutriologo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    correo: '',
    numero_celular: '',
    tarifa_consulta: '',
    password: '',
  });

  useEffect(() => {
    fetchNutriologos();
  }, []);

  const fetchNutriologos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('nutriologos')
        .select('*')
        .order('fecha_registro', { ascending: false });

      if (error) throw error;
      setNutriologos(data || []);
    } catch (err: any) {
      toast.error('No se pudieron cargar los nutriólogos');
    } finally {
      setLoading(false);
    }
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0,3)} ${digits.slice(3)}`;
    return `${digits.slice(0,3)} ${digits.slice(3,6)} ${digits.slice(6)}`;
  };

  const formatCurrency = (value: string) => {
    const numeric = value.replace(/[^\d.]/g, '');
    const [whole, decimal = ''] = numeric.split('.');
    const formattedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return decimal ? `${formattedWhole}.${decimal}` : formattedWhole;
  };

  const handleInputChange = (field: string, value: string) => {
    if (field === 'numero_celular') {
      setFormData(prev => ({ ...prev, [field]: value.replace(/\D/g, '').slice(0, 10) }));
    } else if (field === 'tarifa_consulta') {
      setFormData(prev => ({ ...prev, [field]: formatCurrency(value) }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      apellido: '',
      correo: '',
      numero_celular: '',
      tarifa_consulta: '',
      password: '',
    });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const rawTarifa = formData.tarifa_consulta.replace(/,/g, '');
    const tarifa = parseFloat(rawTarifa);
    if (isNaN(tarifa) || tarifa <= 0) {
      toast.error('La tarifa debe ser un número mayor a 0');
      return;
    }

    if (formData.numero_celular.length !== 10) {
      toast.error('El número celular debe tener 10 dígitos');
      return;
    }

    if (!formData.correo.includes('@')) {
      toast.error('Correo inválido');
      return;
    }

    if (!editingId && (!formData.password || formData.password.length < 8)) {
      toast.error('La contraseña temporal debe tener al menos 8 caracteres');
      return;
    }

    const nutriologoData = {
      nombre: formData.nombre.trim(),
      apellido: formData.apellido.trim(),
      correo: formData.correo.trim().toLowerCase(),
      numero_celular: formData.numero_celular,
      tarifa_consulta: tarifa,
      activo: true,
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from('nutriologos')
          .update(nutriologoData)
          .eq('id_nutriologo', editingId);

        if (error) throw error;
        toast.success('Nutriólogo actualizado exitosamente');
      } else {
        const passwordToUse = formData.password.trim();

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: nutriologoData.correo,
          password: passwordToUse,
          options: {
            emailRedirectTo: window.location.origin + '/login',
          },
        });

        if (authError) {
          if (
            authError.status === 409 ||
            authError.message?.toLowerCase().includes('already registered') ||
            authError.message?.toLowerCase().includes('duplicate key')
          ) {
            toast.error(
              'Este correo ya está registrado en el sistema de autenticación.\n' +
              'Para reutilizarlo:\n' +
              '1. Ve a Supabase → Authentication → Users\n' +
              '2. Busca y elimina el usuario con este correo\n' +
              '3. Intenta crear de nuevo'
            );
            return;
          } else if (authError.status === 429) {
            toast.error(
              'Límite de creación de cuentas alcanzado (rate limit).\n' +
              'Espera 1-2 horas o crea usuarios manualmente en Supabase → Authentication → Users'
            );
            return;
          } else {
            throw authError;
          }
        }

        if (!authData.user) {
          throw new Error('No se pudo crear la cuenta de autenticación');
        }

        const userId = authData.user.id;

        const { error: insertError } = await supabase
          .from('nutriologos')
          .insert({
            id_auth_user: userId,
            ...nutriologoData,
            cedula_profesional: '',
            especialidad: '',
            consultorio: '',
            horario_atencion: '',
            descripcion: '',
            experiencia_anios: 0,
            foto_perfil: 'nutriologo_default.png',
            calificacion_promedio: 0,
            total_citas: 0,
          });

        if (insertError) {
          throw insertError;
        }

        toast.success(
          `Nutriólogo creado exitosamente.\n` +
          `Contraseña temporal: ${passwordToUse}\n` +
          `Se envió email de confirmación a ${nutriologoData.correo}\n` +
          `(El nutriólogo debe confirmar antes de poder iniciar sesión)`
        );
      }

      await fetchNutriologos();
      setIsDialogOpen(false);
      setIsEditDialogOpen(false);
      resetForm();
    } catch (err: any) {
      const msg = err.message || JSON.stringify(err) || 'Error desconocido al guardar';
      toast.error(`Error al guardar: ${msg}`);
    }
  };

  const handleEdit = (nutriologo: Nutriologo) => {
    setEditingId(nutriologo.id_nutriologo);
    setFormData({
      nombre: nutriologo.nombre,
      apellido: nutriologo.apellido,
      correo: nutriologo.correo,
      numero_celular: nutriologo.numero_celular || '',
      tarifa_consulta: nutriologo.tarifa_consulta.toLocaleString('es-MX'),
      password: '',
    });
    setIsEditDialogOpen(true);
  };

  const handleResetPassword = async (email: string) => {
    if (!confirm(`¿Enviar email de recuperación de contraseña a ${email}?`)) return;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success(`Se envió un enlace de recuperación al correo ${email}`);
    } catch (err: any) {
      toast.error('Error al enviar recuperación: ' + err.message);
    }
  };

  const handleDelete = async (id: number, nombre: string, apellido: string, id_auth_user: string | null) => {
    if (!confirm(`¿Eliminar a ${nombre} ${apellido}?`)) return;

    try {
      const { error: deleteProfile } = await supabase
        .from('nutriologos')
        .delete()
        .eq('id_nutriologo', id);

      if (deleteProfile) throw deleteProfile;

      if (id_auth_user) {
      }

      toast.success(`Nutriólogo ${nombre} ${apellido} eliminado exitosamente`);
      await fetchNutriologos();
    } catch (err: any) {
      toast.error(err.message || 'No se pudo eliminar');
    }
  };

  if (loading) {
    return <AnimatedLoadingScreen />;
  }

  return (
    <div className="p-4 md:p-10 bg-[#F8FFF9] min-h-screen space-y-10 font-sans">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div>
          <div className="inline-flex flex-col items-start">
            <h1 className="text-3xl md:text-4xl font-[900] text-[#1A3026] tracking-[4px] uppercase leading-none">
              Gestión de <span className="text-[#2E8B57]">Nutriólogos</span>
            </h1>
            <div className="w-16 h-1.5 bg-[#3CB371] rounded-full mt-3" />
          </div>
          <p className="text-[#3CB371] font-bold text-sm mt-4 uppercase tracking-[2px]">
            Panel de administración de profesionales
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[#2E8B57] hover:bg-[#256e45] text-white font-[900] uppercase tracking-widest text-[11px] h-14 px-8 rounded-2xl shadow-lg shadow-green-100 transition-all active:scale-95 flex items-center gap-3">
              <UserPlus className="h-4 w-4" />
              Registrar Nutriólogo
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] sm:rounded-[2.5rem] border-2 border-[#D1E8D5] p-4 sm:p-6 md:p-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-[900] text-[#1A3026] uppercase tracking-tight">Nuevo Profesional</DialogTitle>
              <DialogDescription className="font-bold text-gray-400 uppercase text-[10px] tracking-widest">
                Ingresa los datos y una contraseña temporal (se le compartirá al nutriólogo)
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-[900] uppercase text-[#1A3026] ml-1">Nombre</Label>
                <Input value={formData.nombre} onChange={(e) => handleInputChange('nombre', e.target.value)} placeholder="Ej: Juan" className="rounded-xl border-2 border-[#F0FFF4] focus:border-[#D1E8D5] h-12 bg-[#F8FFF9] font-bold" required />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-[900] uppercase text-[#1A3026] ml-1">Apellido</Label>
                <Input value={formData.apellido} onChange={(e) => handleInputChange('apellido', e.target.value)} placeholder="Ej: Pérez" className="rounded-xl border-2 border-[#F0FFF4] focus:border-[#D1E8D5] h-12 bg-[#F8FFF9] font-bold" required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[10px] font-[900] uppercase text-[#1A3026] ml-1">Correo</Label>
                <Input type="email" value={formData.correo} onChange={(e) => handleInputChange('correo', e.target.value)} className="rounded-xl border-2 border-[#F0FFF4] focus:border-[#D1E8D5] h-12 bg-[#F8FFF9] font-bold" required />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-[900] uppercase text-[#1A3026] ml-1">Celular (653 333 3333)</Label>
                <Input 
                  value={formatPhone(formData.numero_celular)} 
                  onChange={(e) => handleInputChange('numero_celular', e.target.value)} 
                  maxLength={12} 
                  placeholder="653 333 3333" 
                  className="rounded-xl border-2 border-[#F0FFF4] focus:border-[#D1E8D5] h-12 bg-[#F8FFF9] font-bold" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-[900] uppercase text-[#1A3026] ml-1">Tarifa ($)</Label>
                <Input 
                  value={formData.tarifa_consulta} 
                  onChange={(e) => handleInputChange('tarifa_consulta', e.target.value)} 
                  placeholder="Ej: 1,200.00" 
                  className="rounded-xl border-2 border-[#F0FFF4] focus:border-[#D1E8D5] h-12 bg-[#F8FFF9] font-bold" 
                  required 
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-[900] uppercase text-[#1A3026] ml-1">Contraseña Temporal</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const randomPass = generateRandomPassword();
                      setFormData(prev => ({ ...prev, password: randomPass }));
                      toast.info(`Contraseña generada: ${randomPass} (cópiala antes de guardar)`);
                    }}
                  >
                    <RefreshCw size={14} className="mr-1" /> Generar
                  </Button>
                </div>
                <Input 
                  type="text" 
                  value={formData.password} 
                  onChange={(e) => handleInputChange('password', e.target.value)} 
                  placeholder="Mínimo 8 caracteres" 
                  className="rounded-xl border-2 border-[#F0FFF4] focus:border-[#D1E8D5] h-12 bg-[#F8FFF9] font-bold" 
                  required 
                  minLength={8}
                />
              </div>

              <DialogFooter className="md:col-span-2 pt-6">
                <Button type="submit" className="w-full bg-[#2E8B57] hover:bg-[#256e45] h-14 rounded-2xl font-[900] uppercase tracking-widest text-[11px]">
                  Confirmar Registro
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card className="rounded-[2.5rem] border-2 border-[#D1E8D5] overflow-hidden bg-white shadow-sm">
        <CardHeader className="bg-[#F8FFF9] border-b border-[#D1E8D5] p-8">
          <CardTitle className="text-sm font-[900] text-[#1A3026] uppercase tracking-[2px] flex items-center gap-2">
            <UserCircle className="text-[#2E8B57]" size={18} /> Nutriólogos Registrados
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Cargando nutriólogos...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#F0FFF4] hover:bg-transparent">
                  <TableHead className="py-6 px-8 text-[10px] font-[900] uppercase text-gray-400 tracking-widest">Foto</TableHead>
                  <TableHead className="py-6 px-8 text-[10px] font-[900] uppercase text-gray-400 tracking-widest">Profesional</TableHead>
                  <TableHead className="text-[10px] font-[900] uppercase text-gray-400 tracking-widest">Contacto</TableHead>
                  <TableHead className="text-[10px] font-[900] uppercase text-gray-400 tracking-widest text-center">Tarifa</TableHead>
                  <TableHead className="text-right py-6 px-8 text-[10px] font-[900] uppercase text-gray-400 tracking-widest">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nutriologos.map((nutriologo) => (
                  <TableRow 
                    key={nutriologo.id_nutriologo} 
                    onClick={() => handleEdit(nutriologo)}
                    className="border-b border-[#F8FFF9] hover:bg-[#F8FFF9]/50 transition-colors group cursor-pointer"
                  >
                    <TableCell className="py-6 px-8">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#D1E8D5] flex items-center justify-center bg-[#F8FFF9]">
                        <ImageWithFallback
                          src={nutriologo.foto_perfil || 'nutriologo_default.png'}
                          alt={`${nutriologo.nombre} ${nutriologo.apellido}`}
                          className="w-full h-full object-cover"
                          fallbackSrc="nutriologo_default.png"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="py-6 px-8">
                      <div className="flex flex-col">
                        <p className="font-[900] text-[#1A3026] uppercase text-[12px] tracking-tight">
                          {nutriologo.nombre} {nutriologo.apellido}
                        </p>
                        <p className="font-mono text-[10px] text-gray-400 font-bold">
                          ID: {nutriologo.id_auth_user ? nutriologo.id_auth_user.slice(0,8)+'...' : 'Sin cuenta'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-gray-500 font-bold text-[10px] uppercase">
                          <Mail size={12} className="text-[#3CB371]" /> {nutriologo.correo}
                        </div>
                        <div className="flex items-center gap-2 text-gray-500 font-bold text-[10px] uppercase">
                          <Phone size={12} className="text-[#3CB371]" /> {formatPhone(nutriologo.numero_celular || 'No registrado')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-[#2E8B57] font-[900] text-[12px]">
                        <BadgeDollarSign size={14} /> ${nutriologo.tarifa_consulta.toLocaleString('es-MX')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right py-6 px-8">
                      <div className="flex justify-end gap-3">
                        <Dialog open={isEditDialogOpen && editingId === nutriologo.id_nutriologo} onOpenChange={(open) => {
                          setIsEditDialogOpen(open);
                          if (!open) { resetForm(); setEditingId(null); }
                        }}>
                          <DialogTrigger asChild>
                            <Button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(nutriologo);
                              }} 
                              variant="ghost" 
                              className="h-10 w-10 p-0 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
                            >
                              <Edit size={16} />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] sm:rounded-[2.5rem] border-2 border-[#D1E8D5] p-4 sm:p-6 md:p-8" onClick={(e) => e.stopPropagation()}>
                            <DialogHeader>
                              <DialogTitle className="text-2xl font-[900] text-[#1A3026] uppercase tracking-tight">Editar Nutriólogo</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                              <div className="space-y-2">
                                <Label className="text-[10px] font-[900] uppercase text-[#1A3026] ml-1">Nombre</Label>
                                <Input value={formData.nombre} onChange={(e) => handleInputChange('nombre', e.target.value)} className="rounded-xl border-2 border-[#F0FFF4] focus:border-[#D1E8D5] h-12 bg-[#F8FFF9] font-bold" />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[10px] font-[900] uppercase text-[#1A3026] ml-1">Apellido</Label>
                                <Input value={formData.apellido} onChange={(e) => handleInputChange('apellido', e.target.value)} className="rounded-xl border-2 border-[#F0FFF4] focus:border-[#D1E8D5] h-12 bg-[#F8FFF9] font-bold" />
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <Label className="text-[10px] font-[900] uppercase text-[#1A3026] ml-1">Correo</Label>
                                <Input type="email" value={formData.correo} onChange={(e) => handleInputChange('correo', e.target.value)} className="rounded-xl border-2 border-[#F0FFF4] focus:border-[#D1E8D5] h-12 bg-[#F8FFF9] font-bold" />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[10px] font-[900] uppercase text-[#1A3026] ml-1">Celular</Label>
                                <Input 
                                  value={formatPhone(formData.numero_celular)} 
                                  onChange={(e) => handleInputChange('numero_celular', e.target.value)} 
                                  maxLength={12} 
                                  placeholder="653 333 3333" 
                                  className="rounded-xl border-2 border-[#F0FFF4] focus:border-[#D1E8D5] h-12 bg-[#F8FFF9] font-bold" 
                                  required 
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[10px] font-[900] uppercase text-[#1A3026] ml-1">Tarifa ($)</Label>
                                <Input 
                                  value={formData.tarifa_consulta} 
                                  onChange={(e) => handleInputChange('tarifa_consulta', e.target.value)} 
                                  placeholder="Ej: 1,200.00" 
                                  className="rounded-xl border-2 border-[#F0FFF4] focus:border-[#D1E8D5] h-12 bg-[#F8FFF9] font-bold" 
                                  required 
                                />
                              </div>
                              <div className="md:col-span-2 flex justify-end">
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  className="border-red-200 text-red-600 hover:bg-red-50"
                                  onClick={() => handleResetPassword(formData.correo)}
                                >
                                  <KeyRound size={16} className="mr-2" />
                                  Resetear Contraseña
                                </Button>
                              </div>

                              <DialogFooter className="md:col-span-2 pt-6">
                                <Button type="submit" className="w-full bg-[#2E8B57] hover:bg-[#256e45] h-14 rounded-2xl font-[900] uppercase tracking-widest text-[11px]">
                                  Guardar Cambios
                                </Button>
                              </DialogFooter>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              onClick={(e) => e.stopPropagation()}
                              variant="ghost" 
                              className="h-10 w-10 p-0 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-y-auto rounded-[2rem] sm:rounded-[2.5rem] border-2 border-red-100 p-4 sm:p-6 md:p-8">
                            <AlertDialogHeader>
                              <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-red-50 rounded-2xl text-red-600"><AlertTriangle size={24}/></div>
                                <AlertDialogTitle className="font-[900] uppercase tracking-tight text-red-600">Eliminar Nutriólogo</AlertDialogTitle>
                              </div>
                              <AlertDialogDescription className="font-bold text-gray-500 uppercase text-[10px] tracking-widest leading-relaxed">
                                ¿Estás seguro de eliminar a <span className="text-[#1A3026] text-[12px]">{nutriologo.nombre} {nutriologo.apellido}</span>? <br/>
                                Esta acción es irreversible y también se eliminará su cuenta de acceso.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-8 gap-4">
                              <AlertDialogCancel className="h-12 rounded-xl border-2 font-[900] uppercase text-[10px] tracking-widest">Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(nutriologo.id_nutriologo, nutriologo.nombre, nutriologo.apellido, nutriologo.id_auth_user)}
                                className="h-12 rounded-xl bg-red-600 hover:bg-red-700 font-[900] uppercase text-[10px] tracking-widest"
                              >
                                Eliminar Profesional
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}