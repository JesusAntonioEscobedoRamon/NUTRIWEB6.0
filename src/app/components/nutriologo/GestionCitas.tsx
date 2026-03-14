import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Calendar as DateCalendar } from '@/app/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Badge } from '@/app/components/ui/badge';
import { useAuth } from '@/app/context/useAuth';
import { supabase } from '@/app/context/supabaseClient';
import { Calendar, Clock, Plus, CheckCircle, History, LayoutDashboard, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { DateTime } from 'luxon';
import { es } from 'date-fns/locale';
import { dbgGroup, dbgGroupEnd, dbgLog, dbgOk, dbgWarn, dbgError } from '@/utils/debug';

const SONORA_TIMEZONE = 'America/Phoenix'; // San Luis Río Colorado, Sonora
const STORAGE_PUBLIC_URL = 'https://hthnkzwjotwqhvjgqhfv.supabase.co/storage/v1/object/public/perfiles/';
const WORK_START_HOUR = 8;
const WORK_END_HOUR = 17;
const APPOINTMENT_TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
];

const isoDateToLocalDate = (isoDate: string): Date => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
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
            <CalendarClock size={80} strokeWidth={1.5} />
          </div>
        </div>
        
        <div 
          ref={textRef}
          className="text-[#2E8B57] font-bold text-2xl mb-6"
        >
          Cargando agenda de citas...
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

