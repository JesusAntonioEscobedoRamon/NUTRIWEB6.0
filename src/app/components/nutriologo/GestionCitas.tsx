import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Badge } from '@/app/components/ui/badge';
import { useAuth } from '@/app/context/useAuth';
import { supabase } from '@/app/context/supabaseClient';
import { Calendar, Clock, Plus, CheckCircle, History, LayoutDashboard, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';

const SONORA_TIMEZONE = 'America/Hermosillo';
const SONORA_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC-7 en milisegundos

// Componente de carga animado
function AnimatedLoadingScreen() {
  const iconRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Animación del icono (citas)
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState('');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const [citas, setCitas] = useState<any[]>([]);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [filteredPacientes, setFilteredPacientes] = useState<any[]>([]); // Para búsqueda
  const [searchQuery, setSearchQuery] = useState(''); // Texto de búsqueda
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.nutriologoId) {
      setLoading(false);
      toast.error('No se detectó ID de nutriólogo');
      return;
    }

    console.log('[GestionCitas] Nutriólogo ID (integer):', user.nutriologoId);
    console.log('[GestionCitas] Auth UUID:', user.id);

    const fetchData = async () => {
      setLoading(true);
      try {
        const nutriologoId = Number(user.nutriologoId);

        // 1. Pacientes asignados
        const { data: relaciones, error: errRel } = await supabase
          .from('paciente_nutriologo')
          .select('id_paciente')
          .eq('id_nutriologo', nutriologoId)
          .eq('activo', true);

        if (errRel) throw errRel;

        const pacienteIds = relaciones?.map(r => r.id_paciente) || [];

        if (pacienteIds.length === 0) {
          setPacientes([]);
          setFilteredPacientes([]);
          // Cargar citas aunque no haya pacientes
        } else {
          const { data: pacientesData, error: errPac } = await supabase
            .from('pacientes')
            .select('id_paciente, nombre, apellido, correo')
            .in('id_paciente', pacienteIds);

          if (errPac) throw errPac;
          setPacientes(pacientesData || []);
          setFilteredPacientes(pacientesData || []);
        }

        // 2. Citas
        const { data: citasData, error: errCitas } = await supabase
          .from('citas')
          .select(`
            id_cita,
            fecha_hora,
            estado,
            id_paciente,
            pacientes!inner (nombre, apellido),
            pagos!left (monto, estado)
          `)
          .eq('id_nutriologo', nutriologoId)
          .order('fecha_hora', { ascending: false });

        if (errCitas) throw errCitas;

        const citasFormateadas = citasData?.map(c => {
          const utcDate = new Date(c.fecha_hora);
          const sonoraDate = new Date(utcDate.getTime() - SONORA_OFFSET_MS);

          return {
            id: c.id_cita,
            fecha: new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(sonoraDate),
            hora: new Intl.DateTimeFormat('es-MX', { 
              hour: '2-digit', 
              minute: '2-digit', 
              hour12: true 
            }).format(sonoraDate),
            estado: c.estado,
            pacienteNombre: `${c.pacientes?.nombre || ''} ${c.pacientes?.apellido || ''}`,
            pagada: c.pagos?.some(p => p.estado === 'completado') || false,
            monto: c.pagos?.[0]?.monto || 800
          };
        }) || [];

        setCitas(citasFormateadas);
      } catch (err: any) {
        console.error('Error cargando datos:', err);
        toast.error('No se pudieron cargar las citas');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.nutriologoId]);

  const citasPendientes = citas.filter(c => c.estado === 'pendiente' || c.estado === 'confirmada');
  const citasCompletadas = citas.filter(c => c.estado === 'completada');

  // Búsqueda en tiempo real
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

  // Enter para autoseleccionar si solo queda 1 resultado
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
      const localSonora = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));

      const now = new Date();
      if (localSonora < now) {
        toast.error('No se puede agendar citas en fechas pasadas.');
        return;
      }

      const utcDate = new Date(localSonora.getTime() + SONORA_OFFSET_MS);
      const fechaHoraUTC = utcDate.toISOString();

      console.log('[DEBUG] Hora elegida Sonora:', localSonora.toLocaleString('es-MX', { timeZone: SONORA_TIMEZONE }));
      console.log('[DEBUG] Guardando como UTC:', fechaHoraUTC);

      const nutriologoId = Number(user.nutriologoId);

      const { error } = await supabase
        .from('citas')
        .insert({
          id_paciente: Number(selectedPaciente),
          id_nutriologo: nutriologoId,
          fecha_hora: fechaHoraUTC,
          estado: 'pendiente',
          duracion_minutos: 60,
          tipo_cita: 'presencial'
        });

      if (error) throw error;

      toast.success('Cita agendada exitosamente');

      setIsDialogOpen(false);
      setSelectedPaciente('');
      setFecha('');
      setHora('');
      setSearchQuery('');

      // Refrescar lista
      const { data: nuevasCitas, error: errRefresh } = await supabase
        .from('citas')
        .select(`
          id_cita,
          fecha_hora,
          estado,
          id_paciente,
          pacientes!inner (nombre, apellido),
          pagos!left (monto, estado)
        `)
        .eq('id_nutriologo', nutriologoId)
        .order('fecha_hora', { ascending: false });

      if (!errRefresh) {
        const formateadas = nuevasCitas?.map(c => {
          const utcDate = new Date(c.fecha_hora);
          const sonoraDate = new Date(utcDate.getTime() - SONORA_OFFSET_MS);

          return {
            id: c.id_cita,
            fecha: new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(sonoraDate),
            hora: new Intl.DateTimeFormat('es-MX', { 
              hour: '2-digit', 
              minute: '2-digit', 
              hour12: true 
            }).format(sonoraDate),
            estado: c.estado,
            pacienteNombre: `${c.pacientes?.nombre || ''} ${c.pacientes?.apellido || ''}`,
            pagada: c.pagos?.some(p => p.estado === 'completado') || false,
            monto: c.pagos?.[0]?.monto || 800
          };
        }) || [];
        setCitas(formateadas);
      }
    } catch (err: any) {
      console.error('Error al agendar cita:', err);
      toast.error('Error al agendar la cita: ' + (err.message || 'Intenta de nuevo'));
    }
  };

  const marcarComoConfirmada = async (citaId: number) => {
    try {
      const { error } = await supabase
        .from('citas')
        .update({ estado: 'confirmada' })
        .eq('id_cita', citaId);

      if (error) throw error;

      toast.success('Cita confirmada exitosamente');
      setCitas(prev => prev.map(c => c.id === citaId ? { ...c, estado: 'confirmada' } : c));
    } catch (err: any) {
      toast.error('Error al confirmar la cita');
      console.error(err);
    }
  };

  const marcarComoCompletada = async (citaId: number) => {
    try {
      const { error } = await supabase
        .from('citas')
        .update({ estado: 'completada' })
        .eq('id_cita', citaId);

      if (error) throw error;

      toast.success('Cita marcada como completada');
      setCitas(prev => prev.map(c => c.id === citaId ? { ...c, estado: 'completada' } : c));
    } catch (err: any) {
      toast.error('Error al actualizar la cita');
      console.error(err);
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'confirmada':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'completada':
        return 'bg-[#F0FFF4] text-[#2E8B57] border-[#D1E8D5]';
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'cancelada':
        return 'bg-red-100 text-red-700 border-red-200';
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
        
        {/* Encabezado Principal */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
          <div>
            <div className="inline-flex flex-col items-start">
              <h1 className="text-4xl font-[900] text-[#2E8B57] tracking-[4px] uppercase">
                Gestión de Citas
              </h1>
              <div className="w-16 h-1.5 bg-[#3CB371] rounded-full mt-2" />
            </div>
            <p className="text-[#3CB371] font-bold text-sm mt-4 uppercase tracking-[2px]">
              Administra tu agenda y consultas
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#2E8B57] hover:bg-[#1A3026] text-white font-black py-6 px-8 rounded-2xl shadow-lg transition-all uppercase tracking-widest text-xs flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Agendar Cita
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] border-2 border-[#D1E8D5] bg-white p-8 max-w-lg font-sans">
              <DialogHeader>
                <DialogTitle className="text-2xl font-[900] text-[#2E8B57] uppercase tracking-[2px]">
                  Nueva Consulta
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 mt-6">
                {/* Campo de búsqueda */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                    Buscar Paciente
                  </Label>
                  <Input
                    placeholder="Escribe nombre, apellido o correo..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      handleSearch(e); // Filtra en tiempo real
                    }}
                    onKeyDown={handleSearchKeyDown} // Enter para autoseleccionar
                    className="border-2 border-[#D1E8D5] rounded-xl h-12 font-bold focus:ring-[#2E8B57]"
                  />
                </div>

                {/* Select de paciente */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                    Paciente Seleccionado
                  </Label>
                  <Select value={selectedPaciente} onValueChange={setSelectedPaciente}>
                    <SelectTrigger className="border-2 border-[#D1E8D5] rounded-xl h-12">
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
                            className="font-bold text-xs uppercase py-3"
                          >
                            {p.nombre} {p.apellido} 
                            <span className="text-gray-500 ml-2">({p.correo})</span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-[9px] font-bold text-gray-400 uppercase leading-tight mt-1">
                    * Solo pacientes asignados a ti
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fecha" className="text-[10px] font-black uppercase text-gray-400 tracking-[1px] ml-1">Fecha</Label>
                    <Input
                      id="fecha"
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      required
                      className="border-2 border-[#D1E8D5] rounded-xl h-12 text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hora" className="text-[10px] font-black uppercase text-gray-400 tracking-[1px] ml-1">Hora</Label>
                    <Input
                      id="hora"
                      type="time"
                      value={hora}
                      onChange={(e) => setHora(e.target.value)}
                      required
                      className="border-2 border-[#D1E8D5] rounded-xl h-12 text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setSearchQuery('');
                      setSelectedPaciente('');
                    }}
                    className="flex-1 border-2 border-[#D1E8D5] text-gray-400 font-black text-[10px] uppercase rounded-xl h-12 hover:bg-gray-50"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1 bg-[#2E8B57] text-white font-black text-[10px] uppercase rounded-xl h-12 hover:bg-[#1A3026]">
                    Confirmar Cita
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Citas Activas', val: citasPendientes.length, icon: Calendar, color: 'text-blue-500' },
            { label: 'Completadas', val: citasCompletadas.length, icon: CheckCircle, color: 'text-[#2E8B57]' },
            { label: 'Total del Mes', val: citas.length, icon: LayoutDashboard, color: 'text-purple-500' }
          ].map((stat, i) => (
            <div key={i} className="bg-white p-8 rounded-[2.5rem] border-2 border-[#D1E8D5] shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <p className="text-4xl font-[900] text-[#1A3026]">{stat.val}</p>
              </div>
              <div className={`p-4 rounded-2xl bg-[#F8FFF9] border border-[#D1E8D5] ${stat.color}`}>
                <stat.icon size={24} />
              </div>
            </div>
          ))}
        </div>

        {/* Próximas citas */}
        <Card className="rounded-[2.5rem] border-2 border-[#D1E8D5] shadow-sm overflow-hidden bg-white">
          <CardHeader className="p-8 border-b border-[#F0FFF4] bg-[#F8FFF9]/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-[900] text-[#1A3026] uppercase tracking-[2px]">Próximas Citas</CardTitle>
              <Clock className="text-[#3CB371]" size={20} />
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {citasPendientes.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 mx-auto mb-4 text-[#D1E8D5]" />
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No hay citas pendientes</p>
                </div>
              ) : (
                citasPendientes.map((cita) => (
                  <div key={cita.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 border-2 border-[#F0FFF4] rounded-[2rem] hover:border-[#2E8B57] transition-all bg-white group">
                    <div className="flex items-center gap-5">
                      <div className="h-14 w-14 bg-[#F0FFF4] rounded-2xl flex items-center justify-center border border-[#D1E8D5] group-hover:bg-[#2E8B57] transition-colors">
                        <Calendar className="h-6 w-6 text-[#2E8B57] group-hover:text-white" />
                      </div>
                      <div>
                        <p className="font-black text-[#1A3026] uppercase text-sm tracking-tight">
                          {cita.pacienteNombre}
                        </p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase">
                            <Calendar className="h-3 w-3 text-[#3CB371]" /> {cita.fecha}
                          </span>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase">
                            <Clock className="h-3 w-3 text-[#3CB371]" /> {cita.hora}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 mt-4 md:mt-0">
                      <Badge className={`${getEstadoBadge(cita.estado)} border-2 px-3 py-1 rounded-xl font-black text-[9px] uppercase shadow-none`}>
                        {cita.estado}
                      </Badge>
                      <Badge className={`${cita.pagada ? 'bg-[#F0FFF4] text-[#2E8B57]' : 'bg-red-50 text-red-600'} border-2 px-3 py-1 rounded-xl font-black text-[9px] uppercase shadow-none`}>
                        {cita.pagada ? 'PAGADA' : 'PENDIENTE PAGO'}
                      </Badge>
                      {cita.estado === 'pendiente' && (
                        <Button 
                          size="sm"
                          onClick={() => marcarComoConfirmada(cita.id)}
                          className="bg-white border-2 border-[#2E8B57] text-[#2E8B57] hover:bg-[#2E8B57] hover:text-white font-black text-[9px] uppercase rounded-xl px-4 transition-all"
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          Confirmar
                        </Button>
                      )}
                      {cita.estado === 'confirmada' && (
                        <Button 
                          size="sm"
                          onClick={() => marcarComoCompletada(cita.id)}
                          className="bg-white border-2 border-[#2E8B57] text-[#2E8B57] hover:bg-[#2E8B57] hover:text-white font-black text-[9px] uppercase rounded-xl px-4 transition-all"
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

        {/* Historial de citas */}
        <Card className="rounded-[2.5rem] border-2 border-[#D1E8D5] shadow-sm overflow-hidden bg-white">
          <CardHeader className="p-8 border-b border-[#F0FFF4] bg-[#F8FFF9]/50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-[900] text-[#1A3026] uppercase tracking-[2px]">Historial de Consultas</CardTitle>
              <History className="text-[#3CB371]" size={20} />
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {citasCompletadas.map((cita) => (
                <div key={cita.id} className="flex items-center justify-between p-5 bg-[#F8FFF9] border border-[#D1E8D5] rounded-2xl">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center border border-[#D1E8D5]">
                      <CheckCircle size={18} className="text-[#2E8B57]" />
                    </div>
                    <div>
                      <p className="font-black text-[#1A3026] uppercase text-xs">
                        {cita.pacienteNombre}
                      </p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase">
                        {cita.fecha} • {cita.hora}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="border-2 border-[#D1E8D5] text-[#2E8B57] font-black text-[8px] uppercase px-2 py-0.5 rounded-lg mb-1">
                      COMPLETADA
                    </Badge>
                    <p className="text-xs font-black text-[#1A3026] tracking-tight">${cita.monto}</p>
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