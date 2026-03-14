import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/app/context/useAuth';
import { 
  User, 
  DollarSign, 
  Edit, 
  Check, 
  X,
  Camera,
  AtSign,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/app/context/supabaseClient';
import { Clock } from 'lucide-react';
function AnimatedProfileLoadingScreen() {
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
            <User size={80} strokeWidth={1.5} />
          </div>
        </div>
        
        <div 
          ref={textRef}
          className="text-[#2E8B57] font-bold text-2xl mb-6"
        >
          Cargando información de perfil...
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

export function Perfil() {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    nombre: user?.nombre || '',
    apellido: user?.apellido || '',
    nombreUsuario: user?.nombreUsuario || '',
    tarifa: user?.tarifa || 0,
    descripcion: user?.descripcion || '',
    fotoPerfil: user?.fotoPerfil || null
  });

  const [previewImage, setPreviewImage] = useState<string | null>(user?.fotoPerfil || null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);
  const hasChanges = JSON.stringify(formData) !== JSON.stringify({
    nombre: user?.nombre || '',
    apellido: user?.apellido || '',
    nombreUsuario: user?.nombreUsuario || '',
    tarifa: user?.tarifa || 0,
    descripcion: user?.descripcion || '',
    fotoPerfil: user?.fotoPerfil || null
  });

  useEffect(() => {
    (window as Window & { __hasPendingChanges?: boolean }).__hasPendingChanges = isEditing && hasChanges;

    return () => {
      (window as Window & { __hasPendingChanges?: boolean }).__hasPendingChanges = false;
    };
  }, [isEditing, hasChanges]);
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isEditing && hasChanges) {
        e.preventDefault();
        e.returnValue = ''; 
      }
    };

    const handleInternalNavigation = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');

      if (anchor && isEditing && hasChanges) {
        const confirmación = window.confirm("Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?");
        if (!confirmación) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleInternalNavigation, true);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleInternalNavigation, true);
    };
  }, [isEditing, hasChanges]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen es muy pesada. Máximo 2MB");
      return;
    }

    setUploadingPhoto(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Date.now()}.${fileExt}`;
      const filePath = `perfiles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('perfiles')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from('perfiles')
        .getPublicUrl(filePath);

      const imageUrl = publicUrl.publicUrl;

      setPreviewImage(imageUrl);
      setFormData(prev => ({ ...prev, fotoPerfil: imageUrl }));
      toast.success('Foto subida correctamente');
    } catch (err: any) {
      toast.error('Error al subir la foto');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/.test(formData.nombre) || /[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/.test(formData.apellido)) {
      toast.error("Los nombres no pueden contener números");
      return;
    }

    if (formData.tarifa < 0) {
      toast.error("La tarifa no puede ser negativa");
      return;
    }

    try {
      await updateProfile({
        nombre: formData.nombre,
        apellido: formData.apellido,
        tarifa: formData.tarifa,
        descripcion: formData.descripcion,
        fotoPerfil: formData.fotoPerfil,
        nombreUsuario: formData.nombreUsuario
      });

      toast.success('Perfil actualizado correctamente');
      setIsEditing(false);
    } catch (error: any) {
      toast.error('Error al guardar cambios');
    }
  };

  const handleCancel = () => {
    setFormData({
      nombre: user?.nombre || '',
      apellido: user?.apellido || '',
      nombreUsuario: user?.nombreUsuario || '',
      tarifa: user?.tarifa || 0,
      descripcion: user?.descripcion || '',
      fotoPerfil: user?.fotoPerfil || null
    });
    setPreviewImage(user?.fotoPerfil || null);
    setIsEditing(false);
  };
  const formatNumberWithCommas = (num: number) => {
    return num.toLocaleString('es-MX');
  };

  if (loading) {
    return <AnimatedProfileLoadingScreen />;
  }

  return (
    <div className="min-h-screen p-6 md:p-10 font-sans bg-[#F8FFF9]">
      <div className="max-w-5xl mx-auto">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="inline-flex flex-col items-start">
              <h1 className="text-4xl md:text-5xl font-[900] text-[#2E8B57] tracking-[4px] uppercase">Mi Perfil</h1>
              <div className="w-16 h-1.5 bg-[#3CB371] rounded-full mt-2" />
            </div>
            {isEditing && hasChanges && (
              <p className="text-orange-500 text-xs md:text-sm font-black mt-4 uppercase tracking-[2px] animate-pulse">
                 Hay cambios sin guardar en tu perfil
              </p>
            )}
          </div>

          {!isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-8 py-4 bg-white border-2 border-[#D1E8D5] text-[#2E8B57] font-black text-sm md:text-base uppercase tracking-widest rounded-2xl hover:bg-[#F0FFF4] transition-all"
            >
              <Edit size={16} />
              Editar Información
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4">
            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-[#D1E8D5] shadow-sm text-center">
              <div className="relative inline-block mb-6">
                <div className="w-32 h-32 rounded-full border-4 border-[#F0FFF4] overflow-hidden bg-gray-100 flex items-center justify-center">
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt="Perfil"
                      onError={() => setPreviewImage(null)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[#9FB7A7] font-medium text-lg leading-none">Perfil</span>
                  )}
                </div>
                {isEditing && (
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="absolute bottom-0 right-0 p-3 bg-[#2E8B57] text-white rounded-full shadow-lg border-4 border-white disabled:opacity-50"
                  >
                    {uploadingPhoto ? <Clock size={18} className="animate-spin" /> : <Camera size={18} />}
                  </button>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
              </div>
              <h3 className="text-3xl md:text-4xl font-black text-[#1A3026] uppercase leading-tight">
                {formData.nombre} {formData.apellido}
              </h3>
              <p className="text-[#3CB371] font-bold text-base md:text-lg mb-4">@{formData.nombreUsuario}</p>
              
              <div className="bg-[#f8fcf9] p-4 rounded-2xl border border-dashed border-[#D1E8D5]">
                <p className="text-[10px] md:text-xs font-black text-gray-400 uppercase mb-1">Email de acceso</p>
                <p className="text-base md:text-lg text-[#1A3026] font-medium">{user?.email}</p>
              </div>
            </div>
          </div>
          <div className="lg:col-span-8">
            <div className="bg-white p-8 md:p-12 rounded-[2.5rem] border-2 border-[#D1E8D5]">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <div>
                    <label className="text-xs md:text-sm font-black uppercase text-gray-500 ml-1">Nombre</label>
                    <input
                      disabled={!isEditing}
                      value={formData.nombre}
                      onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                      className="w-full mt-2 p-4 text-sm md:text-base bg-white border-2 border-[#D1E8D5] rounded-2xl focus:border-[#2E8B57] outline-none disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="text-xs md:text-sm font-black uppercase text-gray-500 ml-1">Apellido</label>
                    <input
                      disabled={!isEditing}
                      value={formData.apellido}
                      onChange={(e) => setFormData({...formData, apellido: e.target.value})}
                      className="w-full mt-2 p-4 text-sm md:text-base bg-white border-2 border-[#D1E8D5] rounded-2xl focus:border-[#2E8B57] outline-none disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="text-xs md:text-sm font-black uppercase text-gray-500 ml-1">Nombre de Usuario</label>
                    <div className="relative">
                      <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2E8B57]" size={18} />
                      <input
                        disabled={!isEditing}
                        value={formData.nombreUsuario}
                        onChange={(e) => setFormData({...formData, nombreUsuario: e.target.value})}
                        className="w-full mt-2 pl-12 pr-4 py-4 text-sm md:text-base bg-white border-2 border-[#D1E8D5] rounded-2xl focus:border-[#2E8B57] outline-none disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs md:text-sm font-black uppercase text-gray-500 ml-1">Tarifa (MXN)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2E8B57]" size={18} />
                      <input
                        disabled={!isEditing}
                        type="text"
                        value={formData.tarifa.toLocaleString('es-MX')}
                        onChange={(e) => {
                          const cleanValue = e.target.value.replace(/[^0-9]/g, '');
                          const numValue = cleanValue === '' ? 0 : Number(cleanValue);
                          setFormData({...formData, tarifa: numValue});
                        }}
                        placeholder="Ej: 1,500"
                        className="w-full mt-2 pl-12 pr-4 py-4 text-sm md:text-base bg-white border-2 border-[#D1E8D5] rounded-2xl focus:border-[#2E8B57] outline-none disabled:opacity-50 font-medium"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs md:text-sm font-black uppercase text-gray-500 ml-1">Descripción Profesional</label>
                  <textarea
                    disabled={!isEditing}
                    rows={4}
                    value={formData.descripcion}
                    onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                    placeholder="Escribe tu trayectoria o especialidad..."
                    className="w-full mt-2 p-4 text-sm md:text-base bg-white border-2 border-[#D1E8D5] rounded-2xl focus:border-[#2E8B57] outline-none disabled:opacity-50 resize-none"
                  />
                </div>

                {isEditing && (
                  <div className="flex flex-col sm:flex-row justify-end gap-4 pt-6 border-t border-[#f0f0f0]">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-8 py-4 text-red-500 font-black text-sm md:text-base uppercase tracking-widest hover:bg-red-50 rounded-2xl transition-all"
                    >
                      <X size={16} className="inline mr-2" /> Descartar
                    </button>
                    <button
                      type="submit"
                      className="px-8 py-4 bg-[#2E8B57] text-white font-black text-sm md:text-base uppercase tracking-widest rounded-2xl hover:bg-[#1A3026] shadow-lg transition-all"
                    >
                      <Check size={16} className="inline mr-2" /> Guardar Cambios
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  ); 
}