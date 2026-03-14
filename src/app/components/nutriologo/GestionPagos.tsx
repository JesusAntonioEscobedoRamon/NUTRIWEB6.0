import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Badge } from '@/app/components/ui/badge';
import { Input } from '@/app/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Calendar as DateCalendar } from '@/app/components/ui/calendar';
import { useAuth } from '@/app/context/useAuth';
import { supabase } from '@/app/context/supabaseClient';
import { DollarSign, Download, TrendingUp, CreditCard, CheckCircle, Clock, Wallet, Search, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { DateTime } from 'luxon';
import { dbgGroup, dbgGroupEnd, dbgLog, dbgOk, dbgError } from '@/utils/debug';

const STORAGE_PUBLIC_URL = 'https://hthnkzwjotwqhvjgqhfv.supabase.co/storage/v1/object/public/perfiles/';
const SONORA_TIMEZONE = 'America/Phoenix';

const isoDateToLocalDate = (isoDate: string): Date => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const getPaymentDateRaw = (row: any, fallbackByCitaId?: Map<number, string>): string | null => {
  const candidates = [
    row?.pago_created_at,
    row?.pago_fecha_hora,
    row?.pago_fecha_pago,
    row?.fecha_pago,
    row?.pago_fecha,
    row?.pago_updated_at,
    fallbackByCitaId?.get(Number(row?.id_cita)),
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return null;
};

const parseToSonoraDateTime = (rawDate: string | null): DateTime | null => {
  if (!rawDate) return null;

  let parsed = DateTime.fromISO(rawDate, { zone: 'utc' });
  if (!parsed.isValid) {
    parsed = DateTime.fromISO(rawDate);
  }

  if (!parsed.isValid) return null;
  return parsed.setZone(SONORA_TIMEZONE);
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
            <Wallet size={80} strokeWidth={1.5} />
          </div>
        </div>
        
        <div 
          ref={textRef}
          className="text-[#2E8B57] font-bold text-2xl mb-6"
        >
          Cargando información financiera...
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

export function GestionPagos() {
  const { user } = useAuth();
  const [citas, setCitas] = useState<any[]>([]);
  const [filteredCitas, setFilteredCitas] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [ingresosTotales, setIngresosTotales] = useState(0);
  const [pendientesCobro, setPendientesCobro] = useState(0);
  const [citasEsteMes, setCitasEsteMes] = useState(0);
  const [tarifaConsulta, setTarifaConsulta] = useState(0);
  const [selectedDate, setSelectedDate] = useState(''); // Sin filtro de fecha al iniciar
  const [draftSelectedDate, setDraftSelectedDate] = useState('');
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  const draftDateObject = draftSelectedDate ? isoDateToLocalDate(draftSelectedDate) : undefined;
  const todayDateObject = DateTime.now().setZone(SONORA_TIMEZONE).endOf('day').toJSDate();

  useEffect(() => {
    if (!user?.nutriologoId) {
      setLoading(false);
      toast.error('No se detectó ID de nutriólogo');
      return;
    }

    const fetchPagos = async () => {
      dbgGroup('screen', `GestionPagos — nutriologoId=${user.nutriologoId}`);
      setLoading(true);

      const timeoutId = setTimeout(() => {
        dbgError('GestionPagos: timeout 15s — desbloqueo forzado');
        console.error('[NutriU] GestionPagos: timeout esperando datos de Supabase.');
        setLoading(false);
      }, 15000);

      try {
        const nutriologoId = Number(user.nutriologoId);
        dbgLog('Cargando datos de pagos...');
        const { data: nutriologoData, error: errNutriologo } = await supabase
          .from('nutriologos')
          .select('tarifa_consulta')
          .eq('id_nutriologo', nutriologoId)
          .single();

        if (errNutriologo) throw errNutriologo;

        const tarifa = Number(nutriologoData?.tarifa_consulta || 0);
        setTarifaConsulta(tarifa);

        const { data: relacionesActivas, error: errRelacionesActivas } = await supabase
          .from('paciente_nutriologo')
          .select('*')
          .eq('id_nutriologo', nutriologoId)
          .eq('activo', true);

        if (errRelacionesActivas) throw errRelacionesActivas;

        const pacienteIdsActivos = (relacionesActivas || []).map((rel: any) => rel.id_paciente);

        if (!pacienteIdsActivos.length) {
          setCitas([]);
          setFilteredCitas([]);
          setIngresosTotales(0);
          setPendientesCobro(0);
          setCitasEsteMes(0);
          return;
        }

        const { data: pacientesActivos, error: errPacientesActivos } = await supabase
          .from('pacientes')
          .select('id_paciente, correo, foto_perfil')
          .in('id_paciente', pacienteIdsActivos);

        if (errPacientesActivos) throw errPacientesActivos;

        const activePatientsByEmail = new Map<string, any>();
        const activeSinceByPacienteId = new Map<number, string>();

        (relacionesActivas || []).forEach((rel: any) => {
          const relPacienteId = Number(rel.id_paciente);
          const activeSince = rel.updated_at || rel.fecha_asignacion || rel.created_at || null;
          if (activeSince) {
            activeSinceByPacienteId.set(relPacienteId, activeSince);
          }
        });

        (pacientesActivos || []).forEach((paciente: any) => {
          const correo = (paciente.correo || '').toLowerCase();
          if (!correo) return;

          activePatientsByEmail.set(correo, {
            ...paciente,
            activeSince: activeSinceByPacienteId.get(Number(paciente.id_paciente)) || null
          });
        });

        const { data: citasData, error: errCitas } = await supabase
          .rpc('get_pagados_nutriologo', { p_nutriologo_id: nutriologoId });

        if (errCitas) throw errCitas;
        const citaIds = (citasData || [])
          .map((c: any) => Number(c.id_cita))
          .filter((id: number) => Number.isFinite(id));

        const paymentDateByCitaId = new Map<number, string>();
        if (citaIds.length > 0) {
          const { data: pagosData, error: errPagosData } = await supabase
            .from('pagos')
            .select('id_cita, fecha_pago, estado')
            .in('id_cita', citaIds)
            .order('fecha_pago', { ascending: false });

          if (errPagosData) {
          } else {
            (pagosData || []).forEach((pago: any) => {
              const idCita = Number(pago.id_cita);
              if (!Number.isFinite(idCita)) return;

              const rawDate = typeof pago.fecha_pago === 'string' ? pago.fecha_pago : null;
              if (!rawDate) return;
              if (pago.estado === 'completado') {
                paymentDateByCitaId.set(idCita, rawDate);
              } else if (!paymentDateByCitaId.has(idCita)) {
                paymentDateByCitaId.set(idCita, rawDate);
              }
            });
          }
        }

        const citasActivas = (citasData || []).filter((c: any) => {
          const correo = (c.paciente_correo || '').toLowerCase();
          if (!correo) return false;

          const pacienteActivo = activePatientsByEmail.get(correo);
          if (!pacienteActivo) return false;

          if (!pacienteActivo.activeSince) return true;

          const fechaCita = new Date(c.fecha_hora);
          const fechaRelacion = new Date(pacienteActivo.activeSince);

          if (Number.isNaN(fechaCita.getTime()) || Number.isNaN(fechaRelacion.getTime())) {
            return true;
          }

          return fechaCita >= fechaRelacion;
        });

        const citasFormateadas = citasActivas.map(c => {
          const correo = (c.paciente_correo || '').toLowerCase();
          const fotoRaw = c.paciente_foto_perfil || activePatientsByEmail.get(correo)?.foto_perfil || null;
          const pagoDateRaw = getPaymentDateRaw(c, paymentDateByCitaId);
          const pagoDateSonora = parseToSonoraDateTime(pagoDateRaw);
          const citaDateSonora = c.fecha_hora ? parseToSonoraDateTime(c.fecha_hora) : null;

          return {
            foto_perfil: fotoRaw ? (fotoRaw.startsWith('http') ? fotoRaw : `${STORAGE_PUBLIC_URL}${fotoRaw}`) : null,
            id: c.id_cita,
            fecha_hora_pago: pagoDateSonora?.toJSDate() || null,
            fecha: pagoDateSonora ? pagoDateSonora.toFormat('dd/LL/yyyy') : 'Sin pago',
            hora: pagoDateSonora ? pagoDateSonora.toFormat('hh:mm a') : '--:--',
            fecha_cita: citaDateSonora ? citaDateSonora.toFormat('dd/LL/yyyy') : 'Sin fecha',
            hora_cita: citaDateSonora ? citaDateSonora.toFormat('hh:mm a') : '--:--',
            estado: c.estado,
            paciente: {
              nombre: c.paciente_nombre || 'Sin nombre',
              apellido: c.paciente_apellido || '',
              email: c.paciente_correo || 'Sin email'
            },
            pagada: c.pago_estado === 'completado',
            monto: c.pago_estado === 'completado' ? Number(c.pago_monto || 0) : tarifa
          };
        });

        setCitas(citasFormateadas);
        setFilteredCitas(citasFormateadas);

        const ingresos = citasFormateadas.reduce((acc, c) => acc + (c.pagada ? c.monto : 0), 0);
        const pendientes = citasFormateadas.reduce((acc, c) => acc + (!c.pagada ? c.monto : 0), 0);

        const monthStart = DateTime.now().setZone(SONORA_TIMEZONE).startOf('month').toJSDate();
        const citasMes = citasFormateadas.filter(c => c.pagada && c.fecha_hora_pago && c.fecha_hora_pago >= monthStart).length;

        setIngresosTotales(ingresos);
        setPendientesCobro(pendientes);
        setCitasEsteMes(citasMes);
        dbgOk(`GestionPagos cargada: ${citasFormateadas.length} pagos`);

      } catch (err: any) {
        dbgError('GestionPagos fetchPagos error', err);
        console.error('[NutriU] GestionPagos error:', err?.message ?? err);
        toast.error('No se pudieron cargar los pagos');
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
        dbgGroupEnd();
      }
    };

    fetchPagos();
  }, [user?.nutriologoId]);
  const filterPagosByDate = (dateStr: string) => {
    if (!dateStr) return citas;
    const selectedDay = DateTime.fromISO(dateStr, { zone: SONORA_TIMEZONE }).startOf('day');
    const endOfDay = selectedDay.endOf('day');
    const startUTC = selectedDay.toUTC().toISO();
    const endUTC = endOfDay.toUTC().toISO();

    return citas.filter(c => {
      if (!c.fecha_hora_pago) return false;
      const pagoDate = new Date(c.fecha_hora_pago);
      return pagoDate >= new Date(startUTC) && pagoDate <= new Date(endUTC);
    });
  };
  useEffect(() => {
    let filtered = filterPagosByDate(selectedDate);

    if (!searchQuery.trim()) {
      setFilteredCitas(filtered);
      return;
    }

    const q = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(cita => {
      const nombreCompleto = `${cita.paciente.nombre} ${cita.paciente.apellido}`.toLowerCase();
      return nombreCompleto.includes(q) || cita.paciente.email?.toLowerCase().includes(q);
    });

    setFilteredCitas(filtered);
  }, [searchQuery, citas, selectedDate]);
  const descargarRecibo = (cita: any) => {
    if (!cita.pagada) {
      toast.error('No se puede descargar el recibo hasta que el pago esté completado.');
      return;
    }
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }); // ← VERTICAL (portrait)

    const verdePrincipal = [46, 139, 87];      // #2E8B57
    const verdeClaro = [240, 255, 244];        // #F0FFF4 (fondo)
    const verdeHeader = [232, 245, 233];       // #E8F5E9 (header suave)
    const grisOscuro = [26, 48, 38];           // #1A3026 (texto principal)
    const grisMedio = [75, 85, 99];            // #4B5563 (subtítulos)
    doc.setFillColor(...verdeClaro);
    doc.rect(0, 0, 210, 50, 'F');
    const logoWidth = 60;
    const logoHeight = 30;
    doc.addImage(
      '/assets/logo.png',
      'PNG',
      (210 - logoWidth) / 2,
      10,
      logoWidth,
      logoHeight
    );
    doc.setFontSize(24);
    doc.setTextColor(...verdePrincipal);
    doc.setFont('helvetica', 'bold');
    doc.text('RECIBO DE PAGO', 105, 55, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(...grisMedio);
    doc.text('NutriU - Nutrición Personalizada', 105, 62, { align: 'center' });
    doc.setFontSize(11);
    doc.setTextColor(...grisOscuro);
    doc.setFont('helvetica', 'normal');
    let y = 80;
    doc.setFont('helvetica', 'bold');
    doc.text('Nutriólogo:', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${user?.nombre || 'Jose C'} ${user?.apellido || ''}`, 60, y); y += 8;

    doc.setFont('helvetica', 'bold');
    doc.text('Correo:', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${user?.email || 'nutriologo.josec@email.com'}`, 60, y); y += 8;

    doc.setFont('helvetica', 'bold');
    doc.text('Teléfono:', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text('+52 (653) 536 7647', 60, y); y += 12;
    doc.setFont('helvetica', 'bold');
    doc.text('Paciente:', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${cita.paciente.nombre} ${cita.paciente.apellido}`, 60, y); y += 8;

    doc.setFont('helvetica', 'bold');
    doc.text('Email:', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${cita.paciente.email}`, 60, y); y += 12;
    doc.setFont('helvetica', 'bold');
    doc.text('Fecha de cita:', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${cita.fecha_cita || cita.fecha}`, 60, y); y += 8;

    doc.setFont('helvetica', 'bold');
    doc.text('Hora de cita:', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${cita.hora_cita || cita.hora}`, 60, y); y += 12;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...verdePrincipal);
    doc.text(`Monto total: $${cita.monto.toLocaleString('es-MX')}`, 20, y); y += 15;
    const finalY = doc.internal.pageSize.height - 40;
    doc.setFontSize(10);
    doc.setTextColor(...grisMedio);
    doc.text('© NutriU • +52 (653) 536 7647 • +52 (662) 146 4154', 105, finalY, { align: 'center' });
    doc.text('nutriologo.josec@email.com', 105, finalY + 7, { align: 'center' });
    doc.text('Av. Kino y Calle 7 #1/2 Col. Médica, San Luis Río Colorado, Sonora', 105, finalY + 14, { align: 'center' });
    doc.text('@nutlotbhm', 105, finalY + 21, { align: 'center' });

    const blob = doc.output('blob');
    const previewUrl = URL.createObjectURL(blob);
    const previewLink = document.createElement('a');
    previewLink.href = previewUrl;
    previewLink.target = '_blank';
    previewLink.rel = 'noopener';
    previewLink.click();
    setTimeout(() => URL.revokeObjectURL(previewUrl), 60 * 60 * 1000);

    toast.success('Vista previa del recibo abierta. Descárgalo desde el visor si lo deseas.');
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
              <h1 className="text-4xl md:text-5xl font-[900] text-[#2E8B57] tracking-[4px] uppercase">
                Control Financiero
              </h1>
              <div className="w-16 h-1.5 bg-[#3CB371] rounded-full mt-2" />
            </div>
            <p className="text-[#3CB371] font-bold text-base md:text-lg mt-4 uppercase tracking-[2px]">
              Ingresos y seguimiento de pagos
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="rounded-[2.5rem] border-2 border-[#D1E8D5] bg-white shadow-sm overflow-hidden">
            <CardContent className="p-8 flex items-center gap-6">
              <div className="h-16 w-16 bg-[#F0FFF4] rounded-2xl flex items-center justify-center border-2 border-[#D1E8D5]">
                <TrendingUp className="text-[#2E8B57]" size={28} />
              </div>
              <div>
                <p className="text-xs md:text-sm font-black text-gray-400 uppercase tracking-widest mb-1">Ingresos Totales</p>
                <p className="text-4xl font-[900] text-[#1A3026]">${ingresosTotales.toLocaleString('es-MX')}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-2 border-[#D1E8D5] bg-white shadow-sm overflow-hidden">
            <CardContent className="p-8 flex items-center gap-6">
              <div className="h-16 w-16 bg-orange-50 rounded-2xl flex items-center justify-center border-2 border-orange-100">
                <Clock className="text-orange-600" size={28} />
              </div>
              <div>
                <p className="text-xs md:text-sm font-black text-gray-400 uppercase tracking-widest mb-1">Pendiente de Cobro</p>
                <p className="text-4xl font-[900] text-[#1A3026]">${pendientesCobro.toLocaleString('es-MX')}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-2 border-[#D1E8D5] bg-[#1A3026] shadow-xl overflow-hidden md:col-span-2 lg:col-span-1">
            <CardContent className="p-8 flex items-center gap-6 text-white">
              <div className="h-16 w-16 bg-[#2E8B57] rounded-2xl flex items-center justify-center border-2 border-[#3CB371]">
                <DollarSign className="text-white" size={28} />
              </div>
              <div>
                <p className="text-xs md:text-sm font-black text-gray-300 uppercase tracking-widest mb-1">Citas este mes</p>
                <p className="text-4xl font-[900]">{citasEsteMes} Consultas</p>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#2E8B57]" />
            <Input
              placeholder="BUSCAR PACIENTE POR NOMBRE O EMAIL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 py-5 bg-white border-2 border-[#D1E8D5] rounded-2xl focus:border-[#2E8B57] outline-none text-xs md:text-sm font-black tracking-widest uppercase placeholder:text-gray-400 shadow-sm transition-all"
            />
          </div>
          <Dialog open={isDateModalOpen} onOpenChange={setIsDateModalOpen}>
            <DialogTrigger asChild>
              <Button
                className={`py-5 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${
                  selectedDate
                    ? 'bg-[#2E8B57] text-white border-2 border-[#2E8B57]'
                    : 'bg-white text-[#2E8B57] border-2 border-[#D1E8D5] hover:border-[#2E8B57]'
                }`}
              >
                <Calendar className="mr-2 h-5 w-5" />
                {selectedDate ? DateTime.fromISO(selectedDate).toFormat('dd/MM/yyyy') : 'Filtrar por fecha'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-[#2E8B57] font-black uppercase">Seleccionar Fecha</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4">
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
                    }
                  }}
                  disabled={(date) => date > todayDateObject}
                  className="rounded-2xl border-2 border-[#D1E8D5]"
                />
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedDate('');
                      setDraftSelectedDate('');
                      setIsDateModalOpen(false);
                    }}
                    className="rounded-xl border-2 border-[#D1E8D5] text-[#2E8B57] font-black"
                  >
                    Limpiar
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedDate(draftSelectedDate);
                      setIsDateModalOpen(false);
                    }}
                    className="bg-[#2E8B57] text-white rounded-xl font-black hover:bg-[#1A3026]"
                  >
                    Aplicar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="bg-white rounded-[2.5rem] border-2 border-[#D1E8D5] shadow-sm overflow-hidden">
          <div className="p-8 border-b border-[#F0FFF4] flex items-center justify-between bg-[#F8FFF9]/50">
            <h3 className="text-base md:text-lg font-[900] text-[#1A3026] uppercase tracking-[2px]">
              Historial de Transacciones ({filteredCitas.length})
            </h3>
            <CreditCard className="text-[#3CB371]" size={20} />
          </div>
          
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-none hover:bg-transparent px-4">
                  <TableHead className="pl-8 text-xs md:text-sm font-black uppercase text-gray-400 tracking-wider">Paciente</TableHead>
                  <TableHead className="text-xs md:text-sm font-black uppercase text-gray-400 tracking-wider">Fecha y Hora de Pago</TableHead>
                  <TableHead className="text-xs md:text-sm font-black uppercase text-gray-400 tracking-wider">Monto</TableHead>
                  <TableHead className="text-xs md:text-sm font-black uppercase text-gray-400 tracking-wider">Estado</TableHead>
                  <TableHead className="text-right pr-8 text-xs md:text-sm font-black uppercase text-gray-400 tracking-wider">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCitas.map((cita) => (
                  <TableRow key={cita.id} className="border-b border-[#F0FFF4] hover:bg-[#F8FFF9] transition-colors group">
                    <TableCell className="py-6 pl-8">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-[#D1E8D5]">
                          <AvatarImage
                            src={cita.foto_perfil || ''}
                            alt={`${cita.paciente.nombre} ${cita.paciente.apellido}`}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-[#F0FFF4] text-[#2E8B57] font-black text-xs uppercase">
                            {`${cita.paciente.nombre?.[0] || ''}${cita.paciente.apellido?.[0] || ''}`.trim() || 'NA'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-black text-[#1A3026] uppercase text-sm md:text-base tracking-tight">
                            {cita.paciente.nombre} {cita.paciente.apellido}
                          </p>
                          <p className="text-xs md:text-sm font-bold text-gray-400">{cita.paciente.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className={`font-bold text-sm md:text-base uppercase ${cita.pagada ? 'text-gray-600' : 'text-gray-400'}`}>
                      {cita.fecha} • {cita.hora}
                    </TableCell>
                    <TableCell className="font-[900] text-[#1A3026] text-base md:text-lg">${cita.monto.toLocaleString('es-MX')}</TableCell>
                    <TableCell>
                      <Badge className={`
                        ${cita.pagada ? 'bg-[#F0FFF4] text-[#2E8B57] border-[#D1E8D5]' : 'bg-orange-50 text-orange-600 border-orange-100'} 
                        border-2 px-3 py-1 rounded-xl font-black text-[10px] md:text-xs uppercase shadow-none
                      `}>
                        {cita.pagada ? 'Pagado' : 'Pendiente'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => descargarRecibo(cita)}
                        disabled={!cita.pagada}
                        className={`text-[#2E8B57] hover:bg-[#F0FFF4] hover:text-[#1A3026] rounded-xl group-hover:scale-110 transition-transform ${!cita.pagada ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={!cita.pagada ? 'Solo disponible para pagos completados' : 'Ver recibo (vista previa PDF)'}
                      >
                        <Download size={18} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCitas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-sm md:text-base text-gray-500">
                      No hay transacciones registradas {searchQuery && 'o que coincidan con la búsqueda'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}