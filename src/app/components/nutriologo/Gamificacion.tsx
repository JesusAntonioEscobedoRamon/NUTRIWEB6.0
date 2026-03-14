import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/app/components/ui/dialog';
import { Progress } from '@/app/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { useAuth } from '@/app/context/useAuth';
import { supabase } from '@/app/context/supabaseClient';
import { toast } from 'sonner';
import { dbgGroup, dbgGroupEnd, dbgLog, dbgOk, dbgWarn, dbgError } from '@/utils/debug';
import { 
  Trophy, 
  Star, 
  Award, 
  Crown, 
  Target, 
  Plus, 
  TrendingUp,
  Search,
  Gift,
  Percent,
  Edit,
  Trash2
} from 'lucide-react';

const STORAGE_PUBLIC_URL = 'https://hthnkzwjotwqhvjgqhfv.supabase.co/storage/v1/object/public/perfiles/';
const premioBronceImg = new URL('../../../../assets/premiocobre.png', import.meta.url).href;
const premioPlataImg = new URL('../../../../assets/premioplata.png', import.meta.url).href;
const premioOroImg = new URL('../../../../assets/premiooro.png', import.meta.url).href;
const premioDiamanteImg = new URL('../../../../assets/premiodiamante.png', import.meta.url).href;

const formatPoints = (value: number) => Number(value || 0).toLocaleString('es-MX');

const getPremioImageByNivel = (nivel: string) => {
  if (nivel === 'Bronce') return premioBronceImg;
  if (nivel === 'Plata') return premioPlataImg;
  if (nivel === 'Oro') return premioOroImg;
  if (nivel === 'Diamante') return premioDiamanteImg;
  return null;
};
const getNivelPaciente = (puntos: number) => {
  if (puntos >= 10000) return { nivel: 'Diamante', color: 'text-blue-600', border: 'border-blue-200', bgColor: 'bg-blue-50', icon: Crown, level: 'Leyenda' };
  if (puntos >= 5000) return { nivel: 'Oro', color: 'text-yellow-600', border: 'border-yellow-200', bgColor: 'bg-yellow-50', icon: Award, level: 'Avanzado' };
  if (puntos >= 1000) return { nivel: 'Plata', color: 'text-slate-500', border: 'border-slate-200', bgColor: 'bg-slate-50', icon: Star, level: 'Intermedio' };
  if (puntos >= 100) return { nivel: 'Bronce', color: 'text-orange-600', border: 'border-orange-200', bgColor: 'bg-orange-50', icon: Target, level: 'Principiante' };
  return { nivel: 'Sin Rango', color: 'text-gray-600', border: 'border-gray-200', bgColor: 'bg-gray-50', icon: Target, level: 'Novato' };
};

const getProgresoNivel = (puntos: number) => {
  if (puntos < 100) return (puntos / 100) * 100;
  if (puntos >= 10000) return 100;
  if (puntos >= 5000) return ((puntos - 5000) / 5000) * 100;
  if (puntos >= 1000) return ((puntos - 1000) / 4000) * 100;
  if (puntos >= 100) return ((puntos - 100) / 900) * 100;
  return 0;
};
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
            <Trophy size={80} strokeWidth={1.5} />
          </div>
        </div>
        
        <div 
          ref={textRef}
          className="text-[#2E8B57] font-bold text-2xl mb-6"
        >
          Cargando gamificaciones...
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