export function GestionCitas() {
  const { user } = useAuth();
  const tarifaConsulta = Number(user?.tarifa || 0);
  const currentYear = new Date().getFullYear();
  const minYear = Math.min(currentYear, 2027);
  const maxYear = Math.max(currentYear, 2027);
  const minDate = `${minYear}-01-01`;
  const maxDate = `${maxYear}-12-31`;
  const todayIso = DateTime.now().setZone(SONORA_TIMEZONE).toFormat('yyyy-LL-dd');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [citas, setCitas] = useState<any[]>([]);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [filteredPacientes, setFilteredPacientes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(todayIso); // Hoy por defecto
  const [draftSelectedDate, setDraftSelectedDate] = useState(todayIso);

  useEffect(() => {
    if (!user?.nutriologoId) {
      setLoading(false);
      toast.error('No se detectó ID de nutriólogo');
      return;
    }
    const fetchData = async () => {
      dbgGroup('screen', `GestionCitas — nutriologoId=${user.nutriologoId}`);
      setLoading(true);

      const timeoutId = setTimeout(() => {
        dbgError('GestionCitas: timeout 15s — desbloqueo forzado');
        console.error('[NutriU] GestionCitas: timeout esperando datos de Supabase.');
        setLoading(false);
      }, 15000);

      try {
        const nutriologoId = Number(user.nutriologoId);
        dbgLog('Cargando relaciones paciente_nutriologo...');
        const { data: relaciones, error: errRel } = await supabase
          .from('paciente_nutriologo')
          .select('*')
          .eq('id_nutriologo', nutriologoId)
          .eq('activo', true);

        if (errRel) {
          dbgError('Error paciente_nutriologo', errRel);
          throw errRel;
        }
        dbgLog(`Relaciones: ${relaciones?.length ?? 0}`);

        const pacienteIds = relaciones?.map(r => r.id_paciente) || [];
        const activeSinceByPaciente = new Map<number, string>();

        (relaciones || []).forEach((rel: any) => {
          const relPacienteId = Number(rel.id_paciente);
          const activeSince = rel.updated_at || rel.fecha_asignacion || rel.created_at || null;
          if (activeSince) {
            activeSinceByPaciente.set(relPacienteId, activeSince);
          }
        });

        if (pacienteIds.length === 0) {
          setPacientes([]);
          setFilteredPacientes([]);
          setCitas([]);
        } else {
          const { data: pacientesData, error: errPac } = await supabase
            .from('pacientes')
            .select('id_paciente, nombre, apellido, correo, foto_perfil')
            .in('id_paciente', pacienteIds);

          if (errPac) throw errPac;

          const pacientesConFoto = pacientesData?.map(p => {
            let fotoUrl = p.foto_perfil;
            if (fotoUrl && !fotoUrl.startsWith('http')) {
              fotoUrl = `${STORAGE_PUBLIC_URL}${fotoUrl}`;
            }
            return { ...p, foto_perfil: fotoUrl || null };
          }) || [];

          setPacientes(pacientesConFoto);
          setFilteredPacientes(pacientesConFoto);
        }
        const { data: citasData, error: errCitas } = await supabase
          .from('citas')
          .select(`
            id_cita,
            fecha_hora,
            estado,
            id_paciente,
            pacientes!inner (nombre, apellido, foto_perfil),
            pagos!left (monto, estado)
          `)
          .eq('id_nutriologo', nutriologoId)
          .in('id_paciente', pacienteIds)
          .order('fecha_hora', { ascending: false });

        if (errCitas) throw errCitas;

        const citasFormateadas = (citasData || [])
          .filter((c: any) => {
            const activeSince = activeSinceByPaciente.get(Number(c.id_paciente));
            if (!activeSince) return true;

            const citaUtc = DateTime.fromISO(c.fecha_hora, { zone: 'utc' });
            const activeSinceUtc = DateTime.fromISO(activeSince).toUTC();

            if (!citaUtc.isValid || !activeSinceUtc.isValid) return true;
            return citaUtc >= activeSinceUtc;
          })
          .map(c => {
          const sonoraDate = DateTime.fromISO(c.fecha_hora, { zone: 'utc' }).setZone(SONORA_TIMEZONE);
          const paciente: any = Array.isArray(c.pacientes) ? c.pacientes[0] : c.pacientes;

          let fotoUrl = paciente?.foto_perfil;
          if (fotoUrl && !fotoUrl.startsWith('http')) {
            fotoUrl = `${STORAGE_PUBLIC_URL}${fotoUrl}`;
          }

          return {
            id: c.id_cita,
            fecha: sonoraDate.toLocaleString(DateTime.DATE_MED),
            hora: sonoraDate.toLocaleString(DateTime.TIME_SIMPLE),
            fecha_hora: c.fecha_hora, // Para filtrar
            estado: c.estado,
            pacienteNombre: `${paciente?.nombre || ''} ${paciente?.apellido || ''}`,
            foto_perfil: fotoUrl || null,
            pagada: c.pagos?.some(p => p.estado === 'completado') || false,
            monto: c.pagos?.[0]?.monto ?? tarifaConsulta
          };
        });

        setCitas(citasFormateadas);
        dbgOk(`GestionCitas cargada: ${citasFormateadas.length} citas`);
      } catch (err: any) {
        dbgError('GestionCitas fetchData error', err);
        console.error('[NutriU] GestionCitas error:', err?.message ?? err);
        toast.error('No se pudieron cargar las citas');
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
        dbgGroupEnd();
      }
    };

    fetchData();
  }, [user?.nutriologoId]);
  const filterCitasByDate = (dateStr: string) => {
    if (!dateStr) return citas;
    const selectedDay = DateTime.fromISO(dateStr, { zone: SONORA_TIMEZONE }).startOf('day');
    const endOfDay = selectedDay.endOf('day');
    const startUTC = selectedDay.toUTC().toISO();
    const endUTC = endOfDay.toUTC().toISO();

    return citas.filter(c => {
      const citaDate = new Date(c.fecha_hora);
      return citaDate >= new Date(startUTC) && citaDate <= new Date(endUTC);
    });
  };

  const citasFiltradas = filterCitasByDate(selectedDate);
  const citasPendientes = citasFiltradas.filter(
    c => c.estado === 'pendiente' || c.estado === 'pendiente_pagado' || c.estado === 'confirmada'
  );
  const citasCompletadas = citasFiltradas.filter(c => c.estado === 'completada');
  const draftDateObject = draftSelectedDate ? isoDateToLocalDate(draftSelectedDate) : undefined;
  const fechaDateObject = fecha ? isoDateToLocalDate(fecha) : undefined;
  const minDateObject = isoDateToLocalDate(minDate);
  const maxDateObject = isoDateToLocalDate(maxDate);
  const selectedPacienteInfo = pacientes.find(
    (p) => p.id_paciente.toString() === selectedPaciente
  );
  const occupiedHoursForSelectedDate = new Set(
    fecha
      ? citas
          .filter((c) => {
            if (c.estado === 'cancelada') return false;
            const sonoraDate = DateTime.fromISO(c.fecha_hora, { zone: 'utc' }).setZone(SONORA_TIMEZONE);
            return sonoraDate.toFormat('yyyy-LL-dd') === fecha;
          })
          .map((c) => DateTime.fromISO(c.fecha_hora, { zone: 'utc' }).setZone(SONORA_TIMEZONE).toFormat('HH:mm'))
      : []
  );
  const morningSlots = APPOINTMENT_TIME_SLOTS.filter((slot) => Number(slot.split(':')[0]) < 12);
  const afternoonSlots = APPOINTMENT_TIME_SLOTS.filter((slot) => Number(slot.split(':')[0]) >= 12);
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase().trim();
    setSearchQuery(query);

    if (!query) {
      setFilteredPacientes(pacientes);
      return;
    }

    const filtered = pacientes.filter(p =>
      p.nombre.toLowerCase().includes(query) ||
      p.apellido.toLowerCase().includes(query) ||
      p.correo.toLowerCase().includes(query)
    );

    setFilteredPacientes(filtered);
  };
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredPacientes.length === 1) {
        const unico = filteredPacientes[0];
        setSelectedPaciente(unico.id_paciente.toString());
        toast.success(`Paciente seleccionado: ${unico.nombre} ${unico.apellido}`);
      } else if (filteredPacientes.length > 1) {
        toast.info('Varios pacientes encontrados. Selecciona uno del menú.');
      } else {
        toast.warning('No se encontró ningún paciente.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPaciente || !fecha || !hora) {
      toast.error('Completa todos los campos para agendar la cita.');
      return;
    }

    try {
      const [year, month, day] = fecha.split('-').map(Number);
      const [hours, minutes] = hora.split(':').map(Number);

      const selectedMinutes = hours * 60 + minutes;
      const workStartMinutes = WORK_START_HOUR * 60;
      const workEndMinutes = WORK_END_HOUR * 60;

      if (selectedMinutes < workStartMinutes || selectedMinutes > workEndMinutes) {
        toast.error('La cita debe agendarse en horario laboral: 08:00 a 17:00.');
        return;
      }

      if (occupiedHoursForSelectedDate.has(hora)) {
        toast.error('Ese horario ya tiene una cita agendada para la fecha seleccionada.');
        return;
      }

      const localSonora = DateTime.fromObject(
        { year, month, day, hour: hours, minute: minutes },
        { zone: SONORA_TIMEZONE }
      );

      if (!localSonora.isValid) {
        toast.error('La fecha u hora seleccionada no es válida.');
        return;
      }

      const now = DateTime.now().setZone(SONORA_TIMEZONE);
      if (localSonora < now) {
        toast.error('No se puede agendar citas en fechas pasadas.');
        return;
      }

      const fechaHoraUTC = localSonora.toUTC().toISO();

      const nutriologoId = Number(user.nutriologoId);

      const idPaciente = Number(selectedPaciente);
      const { count: existingCount, error: existingCountError } = await supabase
        .from('citas')
        .select('id_cita', { count: 'exact', head: true })
        .eq('id_paciente', idPaciente)
        .eq('id_nutriologo', nutriologoId);

      if (existingCountError) throw existingCountError;

      const { data: citaCreada, error } = await supabase
        .from('citas')
        .insert({
          id_paciente: idPaciente,
          id_nutriologo: nutriologoId,
          fecha_hora: fechaHoraUTC,
          estado: 'pendiente',
          duracion_minutos: 60,
          tipo_cita: 'presencial'
        })
        .select('id_cita')
        .single();

      if (error) throw error;

      const fechaHoraMensaje = localSonora
        .setLocale('es')
        .toFormat("dd 'de' LLLL yyyy 'a las' HH:mm");

      const nombreNutriologo = `${user.nombre || ''} ${user.apellido || ''}`.trim();
      const mensajeNotificacion = nombreNutriologo
        ? `Tienes una cita con el nutriólogo ${nombreNutriologo} el ${fechaHoraMensaje}. La cita está pendiente de pago.`
        : `Tienes una cita agendada el ${fechaHoraMensaje}. La cita está pendiente de pago.`;

      const shouldCreatePaymentNotification = (existingCount || 0) > 0;

      if (shouldCreatePaymentNotification) {
        const { error: notificationError } = await supabase
          .from('notificaciones')
          .insert({
            id_usuario: idPaciente,
            tipo_usuario: 'paciente',
            titulo: 'Cita pendiente de pago',
            mensaje: mensajeNotificacion,
            tipo: 'pago',
            leida: false,
            fecha_envio: new Date().toISOString(),
            datos_adicionales: {
              id_cita: citaCreada?.id_cita,
              id_nutriologo: nutriologoId,
              doctor_nombre: nombreNutriologo || 'Nutriólogo',
              precio: tarifaConsulta,
              requiere_pago: true,
              estado: 'pendiente_pago',
              subtipo: 'cita_pendiente_pago'
            }
          });

        if (notificationError) {
          toast.error(`La cita se agendó, pero falló la notificación: ${notificationError.message || 'Intenta de nuevo'}`);
        } else {
          toast.success('Cita agendada exitosamente');
        }
      } else {
        toast.success('Cita agendada exitosamente');
      }

      setIsDialogOpen(false);
      setSelectedPaciente('');
      setFecha('');
      setHora('');
      setSearchQuery('');
      const { data: relacionesActivas, error: errRelacionesActivas } = await supabase
        .from('paciente_nutriologo')
        .select('*')
        .eq('id_nutriologo', nutriologoId)
        .eq('activo', true);

      if (errRelacionesActivas) throw errRelacionesActivas;

      const pacienteIdsActivos = relacionesActivas?.map(r => r.id_paciente) || [];
      const activeSinceByPaciente = new Map<number, string>();

      (relacionesActivas || []).forEach((rel: any) => {
        const relPacienteId = Number(rel.id_paciente);
        const activeSince = rel.updated_at || rel.fecha_asignacion || rel.created_at || null;
        if (activeSince) {
          activeSinceByPaciente.set(relPacienteId, activeSince);
        }
      });

      if (!pacienteIdsActivos.length) {
        setCitas([]);
        return;
      }

      const { data: nuevasCitas, error: errRefresh } = await supabase
        .from('citas')
        .select(`
          id_cita,
          fecha_hora,
          estado,
          id_paciente,
          pacientes!inner (nombre, apellido, foto_perfil),
          pagos!left (monto, estado)
        `)
        .eq('id_nutriologo', nutriologoId)
        .in('id_paciente', pacienteIdsActivos)
        .order('fecha_hora', { ascending: false });

      if (!errRefresh) {
        const formateadas = (nuevasCitas || [])
          .filter((c: any) => {
            const activeSince = activeSinceByPaciente.get(Number(c.id_paciente));
            if (!activeSince) return true;

            const citaUtc = DateTime.fromISO(c.fecha_hora, { zone: 'utc' });
            const activeSinceUtc = DateTime.fromISO(activeSince).toUTC();

            if (!citaUtc.isValid || !activeSinceUtc.isValid) return true;
            return citaUtc >= activeSinceUtc;
          })
          .map(c => {
          const sonoraDate = DateTime.fromISO(c.fecha_hora, { zone: 'utc' }).setZone(SONORA_TIMEZONE);
          const paciente: any = Array.isArray(c.pacientes) ? c.pacientes[0] : c.pacientes;

          let fotoUrl = paciente?.foto_perfil;
          if (fotoUrl && !fotoUrl.startsWith('http')) {
            fotoUrl = `${STORAGE_PUBLIC_URL}${fotoUrl}`;
          }

          return {
            id: c.id_cita,
            fecha: sonoraDate.toLocaleString(DateTime.DATE_MED),
            hora: sonoraDate.toLocaleString(DateTime.TIME_SIMPLE),
            fecha_hora: c.fecha_hora,
            estado: c.estado,
            pacienteNombre: `${paciente?.nombre || ''} ${paciente?.apellido || ''}`,
            foto_perfil: fotoUrl || null,
            pagada: c.pagos?.some(p => p.estado === 'completado') || false,
            monto: c.pagos?.[0]?.monto ?? tarifaConsulta
          };
        });
        setCitas(formateadas);
      }
    } catch (err: any) {
      toast.error('Error al agendar la cita: ' + (err.message || 'Intenta de nuevo'));
    }
  };

  const confirmarCita = async (cita: any) => {
    if (!cita.pagada) {
      toast.error('No puedes confirmar una cita con pago pendiente.');
      return;
    }

    if (cita.estado !== 'pendiente' && cita.estado !== 'pendiente_pagado') {
      toast.warning('Solo se pueden confirmar citas pendientes.');
      return;
    }

    const confirmed = window.confirm(
      `¿Estás seguro de confirmar la cita con ${cita.pacienteNombre} el ${cita.fecha} a las ${cita.hora}?`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('citas')
        .update({ estado: 'confirmada' })
        .eq('id_cita', cita.id);

      if (error) throw error;

      toast.success('Cita confirmada exitosamente');
      setCitas(prev => prev.map(c => c.id === cita.id ? { ...c, estado: 'confirmada' } : c));
    } catch (err: any) {
      toast.error('Error al confirmar la cita');
    }
  };

  const finalizarCita = async (cita: any) => {
    if (!cita.pagada) {
      toast.error('No puedes finalizar una cita con pago pendiente.');
      return;
    }

    if (cita.estado !== 'confirmada') {
      toast.warning('Solo se pueden finalizar citas confirmadas y atendidas.');
      return;
    }

    const confirmed = window.confirm(
      `¿Estás seguro de finalizar la cita con ${cita.pacienteNombre} del ${cita.fecha} a las ${cita.hora}?`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('citas')
        .update({ estado: 'completada' })
        .eq('id_cita', cita.id);

      if (error) throw error;

      toast.success('Cita marcada como completada');
      setCitas(prev => prev.map(c => c.id === cita.id ? { ...c, estado: 'completada' } : c));
    } catch (err: any) {
      toast.error('Error al finalizar la cita');
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'confirmada':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'completada':
        return 'bg-[#F0FFF4] text-[#2E8B57] border-[#D1E8D5]';
      case 'pendiente_pagado':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return <AnimatedLoadingScreen />;
  }

  return (
    <div className="min-h-screen p-6 md:p-10 font-sans bg-[#F8FFF9] space-y-10">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
          <div>
            <div className="inline-flex flex-col items-start">
              <h1 className="text-4xl font-[900] text-[#2E8B57] tracking-[4px] uppercase">
                Gestión de Citas
              </h1>
              <div className="w-16 h-1.5 bg-[#3CB371] rounded-full mt-2" />
            </div>
            <p className="text-[#3CB371] font-bold text-lg mt-4 uppercase tracking-[2px]">
              Administra tu agenda y consultas
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#2E8B57] hover:bg-[#1A3026] text-white font-black py-6 px-8 rounded-2xl shadow-lg transition-all uppercase tracking-widest text-sm flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Agendar Cita
                </Button>
              </DialogTrigger>
            <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-5xl max-h-[92vh] rounded-xl border-2 border-[#D1E8D5] bg-[#F4F8FB] p-0 font-sans overflow-y-auto">
              <DialogHeader className="px-3 py-2.5 border-b border-[#DDE9EE] bg-[#F1F6F9]">
                <DialogTitle className="text-3xl font-[900] text-[#1A3026] tracking-[0.5px]">
                  Agendar Nueva Cita
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-2.5 p-3">
                <div className="bg-white border border-[#DDE9EE] rounded-xl p-2.5 space-y-2">
                  <p className="text-sm font-[900] text-[#1A3026] uppercase">1. Seleccionar Paciente</p>

                  <Input
                    placeholder="Buscar por nombre o correo..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      handleSearch(e);
                    }}
                    onKeyDown={handleSearchKeyDown}
                    className="border border-[#CFE1D5] rounded-lg h-10 text-sm"
                  />

                  <Select value={selectedPaciente} onValueChange={setSelectedPaciente}>
                    <SelectTrigger className="border border-[#CFE1D5] rounded-lg h-10 text-sm">
                      <SelectValue placeholder="Selecciona o busca un paciente" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-60 overflow-y-auto">
                      {filteredPacientes.length === 0 && searchQuery ? (
                        <div className="p-4 text-center text-gray-500 text-xs">
                          No se encontraron pacientes
                        </div>
                      ) : (
                        filteredPacientes.map((p) => (
                          <SelectItem
                            key={p.id_paciente}
                            value={p.id_paciente.toString()}
                            className="font-semibold text-sm py-2.5"
                          >
                            {p.nombre} {p.apellido}
                            <span className="text-gray-500 ml-2">({p.correo})</span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>

                  {selectedPacienteInfo && (
                    <div className="flex items-center gap-3 rounded-lg border border-[#DDE9EE] bg-[#F8FCF9] p-3">
                      <Avatar className="h-11 w-11 border border-[#D1E8D5]">
                        <AvatarImage src={selectedPacienteInfo.foto_perfil || ''} alt={`${selectedPacienteInfo.nombre} ${selectedPacienteInfo.apellido}`} />
                        <AvatarFallback className="bg-[#E8F5EC] text-[#2E8B57] font-bold">
                          {`${selectedPacienteInfo.nombre?.[0] || ''}${selectedPacienteInfo.apellido?.[0] || ''}`.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-base font-bold text-[#1A3026] truncate">{selectedPacienteInfo.nombre} {selectedPacienteInfo.apellido}</p>
                        <p className="text-sm text-gray-500 truncate">{selectedPacienteInfo.correo}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-2.5 items-start">
                  <div className="bg-white border border-[#DDE9EE] rounded-xl p-2.5 space-y-2">
                    <p className="text-sm font-[900] text-[#1A3026] uppercase">2. Seleccionar Fecha</p>
                    <div className="rounded-lg border border-[#D1E8D5] bg-white p-1.5">
                      <DateCalendar
                        mode="single"
                        selected={fechaDateObject}
                        onSelect={(date) =>
                          setFecha(date ? DateTime.fromJSDate(date, { zone: SONORA_TIMEZONE }).toFormat('yyyy-LL-dd') : '')
                        }
                        locale={es}
                        fromDate={minDateObject}
                        toDate={maxDateObject}
                        fromYear={minYear}
                        toYear={maxYear}
                        captionLayout="buttons"
                        className="w-full"
                        classNames={{
                          months: 'w-full',
                          month: 'w-full flex flex-col gap-0',
                          table: 'w-full table-fixed border-collapse',
                          caption: 'flex items-center justify-between px-1.5 pb-1.5 pt-0.5',
                          caption_label: 'text-base font-[900] text-[#1A3026] uppercase tracking-[0.5px]',
                          nav_button: 'h-7 w-7 rounded-md border border-[#D1E8D5] bg-white text-[#1A3026] opacity-100 hover:bg-[#F8FFF9]',
                          head_row: 'w-full grid grid-cols-7 border border-[#7FAF8D] [&>*:nth-child(1)]:bg-[#2E8B57] [&>*:nth-child(2)]:bg-[#3A9A62] [&>*:nth-child(3)]:bg-[#46A66D] [&>*:nth-child(4)]:bg-[#2E8B57] [&>*:nth-child(5)]:bg-[#3A9A62] [&>*:nth-child(6)]:bg-[#46A66D] [&>*:nth-child(7)]:bg-[#2E8B57]',
                          head_cell: 'h-7 flex items-center justify-center text-[10px] font-black uppercase tracking-[0.5px] text-white border-r border-[#7FAF8D] last:border-r-0',
                          row: 'w-full grid grid-cols-7 mt-0',
                          cell: 'w-full h-10 border border-[#9AA0A6]/70 p-0 m-0 text-left align-top bg-white [&:has([aria-selected])]:bg-transparent',
                          day: 'h-full w-full p-1 justify-start items-start rounded-none text-sm leading-none font-light text-[#1A3026] hover:bg-[#F4F8F5]',
                          day_selected: 'bg-[#2E8B57] text-white hover:bg-[#1A3026] focus:bg-[#1A3026]',
                          day_today: 'bg-[#E8F5EC] text-[#1A3026] font-medium border-2 border-[#2E8B57]',
                          day_outside: 'text-gray-300 opacity-80',
                        }}
                      />
                    </div>
                    <input id="fecha" type="hidden" value={fecha} required readOnly />
                  </div>

                  <div className="bg-white border border-[#DDE9EE] rounded-xl p-2.5 space-y-2">
                    <p className="text-sm font-[900] text-[#1A3026] uppercase">3. Seleccionar Hora</p>

                    <div className="space-y-1.5">
                      <p className="text-sm font-bold text-[#1A3026]">Mañana</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {morningSlots.map((slot) => {
                          const isSelected = hora === slot;
                          const isBlocked = !fecha || occupiedHoursForSelectedDate.has(slot);

                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={isBlocked}
                              onClick={() => setHora(slot)}
                              className={`h-10 rounded-md border text-xs font-semibold transition-all ${
                                isSelected
                                  ? 'bg-[#2E8B57] border-[#2E8B57] text-white'
                                  : isBlocked
                                    ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-white border-[#CFE1D5] text-[#1A3026] hover:bg-[#F4F8F5]'
                              }`}
                              title={isBlocked ? 'Horario no disponible' : 'Seleccionar horario'}
                            >
                              <div className="flex items-center justify-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{slot}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-sm font-bold text-[#1A3026]">Tarde</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {afternoonSlots.map((slot) => {
                          const isSelected = hora === slot;
                          const isBlocked = !fecha || occupiedHoursForSelectedDate.has(slot);

                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={isBlocked}
                              onClick={() => setHora(slot)}
                              className={`h-10 rounded-md border text-xs font-semibold transition-all ${
                                isSelected
                                  ? 'bg-[#2E8B57] border-[#2E8B57] text-white'
                                  : isBlocked
                                    ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-white border-[#CFE1D5] text-[#1A3026] hover:bg-[#F4F8F5]'
                              }`}
                              title={isBlocked ? 'Horario no disponible' : 'Seleccionar horario'}
                            >
                              <div className="flex items-center justify-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{slot}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <input id="hora" type="hidden" value={hora} required readOnly />
                    <p className="text-xs font-semibold text-gray-500">
                      Horario laboral: 08:00 a 17:00 {fecha ? '• Horas ocupadas bloqueadas automáticamente' : '• Selecciona fecha para habilitar horarios'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setSearchQuery('');
                      setSelectedPaciente('');
                    }}
                    className="flex-1 border border-[#D1E8D5] text-gray-600 font-semibold text-sm rounded-lg h-10 hover:bg-gray-50"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1 bg-[#2E8B57] text-white font-semibold text-sm rounded-lg h-10 hover:bg-[#1A3026]">
                    Confirmar Cita
                  </Button>
                </div>
              </form>
            </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-[#D1E8D5] shadow-sm mb-8 max-w-md">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <Label className="text-base font-bold text-[#1A3026] block leading-none">
                Filtro de agenda
              </Label>
              <p className="text-sm font-medium text-gray-500 mt-1">Selecciona una fecha para ver citas</p>
            </div>
            <div className="h-9 w-9 rounded-xl border border-[#D1E8D5] bg-[#F8FFF9] flex items-center justify-center text-[#2E8B57]">
              <Calendar size={16} />
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setDraftSelectedDate(selectedDate);
              setIsDateModalOpen(true);
            }}
            className="w-full h-10 border border-[#D1E8D5] rounded-xl bg-white text-[#1A3026] font-semibold text-base justify-between px-3 hover:bg-[#F8FFF9]"
          >
            <span>Abrir calendario</span>
            <Calendar size={15} className="text-[#2E8B57]" />
          </Button>

          <div className="mt-3 rounded-xl border border-[#D1E8D5] bg-[#F8FFF9] px-3 py-2">
            <p className="text-xs font-semibold text-gray-500 mb-0.5">Fecha activa</p>
            <p className="text-sm font-semibold text-[#1A3026] capitalize">
              {selectedDate
                ? DateTime.fromISO(selectedDate).setLocale('es').toFormat("dd 'de' LLLL yyyy")
                : 'Mostrando todas las fechas'}
            </p>
          </div>

          <Dialog open={isDateModalOpen} onOpenChange={setIsDateModalOpen}>
            <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[1600px] max-h-[92vh] rounded-md border border-[#D1E8D5] p-0 overflow-y-auto h-auto">
              <DialogHeader className="px-4 py-3 border-b border-[#F0FFF4] bg-white">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-[#F8FFF9] border border-[#D1E8D5] flex items-center justify-center text-[#2E8B57]">
                    <Calendar size={14} />
                  </div>
                  <div>
                    <DialogTitle className="text-[#1A3026] text-lg font-bold leading-tight">
                      Seleccionar fecha
                    </DialogTitle>
                    <p className="text-sm font-medium text-gray-500 mt-0.5">
                      Filtra tus citas por un día específico
                    </p>
                  </div>
                </div>
              </DialogHeader>

              <div className="px-4 py-3 space-y-3">
                <div className="grid grid-cols-3 gap-2 rounded-lg border border-[#D1E8D5] bg-[#F8FFF9] p-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDraftSelectedDate(todayIso)}
                    className="border border-[#D1E8D5] rounded-md h-9 text-sm font-semibold bg-white"
                  >
                    Hoy
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDraftSelectedDate(DateTime.fromISO(todayIso).plus({ days: 1 }).toFormat('yyyy-LL-dd'))}
                    className="border border-[#D1E8D5] rounded-md h-9 text-sm font-semibold bg-white"
                  >
                    Mañana
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDraftSelectedDate(DateTime.fromISO(todayIso).plus({ days: 7 }).toFormat('yyyy-LL-dd'))}
                    className="border border-[#D1E8D5] rounded-md h-9 text-sm font-semibold bg-white"
                  >
                    +7 días
                  </Button>
                </div>

                <div className="rounded-lg border border-[#D1E8D5] bg-white p-2">
                  <DateCalendar
                    mode="single"
                    selected={draftDateObject}
                    onSelect={(date) => {
                      if (date) {
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const isoDate = `${year}-${month}-${day}`;
                        setDraftSelectedDate(isoDate);
                      } else {
                        setDraftSelectedDate('');
                      }
                    }}
                    locale={es}
                    fromDate={minDateObject}
                    toDate={maxDateObject}
                    fromYear={minYear}
                    toYear={maxYear}
                    captionLayout="buttons"
                    className="w-full"
                    classNames={{
                      months: 'w-full',
                      month: 'w-full flex flex-col gap-0',
                      table: 'w-full table-fixed border-collapse',
                      caption: 'flex items-center justify-between px-2 pb-2 pt-1',
                      caption_label: 'text-2xl font-[900] text-[#1A3026] uppercase tracking-[1px]',
                      nav_button: 'h-8 w-8 rounded-md border border-[#D1E8D5] bg-white text-[#1A3026] opacity-100 hover:bg-[#F8FFF9]',
                      head_row: 'w-full grid grid-cols-7 border border-[#7FAF8D] [&>*:nth-child(1)]:bg-[#2E8B57] [&>*:nth-child(2)]:bg-[#3A9A62] [&>*:nth-child(3)]:bg-[#46A66D] [&>*:nth-child(4)]:bg-[#2E8B57] [&>*:nth-child(5)]:bg-[#3A9A62] [&>*:nth-child(6)]:bg-[#46A66D] [&>*:nth-child(7)]:bg-[#2E8B57]',
                      head_cell: 'h-9 flex items-center justify-center text-xs font-black uppercase tracking-[0.5px] text-white border-r border-[#7FAF8D] last:border-r-0',
                      row: 'w-full grid grid-cols-7 mt-0',
                      cell: 'w-full h-16 border border-[#9AA0A6]/70 p-0 m-0 text-left align-top bg-white [&:has([aria-selected])]:bg-transparent',
                      day: 'h-full w-full p-1.5 justify-start items-start rounded-none text-xl leading-none font-light text-[#1A3026] hover:bg-[#F4F8F5]',
                      day_selected: 'bg-[#2E8B57] text-white hover:bg-[#1A3026] focus:bg-[#1A3026]',
                      day_today: 'bg-[#E8F5EC] text-[#1A3026] font-medium border-2 border-[#2E8B57]',
                      day_outside: 'text-gray-300 opacity-80',
                    }}
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDraftSelectedDate('')}
                  className="w-full border border-[#D1E8D5] rounded-lg h-9 text-sm font-semibold text-gray-600"
                >
                  Quitar filtro de fecha
                </Button>
              </div>

              <div className="px-4 pb-4 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDateModalOpen(false)}
                  className="flex-1 border border-[#D1E8D5] text-gray-600 font-semibold text-sm rounded-lg h-9"
                >
                  Cerrar
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setSelectedDate(draftSelectedDate);
                    setIsDateModalOpen(false);
                  }}
                  className="flex-1 bg-[#2E8B57] text-white font-semibold text-sm rounded-lg h-9 hover:bg-[#1A3026]"
                >
                  Aplicar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Citas Activas', val: citasPendientes.length, icon: Calendar, color: 'text-blue-500' },
            { label: 'Completadas', val: citasCompletadas.length, icon: CheckCircle, color: 'text-[#2E8B57]' },
            { label: 'Total del Mes', val: citas.length, icon: LayoutDashboard, color: 'text-purple-500' }
          ].map((stat, i) => (
            <div key={i} className="bg-white p-8 rounded-[2.5rem] border-2 border-[#D1E8D5] shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <p className="text-5xl font-[900] text-[#1A3026]">{stat.val}</p>
              </div>
              <div className={`p-4 rounded-2xl bg-[#F8FFF9] border border-[#D1E8D5] ${stat.color}`}>
                <stat.icon size={24} />
              </div>
            </div>
          ))}
        </div>
        <Card className="rounded-[2.5rem] border-2 border-[#D1E8D5] shadow-sm overflow-hidden bg-white">
          <CardHeader className="p-8 border-b border-[#F0FFF4] bg-[#F8FFF9]/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-[900] text-[#1A3026] uppercase tracking-[2px]">Próximas Citas</CardTitle>
              <Clock className="text-[#3CB371]" size={20} />
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {citasPendientes.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 mx-auto mb-4 text-[#D1E8D5]" />
                  <p className="text-base font-black text-gray-400 uppercase tracking-widest">No hay citas pendientes</p>
                </div>
              ) : (
                citasPendientes.map((cita) => (
                  <div key={cita.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 border-2 border-[#F0FFF4] rounded-[2rem] hover:border-[#2E8B57] transition-all bg-white group">
                    <div className="flex items-center gap-5">
                      <Avatar className="h-14 w-14 border-2 border-[#D1E8D5] group-hover:border-[#2E8B57] transition-colors">
                        <AvatarImage 
                          src={cita.foto_perfil || ''} 
                          alt={cita.pacienteNombre} 
                        />
                        <AvatarFallback className="bg-[#F0FFF4] text-[#2E8B57] font-black">
                          {cita.pacienteNombre.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-black text-[#1A3026] uppercase text-lg tracking-tight">
                          {cita.pacienteNombre}
                        </p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="flex items-center gap-1 text-sm font-bold text-gray-400 uppercase">
                            <Calendar className="h-3 w-3 text-[#3CB371]" /> {cita.fecha}
                          </span>
                          <span className="flex items-center gap-1 text-sm font-bold text-gray-400 uppercase">
                            <Clock className="h-3 w-3 text-[#3CB371]" /> {cita.hora}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 mt-4 md:mt-0">
                      <Badge className={`${getEstadoBadge(cita.estado)} border-2 px-3 py-1 rounded-xl font-black text-xs uppercase shadow-none`}>
                        {cita.estado}
                      </Badge>
                      <Badge className={`${cita.pagada ? 'bg-[#F0FFF4] text-[#2E8B57]' : 'bg-red-50 text-red-600'} border-2 px-3 py-1 rounded-xl font-black text-xs uppercase shadow-none`}>
                        {cita.pagada ? 'PAGADA' : 'PENDIENTE PAGO'}
                      </Badge>
                      {(cita.estado === 'pendiente' || cita.estado === 'pendiente_pagado') && (
                        <Button 
                          size="sm"
                          onClick={() => confirmarCita(cita)}
                          disabled={!cita.pagada}
                          className="bg-white border-2 border-[#2E8B57] text-[#2E8B57] hover:bg-[#2E8B57] hover:text-white font-black text-xs uppercase rounded-xl px-4 transition-all"
                          title={!cita.pagada ? 'No disponible: pago pendiente' : 'Confirmar cita'}
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          Confirmar
                        </Button>
                      )}
                      {cita.estado === 'confirmada' && (
                        <Button 
                          size="sm"
                          onClick={() => finalizarCita(cita)}
                          disabled={!cita.pagada}
                          className="bg-white border-2 border-[#2E8B57] text-[#2E8B57] hover:bg-[#2E8B57] hover:text-white font-black text-xs uppercase rounded-xl px-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-[#2E8B57]"
                          title={!cita.pagada ? 'No disponible: pago pendiente' : 'Finalizar cita atendida'}
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          Finalizar
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[2.5rem] border-2 border-[#D1E8D5] shadow-sm overflow-hidden bg-white">
          <CardHeader className="p-8 border-b border-[#F0FFF4] bg-[#F8FFF9]/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-[900] text-[#1A3026] uppercase tracking-[2px]">Historial de Consultas</CardTitle>
              <History className="text-[#3CB371]" size={20} />
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {citasCompletadas.map((cita) => (
                <div key={cita.id} className="flex items-center justify-between p-5 bg-[#F8FFF9] border border-[#D1E8D5] rounded-2xl">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10 border-2 border-[#D1E8D5]">
                      <AvatarImage 
                        src={cita.foto_perfil || ''} 
                        alt={cita.pacienteNombre} 
                      />
                      <AvatarFallback className="bg-[#F0FFF4] text-[#2E8B57] font-black">
                        {cita.pacienteNombre.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-black text-[#1A3026] uppercase text-sm">
                        {cita.pacienteNombre}
                      </p>
                      <p className="text-xs font-bold text-gray-400 uppercase">
                        {cita.fecha} • {cita.hora}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="border-2 border-[#D1E8D5] text-[#2E8B57] font-black text-xs uppercase px-2 py-0.5 rounded-lg mb-1">
                      COMPLETADA
                    </Badge>
                    <p className="text-base font-black text-[#1A3026] tracking-tight">${Number(cita.monto || 0).toLocaleString('en-US')}</p>
                  </div>
                </div>
              ))}
              {citasCompletadas.length === 0 && (
                <div className="col-span-2 text-center py-8 text-gray-500">
                  No hay consultas completadas aún
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}