export function Gamificacion() {
  const { user } = useAuth();
  const ENABLE_CANJES_MODULE = true;
  const USE_LEGACY_REWARDS_SCHEMA = true;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState('');
  const [puntosAsignar, setPuntosAsignar] = useState('');
  const [misPacientes, setMisPacientes] = useState<any[]>([]);
  const [filteredPacientes, setFilteredPacientes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState(''); // ← Barra principal
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('gamificacion'); // 'gamificacion' | 'canjes'
  const [rangos, setRangos] = useState<any[]>([]);
  const [canjes, setCanjes] = useState<any[]>([]);
  const [isRangoDialogOpen, setIsRangoDialogOpen] = useState(false);
  const [isCanjeDialogOpen, setIsCanjeDialogOpen] = useState(false);
  const [editingRango, setEditingRango] = useState<any>(null);
  const [editingCanje, setEditingCanje] = useState<any>(null);
  const [rangoFormData, setRangoFormData] = useState({
    nombre_rango: '',
    puntos_minimo: '',
    puntos_maximo: '',
    descripcion: ''
  });
  const [canjeFormData, setCanjeFormData] = useState({
    id_rango: '',
    nombre_canje: '',
    tipo_canje: 'descuento',
    valor_descuento: '',
    cantidad_consultas: '1',
    descripcion: '',
    monto_minimo_consulta: ''
  });
  const [loadingCanjes, setLoadingCanjes] = useState(false);

  useEffect(() => {
    if (user?.nutriologoId) {
      fetchMisPacientes();
      if (ENABLE_CANJES_MODULE) {
        fetchRangosYCanjes();
      }
    } else {
      // user aún no cargado o sin nutriologoId → no quedarse colgado en loading
      setLoading(false);
    }
  }, [user]);

  const fetchRangosYCanjes = async () => {
    if (!ENABLE_CANJES_MODULE) {
      setRangos([]);
      setCanjes([]);
      return;
    }

    setLoadingCanjes(true);
    try {
      if (USE_LEGACY_REWARDS_SCHEMA) {
        setRangos([]);

        const { data: recompensasData, error: errRecompensas } = await supabase
          .from('recompensas')
          .select('*')
          .eq('activa', true)
          .order('puntos_requeridos', { ascending: true });

        if (errRecompensas) throw errRecompensas;

        const mappedCanjes = (recompensasData || []).map((recompensa: any) => ({
          id_canje: recompensa.id_recompensa,
          nombre_canje: recompensa.nombre,
          tipo_canje: recompensa.tipo_recompensa === 'descuento' ? 'descuento' : 'consulta_gratis',
          valor_descuento: null,
          cantidad_consultas: 1,
          descripcion: recompensa.descripcion,
          monto_minimo_consulta: null,
          puntos_requeridos: Number(recompensa.puntos_requeridos || 0),
          rangos_puntos: null,
        }));

        setCanjes(mappedCanjes);
        return;
      }

      const { data: rangosData, error: errRangos } = await supabase
        .from('rangos_puntos')
        .select('*')
        .eq('id_nutriologo', user.nutriologoId)
        .eq('activo', true)
        .order('puntos_minimo', { ascending: true });

      if (errRangos) throw errRangos;
      setRangos(rangosData || []);

      const { data: canjesData, error: errCanjes } = await supabase
        .from('canjes')
        .select('*, rangos_puntos(nombre_rango, puntos_minimo, puntos_maximo)')
        .eq('id_nutriologo', user.nutriologoId)
        .eq('activo', true)
        .order('creado_en', { ascending: false });

      if (errCanjes) throw errCanjes;
      setCanjes(canjesData || []);
    } catch (error: any) {
      toast.error('Error cargando rangos y canjes');
    } finally {
      setLoadingCanjes(false);
    }
  };

  const awardUnlockedCanjes = async (pacienteId: number, puntosTotales: number) => {
    if (!ENABLE_CANJES_MODULE) {
      return [];
    }

    if (USE_LEGACY_REWARDS_SCHEMA) {
      return [];
    }

    if (!user?.nutriologoId) {
      return [];
    }

    const { data: rangosActivos, error: rangosError } = await supabase
      .from('rangos_puntos')
      .select('id_rango, nombre_rango, puntos_minimo, puntos_maximo')
      .eq('id_nutriologo', user.nutriologoId)
      .eq('activo', true)
      .order('puntos_minimo', { ascending: true });

    if (rangosError) throw rangosError;

    const rangoActual = (rangosActivos || []).find((rango) => (
      puntosTotales >= Number(rango.puntos_minimo || 0)
      && (rango.puntos_maximo === null || puntosTotales <= Number(rango.puntos_maximo))
    ));

    if (!rangoActual) {
      return [];
    }

    const { data: canjesRango, error: canjesError } = await supabase
      .from('canjes')
      .select('id_canje, nombre_canje')
      .eq('id_nutriologo', user.nutriologoId)
      .eq('id_rango', rangoActual.id_rango)
      .eq('activo', true);

    if (canjesError) throw canjesError;

    const awardedNames: string[] = [];

    for (const canje of (canjesRango || [])) {
      const { data: existingCanje } = await supabase
        .from('canjes_paciente')
        .select('id_canje_paciente')
        .eq('id_paciente', pacienteId)
        .eq('id_canje', canje.id_canje)
        .maybeSingle();

      if (existingCanje?.id_canje_paciente) {
        continue;
      }

      const { error: insertCanjeError } = await supabase
        .from('canjes_paciente')
        .insert({
          id_paciente: pacienteId,
          id_canje: canje.id_canje,
          id_nutriologo: user.nutriologoId,
          estado: 'disponible',
        });

      if (!insertCanjeError) {
        awardedNames.push(canje.nombre_canje);
      }
    }

    return awardedNames;
  };

  const fetchMisPacientes = async () => {
    dbgGroup('screen', `Gamificacion — nutriologoId=${user?.nutriologoId}`);
    setLoading(true);

    const timeoutId = setTimeout(() => {
      dbgError('Gamificacion: timeout 15s — desbloqueo forzado');
      console.error('[NutriU] Gamificacion: timeout esperando datos de Supabase.');
      setLoading(false);
    }, 15000);

    try {
      dbgLog('Cargando relaciones paciente_nutriologo...');
      const { data: relaciones, error: errRel } = await supabase
        .from('paciente_nutriologo')
        .select('id_paciente')
        .eq('id_nutriologo', user.nutriologoId)
        .eq('activo', true);

      if (errRel) throw errRel;

      const pacienteIds = relaciones.map(r => r.id_paciente);

      if (pacienteIds.length === 0) {
        setMisPacientes([]);
        setFilteredPacientes([]);
        return;
      }

      const { data: pacientes, error: errPac } = await supabase
        .from('pacientes')
        .select('id_paciente, nombre, apellido, correo, foto_perfil')
        .in('id_paciente', pacienteIds);

      if (errPac) throw errPac;

      const { data: puntos, error: errPuntos } = await supabase
        .from('puntos_paciente')
        .select('id_paciente, puntos_totales')
        .in('id_paciente', pacienteIds);

      if (errPuntos) throw errPuntos;

      const pacientesConPuntos = pacientes.map(p => ({
        id: p.id_paciente,
        nombre: p.nombre,
        apellido: p.apellido,
        correo: p.correo,
        foto_perfil: p.foto_perfil
          ? (p.foto_perfil.startsWith('http') ? p.foto_perfil : `${STORAGE_PUBLIC_URL}${p.foto_perfil}`)
          : null,
        puntos: puntos.find(pt => pt.id_paciente === p.id_paciente)?.puntos_totales || 0,
      }));

      dbgOk(`Gamificacion pacientes cargados: ${pacientesConPuntos.length}`);
      setMisPacientes(pacientesConPuntos);
      setFilteredPacientes(pacientesConPuntos);
    } catch (error: any) {
      dbgError('fetchMisPacientes error', error);
      console.error('[NutriU] Gamificacion error:', error?.message ?? error);
      toast.error('No se pudieron cargar los pacientes');
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      dbgGroupEnd();
    }
  };
  const pacientesFiltrados = misPacientes.filter(paciente =>
    !searchQuery ||
    paciente.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    paciente.apellido.toLowerCase().includes(searchQuery.toLowerCase()) ||
    paciente.correo?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pacientesOrdenados = [...pacientesFiltrados].sort((a, b) => b.puntos - a.puntos);
  const handleDialogSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase().trim();
    const filtered = misPacientes.filter(paciente =>
      paciente.nombre.toLowerCase().includes(query) ||
      paciente.apellido.toLowerCase().includes(query) ||
      paciente.correo?.toLowerCase().includes(query)
    );
    setFilteredPacientes(filtered);
  };

  const handleAsignarPuntos = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const puntosNum = parseInt(puntosAsignar);
      if (isNaN(puntosNum) || puntosNum <= 0) {
        toast.error('Ingresa una cantidad válida de puntos (1 o más)');
        return;
      }
      if (puntosNum > 100) {
        toast.error('El máximo permitido por asignación es 100 puntos');
        return;
      }

      const pacienteId = parseInt(selectedPaciente);

      const { data: puntosData, error: errFetch } = await supabase
        .from('puntos_paciente')
        .select('puntos_totales')
        .eq('id_paciente', pacienteId)
        .single();

      if (errFetch) throw errFetch;

      const nuevosPuntos = (puntosData?.puntos_totales || 0) + puntosNum;

      const { error: errUpdate } = await supabase
        .from('puntos_paciente')
        .update({ puntos_totales: nuevosPuntos })
        .eq('id_paciente', pacienteId);

      if (errUpdate) throw errUpdate;

      const { error: errLog } = await supabase
        .from('log_puntos')
        .insert({
          id_paciente: pacienteId,
          puntos: puntosNum,
          tipo_accion: 'cita',
          descripcion: 'Puntos asignados por nutriólogo (máx. 100 por vez)',
        });

      if (errLog) throw errLog;

      const canjesOtorgados = await awardUnlockedCanjes(pacienteId, nuevosPuntos);

      const nombreNutriologo = `${user?.nombre || ''} ${user?.apellido || ''}`.trim();
      const pacienteSeleccionado = misPacientes.find((p) => p.id === pacienteId);
      const nombrePaciente = pacienteSeleccionado
        ? `${pacienteSeleccionado.nombre} ${pacienteSeleccionado.apellido}`.trim()
        : 'paciente';
      const mensajeNotificacion = nombreNutriologo
        ? `Has recibido ${puntosNum} puntos asignados por tu nutriólogo ${nombreNutriologo}.`
        : `Has recibido ${puntosNum} puntos asignados por tu nutriólogo.`;

      const { error: notificationError } = await supabase
        .from('notificaciones')
        .insert({
          id_usuario: pacienteId,
          tipo_usuario: 'paciente',
          titulo: 'Nuevos puntos acumulados',
          mensaje: mensajeNotificacion,
          tipo: 'pago',
          leida: false,
          fecha_envio: new Date().toISOString(),
          datos_adicionales: {
            id_paciente: pacienteId,
            paciente_nombre: nombrePaciente,
            id_nutriologo: Number(user?.nutriologoId),
            puntos_asignados: puntosNum,
            accion: 'navigate',
            pantalla_destino: 'puntos_acumulados',
            subtipo: 'asignacion_puntos'
          }
        });

      if (notificationError) {
        toast.error(`Los puntos se asignaron, pero falló la notificación: ${notificationError.message || 'Intenta de nuevo'}`);
      }

      const successMessage = canjesOtorgados.length > 0
        ? `${puntosNum} puntos asignados y ${canjesOtorgados.length} canje(s) desbloqueado(s)`
        : `${puntosNum} puntos asignados con éxito`;

      toast.success(successMessage);
      setIsDialogOpen(false);
      setSelectedPaciente('');
      setPuntosAsignar('');
      fetchMisPacientes();
    } catch (error: any) {
      toast.error('Error al asignar puntos');
    }
  };

  const handleGuardarRango = async (e: React.FormEvent) => {
    e.preventDefault();
    if (USE_LEGACY_REWARDS_SCHEMA) {
      toast.info('La gestión por rangos está deshabilitada. Se usan puntos requeridos por recompensa.');
      return;
    }
    try {
      const { nombre_rango, puntos_minimo, puntos_maximo, descripcion } = rangoFormData;
      
      if (!nombre_rango || !puntos_minimo) {
        toast.error('Nombre y puntos mínimo son requeridos');
        return;
      }

      const puntosMin = parseInt(puntos_minimo);
      const puntosMax = puntos_maximo ? parseInt(puntos_maximo) : null;

      if (isNaN(puntosMin) || puntosMin < 0) {
        toast.error('Puntos mínimo debe ser un número válido');
        return;
      }

      if (puntosMax && (isNaN(puntosMax) || puntosMax <= puntosMin)) {
        toast.error('Puntos máximo debe ser mayor que mínimo');
        return;
      }

      if (editingRango) {
        const { error } = await supabase
          .from('rangos_puntos')
          .update({
            nombre_rango,
            puntos_minimo: puntosMin,
            puntos_maximo: puntosMax,
            descripcion: descripcion || null,
            actualizado_en: new Date().toISOString()
          })
          .eq('id_rango', editingRango.id_rango);

        if (error) throw error;
        toast.success('Rango actualizado');
      } else {
        const { error } = await supabase
          .from('rangos_puntos')
          .insert({
            id_nutriologo: user.nutriologoId,
            nombre_rango,
            puntos_minimo: puntosMin,
            puntos_maximo: puntosMax,
            descripcion: descripcion || null,
            icono_nivel: nombre_rango.toLowerCase()
          });

        if (error) throw error;
        toast.success('Rango creado');
      }

      setIsRangoDialogOpen(false);
      setEditingRango(null);
      setRangoFormData({ nombre_rango: '', puntos_minimo: '', puntos_maximo: '', descripcion: '' });
      fetchRangosYCanjes();
    } catch (error: any) {
      toast.error('Error al guardar rango');
    }
  };

  const handleEliminarRango = async (idRango: number) => {
    if (USE_LEGACY_REWARDS_SCHEMA) {
      toast.info('La gestión por rangos está deshabilitada en este esquema.');
      return;
    }
    try {
      const { error } = await supabase
        .from('rangos_puntos')
        .update({ activo: false })
        .eq('id_rango', idRango);

      if (error) throw error;
      toast.success('Rango desactivado');
      fetchRangosYCanjes();
    } catch (error: any) {
      toast.error('Error al desactivar rango');
    }
  };

  const handleGuardarCanje = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { id_rango, nombre_canje, tipo_canje, valor_descuento, cantidad_consultas, descripcion, monto_minimo_consulta } = canjeFormData;

      if (USE_LEGACY_REWARDS_SCHEMA) {
        const puntosRequeridos = parseInt(valor_descuento);
        if (!nombre_canje || isNaN(puntosRequeridos) || puntosRequeridos < 0) {
          toast.error('Nombre y puntos requeridos válidos son obligatorios');
          return;
        }

        const tipoRecompensa = tipo_canje === 'descuento' ? 'descuento' : 'contenido';

        if (editingCanje) {
          const { error } = await supabase
            .from('recompensas')
            .update({
              nombre: nombre_canje,
              descripcion: descripcion || null,
              tipo_recompensa: tipoRecompensa,
              puntos_requeridos: puntosRequeridos,
              activa: true,
            })
            .eq('id_recompensa', editingCanje.id_canje);

          if (error) throw error;
          toast.success('Canje actualizado');
        } else {
          const { error } = await supabase
            .from('recompensas')
            .insert({
              nombre: nombre_canje,
              descripcion: descripcion || null,
              tipo_recompensa: tipoRecompensa,
              puntos_requeridos: puntosRequeridos,
              activa: true,
            });

          if (error) throw error;
          toast.success('Canje creado');
        }

        setIsCanjeDialogOpen(false);
        setEditingCanje(null);
        setCanjeFormData({
          id_rango: '',
          nombre_canje: '',
          tipo_canje: 'descuento',
          valor_descuento: '',
          cantidad_consultas: '1',
          descripcion: '',
          monto_minimo_consulta: ''
        });
        fetchRangosYCanjes();
        return;
      }

      if (!id_rango || !nombre_canje) {
        toast.error('Rango y nombre son requeridos');
        return;
      }

      const rangoObj = rangos.find(r => r.id_rango === parseInt(id_rango));
      if (!rangoObj) {
        toast.error('Rango no válido');
        return;
      }

      const dataToSend: any = {
        id_nutriologo: user.nutriologoId,
        id_rango: parseInt(id_rango),
        nombre_canje,
        tipo_canje: 'descuento',
        descripcion: descripcion || null
      };

      const descuento = parseInt(valor_descuento);
      if (isNaN(descuento) || descuento < 0 || descuento > 100) {
        toast.error('Descuento debe estar entre 0-100%');
        return;
      }
      dataToSend.valor_descuento = descuento;
      dataToSend.cantidad_consultas = null;

      if (monto_minimo_consulta) {
        const montoMin = parseFloat(monto_minimo_consulta);
        if (isNaN(montoMin) || montoMin <= 0) {
          toast.error('Monto mínimo debe ser un número válido');
          return;
        }
        dataToSend.monto_minimo_consulta = montoMin;
      }

      if (editingCanje) {
        const { error } = await supabase
          .from('canjes')
          .update({
            ...dataToSend,
            actualizado_en: new Date().toISOString()
          })
          .eq('id_canje', editingCanje.id_canje);

        if (error) throw error;
        toast.success('Canje actualizado');
      } else {
        const { data: canjeCreado, error } = await supabase
          .from('canjes')
          .insert(dataToSend)
          .select()
          .single();

        if (error) throw error;

        const pacientesElegibles = misPacientes.filter((paciente) => {
          const puntosPaciente = Number(paciente.puntos || 0);
          return (
            puntosPaciente >= Number(rangoObj.puntos_minimo || 0)
            && (rangoObj.puntos_maximo === null || rangoObj.puntos_maximo === undefined || puntosPaciente <= Number(rangoObj.puntos_maximo))
          );
        });

        for (const paciente of pacientesElegibles) {
          const { data: existingCanjePaciente } = await supabase
            .from('canjes_paciente')
            .select('id_canje_paciente')
            .eq('id_paciente', paciente.id)
            .eq('id_canje', canjeCreado.id_canje)
            .maybeSingle();

          if (existingCanjePaciente?.id_canje_paciente) {
            continue;
          }

          await supabase
            .from('canjes_paciente')
            .insert({
              id_paciente: paciente.id,
              id_canje: canjeCreado.id_canje,
              id_nutriologo: user.nutriologoId,
              estado: 'disponible',
            });
        }

        toast.success('Canje creado');
      }

      setIsCanjeDialogOpen(false);
      setEditingCanje(null);
      setCanjeFormData({
        id_rango: '',
        nombre_canje: '',
        tipo_canje: 'descuento',
        valor_descuento: '',
        cantidad_consultas: '1',
        descripcion: '',
        monto_minimo_consulta: ''
      });
      fetchRangosYCanjes();
    } catch (error: any) {
      toast.error('Error al guardar canje');
    }
  };

  const handleEliminarCanje = async (idCanje: number) => {
    const confirmado = window.confirm('¿Estás seguro de eliminar este canje? Esta acción lo desactivará.');
    if (!confirmado) {
      return;
    }

    try {
      if (USE_LEGACY_REWARDS_SCHEMA) {
        const { error } = await supabase
          .from('recompensas')
          .update({ activa: false })
          .eq('id_recompensa', idCanje);

        if (error) throw error;
        toast.success('Canje desactivado');
        fetchRangosYCanjes();
        return;
      }

      const { error } = await supabase
        .from('canjes')
        .update({ activo: false })
        .eq('id_canje', idCanje);

      if (error) throw error;
      toast.success('Canje desactivado');
      fetchRangosYCanjes();
    } catch (error: any) {
      toast.error('Error al desactivar canje');
    }
  };

  const abrirDialogRango = (rango?: any) => {
    if (rango) {
      setEditingRango(rango);
      setRangoFormData({
        nombre_rango: rango.nombre_rango,
        puntos_minimo: rango.puntos_minimo.toString(),
        puntos_maximo: rango.puntos_maximo?.toString() || '',
        descripcion: rango.descripcion || ''
      });
    } else {
      setEditingRango(null);
      setRangoFormData({ nombre_rango: '', puntos_minimo: '', puntos_maximo: '', descripcion: '' });
    }
    setIsRangoDialogOpen(true);
  };

  const abrirDialogCanje = (canje?: any) => {
    if (canje) {
      setEditingCanje(canje);
      setCanjeFormData({
        id_rango: canje.id_rango?.toString() || '',
        nombre_canje: canje.nombre_canje,
        tipo_canje: 'descuento',
        valor_descuento: USE_LEGACY_REWARDS_SCHEMA
          ? (canje.puntos_requeridos?.toString() || '')
          : (canje.valor_descuento?.toString() || ''),
        cantidad_consultas: canje.cantidad_consultas?.toString() || '1',
        descripcion: canje.descripcion || '',
        monto_minimo_consulta: canje.monto_minimo_consulta?.toString() || ''
      });
    } else {
      setEditingCanje(null);
      setCanjeFormData({
        id_rango: '',
        nombre_canje: '',
        tipo_canje: 'descuento',
        valor_descuento: '',
        cantidad_consultas: '1',
        descripcion: '',
        monto_minimo_consulta: ''
      });
    }
    setIsCanjeDialogOpen(true);
  };

  return (
    <div className="min-h-screen p-4 md:p-10 font-sans bg-[#F8FFF4] space-y-10">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
          <div>
            <div className="inline-flex flex-col items-start">
              <h1 className="text-4xl md:text-5xl font-[900] text-[#2E8B57] tracking-[4px] uppercase leading-none">
                Gamificación
              </h1>
              <div className="w-16 h-1.5 bg-[#3CB371] rounded-full mt-3" />
            </div>
            <p className="text-[#3CB371] font-bold text-base md:text-lg mt-4 uppercase tracking-[2px]">
              Motiva el progreso de tus pacientes
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full md:w-auto bg-[#2E8B57] hover:bg-[#1A3026] text-white font-black py-6 px-8 rounded-2xl shadow-lg transition-all uppercase tracking-widest text-sm md:text-base flex items-center justify-center gap-2">
                  <Plus className="h-5 w-5" />
                  Asignar Puntos
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-y-auto rounded-[2rem] sm:rounded-[2.5rem] border-2 border-[#D1E8D5] p-4 sm:p-6 md:p-8">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-[900] text-[#2E8B57] uppercase tracking-wider">
                    Premia el esfuerzo
                  </DialogTitle>
                  <DialogDescription className="text-sm md:text-base">
                    Asigna puntos a tus pacientes (máximo 100 por vez).
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAsignarPuntos} className="space-y-6 mt-6">
                  <div className="space-y-2">
                    <Label className="text-xs md:text-sm font-black uppercase text-gray-400 tracking-wider">
                      Buscar Paciente
                    </Label>
                    <Input
                      placeholder="Nombre, apellido o correo..."
                      onChange={handleDialogSearch}
                      className="border-2 border-[#D1E8D5] rounded-xl h-12 font-bold text-sm md:text-base focus:ring-[#2E8B57]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs md:text-sm font-black uppercase text-gray-400 tracking-wider">
                      Paciente
                    </Label>
                    <Select value={selectedPaciente} onValueChange={setSelectedPaciente}>
                      <SelectTrigger className="border-2 border-[#D1E8D5] rounded-xl h-12 text-sm md:text-base">
                        <SelectValue placeholder="Selecciona un paciente" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl max-h-60 overflow-y-auto">
                        {filteredPacientes.length === 0 ? (
                          <div className="p-4 text-center text-gray-500 text-sm">
                            No se encontraron pacientes
                          </div>
                        ) : (
                          filteredPacientes.map((paciente) => (
                            <SelectItem 
                              key={paciente.id} 
                              value={paciente.id.toString()} 
                              className="font-bold text-sm uppercase py-3"
                            >
                              {paciente.nombre} {paciente.apellido} ({paciente.correo}) - {formatPoints(paciente.puntos)} pts
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="puntos" className="text-xs md:text-sm font-black uppercase text-gray-400 tracking-wider">
                      Cantidad de Puntos (máx. 100)
                    </Label>
                    <Input
                      id="puntos"
                      type="number"
                      min="1"
                      max="100"
                      placeholder="1-100"
                      className="border-2 border-[#D1E8D5] rounded-xl h-12 font-bold text-sm md:text-base"
                      value={puntosAsignar}
                      onChange={(e) => setPuntosAsignar(e.target.value)}
                      required
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="flex-1 border-2 border-[#D1E8D5] text-gray-500 font-black uppercase text-sm md:text-base rounded-xl h-14"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-[#2E8B57] hover:bg-[#1A3026] text-white font-black uppercase text-xs md:text-sm tracking-widest h-14 rounded-xl"
                    >
                      Confirmar Recompensa
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <div className="relative w-full sm:w-80">
              <Input
                placeholder="Buscar paciente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 border-2 border-[#D1E8D5] rounded-xl h-12 font-bold text-sm md:text-base focus:ring-[#2E8B57]"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2E8B57]" size={20} />
            </div>
          </div>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="bg-white border-2 border-[#D1E8D5] rounded-2xl p-2 shadow-sm">
              <TabsTrigger 
                value="gamificacion"
                className="data-[state=active]:bg-[#2E8B57] data-[state=active]:text-white px-6 py-3 font-black uppercase text-xs md:text-sm rounded-xl transition-all"
              >
                <Trophy size={18} className="mr-2" />
                Gamificación
              </TabsTrigger>
              {ENABLE_CANJES_MODULE && (
                <TabsTrigger 
                  value="canjes"
                  className="data-[state=active]:bg-[#2E8B57] data-[state=active]:text-white px-6 py-3 font-black uppercase text-xs md:text-sm rounded-xl transition-all"
                >
                  <Gift size={18} className="mr-2" />
                  Canjes
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {!ENABLE_CANJES_MODULE && (
            <div className="text-center text-xs md:text-sm text-gray-500 font-semibold mb-6">
              Módulo de canjes deshabilitado temporalmente para mantener compatibilidad con tu esquema actual.
            </div>
          )}
          <TabsContent value="gamificacion" className="space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { n: 'Bronce', pts: '100-999', color: 'text-orange-600', bg: 'bg-orange-50', image: premioBronceImg, level: 'Principiante' },
            { n: 'Plata', pts: '1,000-4,999', color: 'text-slate-500', bg: 'bg-slate-50', image: premioPlataImg, level: 'Intermedio' },
            { n: 'Oro', pts: '5,000-9,999', color: 'text-yellow-600', bg: 'bg-yellow-50', image: premioOroImg, level: 'Avanzado' },
            { n: 'Diamante', pts: '10,000+', color: 'text-blue-600', bg: 'bg-blue-50', image: premioDiamanteImg, level: 'Leyenda' },
          ].map((lvl) => (
            <Card key={lvl.n} className="rounded-[2rem] border-2 border-[#D1E8D5] overflow-hidden shadow-none">
              <CardContent className={`p-6 flex flex-col items-center justify-center text-center space-y-2 ${lvl.bg}`}>
                <img src={lvl.image} alt={`Premio ${lvl.n}`} className="h-7 w-7 object-contain" />
                <p className={`font-black text-xs md:text-sm uppercase tracking-tighter ${lvl.color}`}>{lvl.n}</p>
                <p className="text-xs md:text-sm font-bold text-gray-400">{lvl.pts} PTS</p>
                <p className={`text-[10px] md:text-xs font-bold uppercase tracking-tighter ${lvl.color}`}>{lvl.level}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="rounded-[2.5rem] border-2 border-[#D1E8D5] overflow-hidden bg-white shadow-sm">
            <CardHeader className="bg-[#F8FFF9] border-b border-[#D1E8D5] p-8">
              <CardTitle className="text-base md:text-lg font-[900] text-[#1A3026] uppercase tracking-[2px] flex items-center gap-2">
                <Trophy className="text-[#2E8B57]" size={18} /> Hall de la Fama
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              {pacientesOrdenados.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  {searchQuery.trim() ? 'No se encontraron pacientes con esa búsqueda' : 'No hay pacientes asignados aún'}
                </div>
              ) : (
                pacientesOrdenados.map((paciente, index) => {
                  const nivel = getNivelPaciente(paciente.puntos);
                  const progreso = getProgresoNivel(paciente.puntos);
                  const premioNivelImage = getPremioImageByNivel(nivel.nivel);
                  return (
                    <div key={paciente.id} className="group relative">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-base border-2 ${
                            index === 0 ? 'bg-yellow-400 border-yellow-500 text-white' : 'bg-white border-[#D1E8D5] text-[#2E8B57]'
                          }`}>
                            #{index + 1}
                          </div>
                          <Avatar className="h-12 w-12 border-2 border-[#D1E8D5]">
                            <AvatarImage
                              src={paciente.foto_perfil || ''}
                              alt={`${paciente.nombre} ${paciente.apellido}`}
                              className="object-cover"
                            />
                            <AvatarFallback className="bg-[#F0FFF4] text-[#2E8B57] font-black text-xs uppercase">
                              {`${paciente.nombre?.[0] || ''}${paciente.apellido?.[0] || ''}`.trim() || 'NA'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-black text-[#1A3026] uppercase text-sm md:text-base">
                              {paciente.nombre} {paciente.apellido}
                            </p>
                            <div className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-lg border-2 ${nivel.border} ${nivel.bgColor}`}>
                              {premioNivelImage ? (
                                <img src={premioNivelImage} alt={`Premio ${nivel.nivel}`} className="h-3 w-3 object-contain" />
                              ) : (
                                <nivel.icon size={10} className={nivel.color} />
                              )}
                              <span className={`text-[10px] md:text-xs font-black uppercase ${nivel.color}`}>
                                {nivel.nivel}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl md:text-2xl font-black text-[#1A3026] leading-none">
                            {formatPoints(paciente.puntos)}
                          </p>
                          <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
                            Puntos Totales
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] md:text-xs font-black uppercase text-gray-400 tracking-tighter">
                          <span>Progreso de Nivel</span>
                          <span>{progreso.toFixed(0)}%</span>
                        </div>
                        <Progress value={progreso} className="h-1.5 bg-[#F0FFF4]" />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
          <Card className="rounded-[2.5rem] border-2 border-[#D1E8D5] overflow-hidden bg-white shadow-sm">
            <CardHeader className="bg-[#F8FFF9] border-b border-[#D1E8D5] p-8">
              <CardTitle className="text-base md:text-lg font-[900] text-[#1A3026] uppercase tracking-[2px] flex items-center gap-2">
                <TrendingUp className="text-[#2E8B57]" size={18} /> Cumplimiento de Metas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              {pacientesFiltrados.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  {searchQuery.trim() ? 'No se encontraron pacientes con esa búsqueda' : 'No hay pacientes registrados aún'}
                </div>
              ) : (
                pacientesFiltrados.map((paciente) => {
                  const cumplimiento = (paciente.puntos / 10000) * 100;
                  const esExitoso = cumplimiento >= 90;
                  const nivel = getNivelPaciente(paciente.puntos);
                  return (
                    <div key={paciente.id} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-[#D1E8D5]">
                            <AvatarImage
                              src={paciente.foto_perfil || ''}
                              alt={`${paciente.nombre} ${paciente.apellido}`}
                              className="object-cover"
                            />
                            <AvatarFallback className="bg-[#F0FFF4] text-[#2E8B57] font-black text-xs uppercase">
                              {`${paciente.nombre?.[0] || ''}${paciente.apellido?.[0] || ''}`.trim() || 'NA'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-black text-[#1A3026] uppercase text-sm md:text-base">{paciente.nombre}</p>
                            <p className="text-xs md:text-sm font-bold text-gray-400 tracking-tight">META: 10,000 PTS</p>
                          </div>
                        </div>
                        <div className={`px-4 py-2 rounded-xl border-2 font-black text-xs md:text-sm uppercase shadow-sm ${
                          esExitoso ? 'bg-[#F0FFF4] border-[#D1E8D5] text-[#2E8B57]' : 'bg-orange-50 border-orange-100 text-orange-600'
                        }`}>
                          {cumplimiento.toFixed(0)}% Performance
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] md:text-xs font-black uppercase text-gray-400 tracking-tighter">
                          <span>Nivel Actual</span>
                          <span>{nivel.nivel}</span>
                        </div>
                        <Progress 
                          value={getProgresoNivel(paciente.puntos)} 
                          className="h-1.5 bg-[#F0FFF4]" 
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
          </TabsContent>

            {/* ═══════════════════════════════════════════════════════
              TAB: GESTIÓN DE CANJES
              ═══════════════════════════════════════════════════════ */}
            {ENABLE_CANJES_MODULE && <TabsContent value="canjes" className="space-y-8">
            {loadingCanjes ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Cargando canjes...</p>
              </div>
            ) : (
              <>
                {!USE_LEGACY_REWARDS_SCHEMA && <Card className="rounded-[2.5rem] border-2 border-[#D1E8D5] overflow-hidden bg-white shadow-sm">
                  <CardHeader className="bg-[#F8FFF9] border-b border-[#D1E8D5] p-8 flex flex-row items-center justify-between">
                    <CardTitle className="text-base md:text-lg font-[900] text-[#1A3026] uppercase tracking-[2px] flex items-center gap-2">
                      <Target className="text-[#2E8B57]" size={20} /> Rangos de Puntos
                    </CardTitle>
                    <Dialog open={isRangoDialogOpen} onOpenChange={setIsRangoDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          onClick={() => abrirDialogRango()}
                          className="bg-[#2E8B57] hover:bg-[#1A3026] text-white font-black py-2 px-4 rounded-lg text-xs md:text-sm flex items-center gap-2"
                        >
                          <Plus size={16} />
                          Nuevo Rango
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-y-auto rounded-[2rem] border-2 border-[#D1E8D5] p-4 sm:p-6 md:p-8">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-[900] text-[#2E8B57] uppercase">
                            {editingRango ? 'Editar Rango' : 'Crear Nuevo Rango'}
                          </DialogTitle>
                          <DialogDescription>
                            Configura un rango de puntos para tus pacientes
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleGuardarRango} className="space-y-6 mt-6">
                          <div className="space-y-2">
                            <Label className="text-xs md:text-sm font-black uppercase text-gray-400 tracking-wider">
                              Nombre del Rango
                            </Label>
                            <Input
                              placeholder="e.g., Bronce, Plata, Oro"
                              value={rangoFormData.nombre_rango}
                              onChange={(e) => setRangoFormData({ ...rangoFormData, nombre_rango: e.target.value })}
                              className="border-2 border-[#D1E8D5] rounded-xl h-12 font-bold"
                              required
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-xs md:text-sm font-black uppercase text-gray-400 tracking-wider">
                                Puntos Mínimo
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                placeholder="100"
                                value={rangoFormData.puntos_minimo}
                                onChange={(e) => setRangoFormData({ ...rangoFormData, puntos_minimo: e.target.value })}
                                className="border-2 border-[#D1E8D5] rounded-xl h-12 font-bold"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs md:text-sm font-black uppercase text-gray-400 tracking-wider">
                                Puntos Máximo (opcional)
                              </Label>
                              <Input
                                type="number"
                                placeholder="999"
                                value={rangoFormData.puntos_maximo}
                                onChange={(e) => setRangoFormData({ ...rangoFormData, puntos_maximo: e.target.value })}
                                className="border-2 border-[#D1E8D5] rounded-xl h-12 font-bold"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs md:text-sm font-black uppercase text-gray-400 tracking-wider">
                              Descripción (opcional)
                            </Label>
                            <Input
                              placeholder="Descripción del rango..."
                              value={rangoFormData.descripcion}
                              onChange={(e) => setRangoFormData({ ...rangoFormData, descripcion: e.target.value })}
                              className="border-2 border-[#D1E8D5] rounded-xl h-12 font-bold"
                            />
                          </div>
                          <div className="flex gap-4 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIsRangoDialogOpen(false)}
                              className="flex-1 border-2 border-[#D1E8D5] text-gray-500 font-black uppercase rounded-xl h-12"
                            >
                              Cancelar
                            </Button>
                            <Button
                              type="submit"
                              className="flex-1 bg-[#2E8B57] hover:bg-[#1A3026] text-white font-black uppercase h-12 rounded-xl"
                            >
                              {editingRango ? 'Actualizar' : 'Crear'}
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent className="p-8">
                    {rangos.length === 0 ? (
                      <div className="text-center py-12 px-6 rounded-2xl border-2 border-dashed border-[#D1E8D5] bg-[#FBFFFC]">
                        <p className="text-sm font-black uppercase tracking-wide text-[#2E8B57] mb-2">Sin rangos configurados</p>
                        <p className="text-sm text-gray-500">Crea el primer rango para organizar los canjes por nivel.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {rangos.map((rango) => (
                          <div key={rango.id_rango} className="group rounded-2xl border-2 border-[#D1E8D5] bg-white p-5 transition-all hover:border-[#A7D9BA] hover:shadow-md">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Target size={15} className="text-[#2E8B57]" />
                                  <h4 className="font-black text-[#1A3026] uppercase text-sm tracking-wide">{rango.nombre_rango}</h4>
                                </div>

                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-[#F0FFF4] border border-[#D1E8D5]">
                                  <span className="text-[11px] font-black uppercase tracking-wider text-[#2E8B57]">Rango</span>
                                  <span className="text-xs font-black text-[#1A3026]">
                                    {formatPoints(rango.puntos_minimo)} - {rango.puntos_maximo ? formatPoints(rango.puntos_maximo) : 'sin límite'} pts
                                  </span>
                                </div>

                                {rango.descripcion && (
                                  <p className="text-xs text-gray-600 mt-3 leading-relaxed">{rango.descripcion}</p>
                                )}
                              </div>

                              <div className="flex items-center gap-2 self-start md:self-center">
                                <Button
                                  onClick={() => abrirDialogRango(rango)}
                                  size="sm"
                                  variant="outline"
                                  className="h-9 px-3 border-2 border-[#C7E8D2] text-[#2E8B57] bg-white hover:bg-[#F2FFF6] font-black rounded-xl"
                                >
                                  <Edit size={14} className="mr-1" /> Editar
                                </Button>
                                <Button
                                  onClick={() => handleEliminarRango(rango.id_rango)}
                                  size="sm"
                                  variant="outline"
                                  className="h-9 px-3 border-2 border-[#F2D4D4] text-[#B54747] bg-white hover:bg-[#FFF5F5] font-black rounded-xl"
                                >
                                  <Trash2 size={14} className="mr-1" /> Eliminar
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>}
                <Card className="rounded-[2.5rem] border-2 border-[#D1E8D5] overflow-hidden bg-white shadow-sm">
                  <CardHeader className="bg-[#F8FFF9] border-b border-[#D1E8D5] p-8 flex flex-row items-center justify-between">
                    <CardTitle className="text-base md:text-lg font-[900] text-[#1A3026] uppercase tracking-[2px] flex items-center gap-2">
                      <Gift className="text-[#2E8B57]" size={20} /> Canjes y Descuentos
                    </CardTitle>
                    <Dialog open={isCanjeDialogOpen} onOpenChange={setIsCanjeDialogOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          onClick={() => abrirDialogCanje()}
                          disabled={!USE_LEGACY_REWARDS_SCHEMA && rangos.length === 0}
                          className="bg-[#2E8B57] hover:bg-[#1A3026] text-white font-black py-2 px-4 rounded-lg text-xs md:text-sm flex items-center gap-2 disabled:opacity-50"
                        >
                          <Plus size={16} />
                          Nuevo Canje
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-y-auto rounded-[2rem] border-2 border-[#D1E8D5] p-4 sm:p-6 md:p-8">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-[900] text-[#2E8B57] uppercase">
                            {editingCanje ? 'Editar Canje' : 'Crear Nuevo Canje'}
                          </DialogTitle>
                          <DialogDescription>
                            {USE_LEGACY_REWARDS_SCHEMA
                              ? 'Define descuentos con puntos requeridos para canjear'
                              : 'Define descuentos para tus rangos'}
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleGuardarCanje} className="space-y-6 mt-6">
                          {!USE_LEGACY_REWARDS_SCHEMA && <div className="space-y-2">
                            <Label className="text-xs md:text-sm font-black uppercase text-gray-400 tracking-wider">
                              Rango
                            </Label>
                            <Select value={canjeFormData.id_rango} onValueChange={(val) => setCanjeFormData({ ...canjeFormData, id_rango: val })}>
                              <SelectTrigger className="border-2 border-[#D1E8D5] rounded-xl h-12">
                                <SelectValue placeholder="Selecciona un rango" />
                              </SelectTrigger>
                              <SelectContent>
                                {rangos.map((r) => (
                                  <SelectItem key={r.id_rango} value={r.id_rango.toString()}>
                                    {r.nombre_rango} ({r.puntos_minimo}-{r.puntos_maximo || '∞'})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>}
                          <div className="space-y-2">
                            <Label className="text-xs md:text-sm font-black uppercase text-gray-400 tracking-wider">
                              Nombre del Canje
                            </Label>
                            <Input
                              placeholder="e.g., 15% de descuento"
                              value={canjeFormData.nombre_canje}
                              onChange={(e) => setCanjeFormData({ ...canjeFormData, nombre_canje: e.target.value })}
                              className="border-2 border-[#D1E8D5] rounded-xl h-12 font-bold"
                              required
                            />
                          </div>
                          {!USE_LEGACY_REWARDS_SCHEMA && (
                            <div className="space-y-2">
                              <Label className="text-xs md:text-sm font-black uppercase text-gray-400 tracking-wider">
                                Tipo de Canje
                              </Label>
                              <div className="h-12 px-4 flex items-center border-2 border-[#D1E8D5] rounded-xl bg-[#F8FFF9] text-[#1A3026] font-bold">
                                <Percent size={14} className="mr-2 text-[#2E8B57]" /> Descuento
                              </div>
                            </div>
                          )}

                          {USE_LEGACY_REWARDS_SCHEMA && (
                            <div className="space-y-2">
                              <Label className="text-xs md:text-sm font-black uppercase text-gray-400 tracking-wider">
                                Puntos Requeridos para Canjear
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                placeholder="100"
                                value={canjeFormData.valor_descuento}
                                onChange={(e) => setCanjeFormData({ ...canjeFormData, valor_descuento: e.target.value })}
                                className="border-2 border-[#D1E8D5] rounded-xl h-12 font-bold"
                                required
                              />
                            </div>
                          )}

                          {!USE_LEGACY_REWARDS_SCHEMA && (
                            <div className="space-y-2">
                              <Label className="text-xs md:text-sm font-black uppercase text-gray-400 tracking-wider">
                                Porcentaje de Descuento (0-100%)
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                placeholder="15"
                                value={canjeFormData.valor_descuento}
                                onChange={(e) => setCanjeFormData({ ...canjeFormData, valor_descuento: e.target.value })}
                                className="border-2 border-[#D1E8D5] rounded-xl h-12 font-bold"
                                required
                              />
                            </div>
                          )}

                          {!USE_LEGACY_REWARDS_SCHEMA && <div className="space-y-2">
                            <Label className="text-xs md:text-sm font-black uppercase text-gray-400 tracking-wider">
                              Monto Mínimo de Consulta (opcional)
                            </Label>
                            <p className="text-xs text-gray-500">Monto mínimo para aplicar el canje (evita pérdidas, ej: $100.00)</p>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="100.00"
                              value={canjeFormData.monto_minimo_consulta}
                              onChange={(e) => setCanjeFormData({ ...canjeFormData, monto_minimo_consulta: e.target.value })}
                              className="border-2 border-[#D1E8D5] rounded-xl h-12 font-bold"
                            />
                          </div>}

                          <div className="space-y-2">
                            <Label className="text-xs md:text-sm font-black uppercase text-gray-400 tracking-wider">
                              Descripción (opcional)
                            </Label>
                            <Input
                              placeholder="Detalles adicionales del canje..."
                              value={canjeFormData.descripcion}
                              onChange={(e) => setCanjeFormData({ ...canjeFormData, descripcion: e.target.value })}
                              className="border-2 border-[#D1E8D5] rounded-xl h-12 font-bold"
                            />
                          </div>

                          <div className="flex gap-4 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIsCanjeDialogOpen(false)}
                              className="flex-1 border-2 border-[#D1E8D5] text-gray-500 font-black uppercase rounded-xl h-12"
                            >
                              Cancelar
                            </Button>
                            <Button
                              type="submit"
                              className="flex-1 bg-[#2E8B57] hover:bg-[#1A3026] text-white font-black uppercase h-12 rounded-xl"
                            >
                              {editingCanje ? 'Actualizar' : 'Crear'}
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent className="p-8">
                    {canjes.length === 0 ? (
                      <div className="text-center py-12 px-6 rounded-2xl border-2 border-dashed border-[#D1E8D5] bg-[#FBFFFC]">
                        <p className="text-sm font-black uppercase tracking-wide text-[#2E8B57] mb-2">Sin canjes disponibles</p>
                        <p className="text-sm text-gray-500">Crea descuentos para que tus pacientes intercambien sus puntos.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {canjes.map((canje: any) => (
                          <div key={canje.id_canje} className="group rounded-2xl border-2 border-[#D1E8D5] bg-white p-5 transition-all hover:border-[#A7D9BA] hover:shadow-md">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <Percent size={16} className="text-blue-600" />
                                  <h4 className="font-black text-[#1A3026] uppercase text-sm tracking-wide truncate">{canje.nombre_canje}</h4>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 mb-3">
                                  {USE_LEGACY_REWARDS_SCHEMA ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F0FFF4] border border-[#D1E8D5] text-[11px] font-black uppercase text-[#2E8B57]">
                                      Requiere {formatPoints(canje.puntos_requeridos || 0)} pts
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F5F8FF] border border-[#DCE7FF] text-[11px] font-black uppercase text-[#3E5DA8]">
                                      Rango {canje.rangos_puntos?.nombre_rango || 'N/A'}
                                    </span>
                                  )}
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FFF8E8] border border-[#F2E3B3] text-[11px] font-black uppercase text-[#A67510]">
                                    Descuento
                                  </span>
                                </div>

                                {canje.descripcion && (
                                  <p className="text-xs text-gray-600 leading-relaxed">{canje.descripcion}</p>
                                )}
                                {canje.monto_minimo_consulta && (
                                  <p className="text-xs text-orange-600 mt-2 font-bold">
                                    Monto mínimo: ${canje.monto_minimo_consulta.toFixed(2)}
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-col gap-2">
                                <Button
                                  onClick={() => abrirDialogCanje(canje)}
                                  size="sm"
                                  variant="outline"
                                  className="h-9 px-3 border-2 border-[#C7E8D2] text-[#2E8B57] bg-white hover:bg-[#F2FFF6] font-black rounded-xl"
                                >
                                  <Edit size={14} className="mr-1" /> Editar
                                </Button>
                                <Button
                                  onClick={() => handleEliminarCanje(canje.id_canje)}
                                  size="sm"
                                  variant="outline"
                                  className="h-9 px-3 border-2 border-[#F2D4D4] text-[#B54747] bg-white hover:bg-[#FFF5F5] font-black rounded-xl"
                                >
                                  <Trash2 size={14} className="mr-1" /> Eliminar
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>}
        </Tabs>
      </div>
    </div>
  );
}