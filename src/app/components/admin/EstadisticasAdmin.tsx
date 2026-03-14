import React, { useState, useEffect, useRef } from 'react';
import { DateTime } from 'luxon';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, LineChart, Line, AreaChart, Area, Cell, PieChart, Pie, Legend
} from 'recharts';
import { Users, Calendar, TrendingUp, DollarSign, Award, ArrowUpRight, BarChart3, Download, X, Plus, Minus } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { supabase } from '@/app/context/supabaseClient';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {ImageWithFallback} from '@/app/components/figma/ImageWithFallback';
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
            <BarChart3 size={80} strokeWidth={1.5} />
          </div>
        </div>
        
        <div 
          ref={textRef}
          className="text-[#2E8B57] font-bold text-3xl mb-6"
        >
          Cargando estadísticas...
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

export function EstadisticasAdmin() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [stats, setStats] = useState({
    totalPacientes: 0,
    totalNutriologos: 0,
    citasMes: 0,
    ingresosMes: 0,
  });

  const [visitasPorMes, setVisitasPorMes] = useState([]);
  const [ingresosPorMes, setIngresosPorMes] = useState([]);
  const [rendimientoNutriologos, setRendimientoNutriologos] = useState([]);
  const [ingresosPorNutriologo, setIngresosPorNutriologo] = useState([]);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [chartZoom, setChartZoom] = useState(1);
  const now = new Date();
  const currentYear = now.getFullYear();
  const [periodType, setPeriodType] = useState<'dia' | 'semana' | 'mes' | 'año'>('mes');
  const [selectedDate, setSelectedDate] = useState(now.toISOString().split('T')[0]);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const minYear = currentYear;
  const maxYear = currentYear + 10;
  const years = Array.from(
    { length: maxYear - minYear + 1 },
    (_, i) => minYear + i
  );
  const months = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' },
  ];

  useEffect(() => {
    fetchStatistics();
  }, [periodType, selectedDate, selectedYear, selectedMonth]);

  const fetchStatistics = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      let startDate: DateTime;
      let endDate: DateTime;
      let periodLabel: string;
      const SONORA_TIMEZONE = 'America/Phoenix'; // San Luis Río Colorado, Sonora

      if (periodType === 'dia') {
        startDate = DateTime.fromISO(selectedDate, { zone: SONORA_TIMEZONE }).startOf('day');
        endDate = DateTime.fromISO(selectedDate, { zone: SONORA_TIMEZONE }).endOf('day');
        periodLabel = `Día ${startDate.toLocaleString(DateTime.DATE_MED)}`;
      } else if (periodType === 'semana') {
        const dateTime = DateTime.fromISO(selectedDate, { zone: SONORA_TIMEZONE });
        startDate = dateTime.startOf('week');
        endDate = dateTime.endOf('week');
        periodLabel = `Semana del ${startDate.toLocaleString(DateTime.DATE_MED)} al ${endDate.toLocaleString(DateTime.DATE_MED)}`;
      } else if (periodType === 'mes') {
        const dateTime = DateTime.fromObject({ year: selectedYear, month: selectedMonth, day: 1 }, { zone: SONORA_TIMEZONE });
        startDate = dateTime.startOf('month');
        endDate = dateTime.endOf('month');
        periodLabel = `${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}`;
      } else {
        const dateTime = DateTime.fromObject({ year: selectedYear, month: 1, day: 1 }, { zone: SONORA_TIMEZONE });
        startDate = dateTime.startOf('year');
        endDate = dateTime.endOf('year');
        periodLabel = `Año ${selectedYear}`;
      }
      const startISO = startDate.toUTC().toISO()?.slice(0, 19) || '';
      const endISO = endDate.toUTC().toISO()?.slice(0, 19) || '';

      const yearStartISO = DateTime.fromObject(
        { year: selectedYear, month: 1, day: 1 },
        { zone: SONORA_TIMEZONE }
      ).startOf('year').toUTC().toISO()?.slice(0, 19) || '';
      const yearEndISO = DateTime.fromObject(
        { year: selectedYear, month: 12, day: 31 },
        { zone: SONORA_TIMEZONE }
      ).endOf('year').toUTC().toISO()?.slice(0, 19) || '';

      const [
        totalPacientesResult,
        nutriologosResult,
        citasPeriodoResult,
        pagosPeriodoResult,
        citasAnioResult,
        pagosAnioResult,
        relacionesActivasResult,
        citasTotalesResult,
        pagosTotalesResult,
      ] = await Promise.all([
        supabase
          .from('pacientes')
          .select('*', { count: 'exact', head: true })
          .eq('activo', true),
        supabase
          .from('nutriologos')
          .select('id_nutriologo, nombre, apellido, foto_perfil')
          .eq('activo', true),
        supabase
          .from('citas')
          .select('*', { count: 'exact', head: true })
          .gte('fecha_hora', startISO)
          .lte('fecha_hora', endISO),
        supabase
          .from('pagos')
          .select('monto')
          .eq('estado', 'completado')
          .gte('fecha_pago', startISO)
          .lte('fecha_pago', endISO),
        supabase
          .from('citas')
          .select('id_nutriologo, fecha_hora')
          .gte('fecha_hora', yearStartISO)
          .lte('fecha_hora', yearEndISO),
        supabase
          .from('pagos')
          .select('id_nutriologo, monto, fecha_pago')
          .eq('estado', 'completado')
          .gte('fecha_pago', yearStartISO)
          .lte('fecha_pago', yearEndISO),
        supabase
          .from('paciente_nutriologo')
          .select('id_nutriologo')
          .eq('activo', true),
        supabase
          .from('citas')
          .select('id_nutriologo'),
        supabase
          .from('pagos')
          .select('id_nutriologo, monto')
          .eq('estado', 'completado'),
      ]);

      const totalPacientes = totalPacientesResult.count || 0;
      const nutriologos = nutriologosResult.data || [];
      const totalNutriologos = nutriologos.length;
      const citasMes = citasPeriodoResult.count || 0;
      const pagosMesData = pagosPeriodoResult.data || [];
      const ingresosMes = pagosMesData.reduce((sum, p) => sum + Number(p.monto || 0), 0);

      const datosCombinadosMeses = months.map((month) => ({
        mes: month.label,
        visitas: 0,
        ingresos: 0,
      }));

      for (const cita of citasAnioResult.data || []) {
        const citaDate = DateTime.fromISO(cita.fecha_hora, { zone: 'utc' }).setZone(SONORA_TIMEZONE);
        if (citaDate.year === selectedYear) {
          datosCombinadosMeses[citaDate.month - 1].visitas += 1;
        }
      }

      for (const pago of pagosAnioResult.data || []) {
        if (!pago.fecha_pago) continue;
        const pagoDate = DateTime.fromISO(pago.fecha_pago, { zone: 'utc' }).setZone(SONORA_TIMEZONE);
        if (pagoDate.year === selectedYear) {
          datosCombinadosMeses[pagoDate.month - 1].ingresos += Number(pago.monto || 0);
        }
      }

      const pacientesPorNutriologo = new Map<number, number>();
      for (const relacion of relacionesActivasResult.data || []) {
        pacientesPorNutriologo.set(
          relacion.id_nutriologo,
          (pacientesPorNutriologo.get(relacion.id_nutriologo) || 0) + 1
        );
      }

      const citasPorNutriologo = new Map<number, number>();
      for (const cita of citasTotalesResult.data || []) {
        citasPorNutriologo.set(
          cita.id_nutriologo,
          (citasPorNutriologo.get(cita.id_nutriologo) || 0) + 1
        );
      }

      const ingresosPorNutriologoMap = new Map<number, number>();
      for (const pago of pagosTotalesResult.data || []) {
        ingresosPorNutriologoMap.set(
          pago.id_nutriologo,
          (ingresosPorNutriologoMap.get(pago.id_nutriologo) || 0) + Number(pago.monto || 0)
        );
      }

      const rendimiento = nutriologos.map((n) => ({
        id_nutriologo: n.id_nutriologo,
        nombre: n.nombre,
        apellido: n.apellido,
        foto_perfil: n.foto_perfil,
        pacientes: pacientesPorNutriologo.get(n.id_nutriologo) || 0,
        citas: citasPorNutriologo.get(n.id_nutriologo) || 0,
        ingresos: ingresosPorNutriologoMap.get(n.id_nutriologo) || 0,
      }));

      setStats({ totalPacientes, totalNutriologos, citasMes, ingresosMes });
      
      setVisitasPorMes(datosCombinadosMeses);
      setIngresosPorMes(datosCombinadosMeses.map(({ mes, ingresos }) => ({ mes, ingresos })));
      setRendimientoNutriologos(rendimiento);

      const ingresosPie = rendimiento
        .filter(n => n.ingresos > 0)
        .map((n, i) => ({
          name: `${n.nombre} ${n.apellido}`,
          value: n.ingresos,
          fill: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][i % 6]
        }));
      
      setIngresosPorNutriologo(ingresosPie);

    } catch (err: any) {
      setErrorMsg(err.message || 'Error desconocido');
      toast.error('No se pudieron cargar las estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const exportarReporte = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const verdePrincipal = [46, 139, 87];      // #2E8B57
    const verdeClaro = [240, 255, 244];        // #F0FFF4
    const verdeHeader = [232, 245, 233];       // #E8F5E9
    const grisOscuro = [26, 48, 38];           // #1A3026
    const grisMedio = [75, 85, 99];            // #4B5563
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
    doc.setFontSize(22);
    doc.setTextColor(...verdePrincipal);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE ADMINISTRATIVO', 105, 55, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(...grisMedio);
    doc.text('NutriU - Panel de Control', 105, 62, { align: 'center' });
    let y = 80;
    doc.setFontSize(12);
    doc.setTextColor(...grisOscuro);
    doc.setFont('helvetica', 'bold');
    doc.text('Período analizado:', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(
      periodType === 'dia' ? `Día ${DateTime.fromISO(selectedDate).toLocaleString(DateTime.DATE_MED)}` :
      periodType === 'semana' ? `Semana del ${DateTime.fromISO(selectedDate).startOf('week').toLocaleString(DateTime.DATE_MED)} al ${DateTime.fromISO(selectedDate).endOf('week').toLocaleString(DateTime.DATE_MED)}` :
      periodType === 'mes' ? `${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}` :
      `Año ${selectedYear}`,
      60, y
    );

    y += 15;
    doc.setFontSize(14);
    doc.setTextColor(...verdePrincipal);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen General', 20, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [['Métrica', 'Valor']],
      body: [
        ['Pacientes Totales', stats.totalPacientes],
        ['Nutriólogos Activos', stats.totalNutriologos],
        ['Citas del Período', stats.citasMes],
        ['Ingresos del Período', `$${stats.ingresosMes.toLocaleString('es-MX')}`],
      ],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 5, textColor: grisOscuro },
      headStyles: { fillColor: verdeHeader, textColor: grisOscuro, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: verdeClaro },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 100, halign: 'right' }
      },
      margin: { left: 20, right: 20 }
    });

    y = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setTextColor(...verdePrincipal);
    doc.setFont('helvetica', 'bold');
    doc.text('Rendimiento por Nutriólogo', 20, y);
    y += 8;

    const rendimientoTable = rendimientoNutriologos.map(n => [
      `${n.nombre} ${n.apellido}`,
      n.pacientes,
      n.citas,
      `$${n.ingresos.toLocaleString('es-MX')}`
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Nutriólogo', 'Pacientes', 'Citas Totales', 'Ingresos Totales']],
      body: rendimientoTable,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 4, textColor: grisOscuro },
      headStyles: { fillColor: verdeHeader, textColor: grisOscuro, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: verdeClaro },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 25, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 40, halign: 'right' }
      },
      margin: { left: 20, right: 20 }
    });
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

    toast.success('Vista previa del PDF abierta. Descárgalo desde el visor si lo deseas.');
  };
  const handleExpandChart = (chartName: string) => {
    setExpandedChart(chartName);
    setChartZoom(1);
  };

  const handleCloseChart = () => {
    setExpandedChart(null);
  };

  const formatCompactValue = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return `${value}`;
  };

  const buildTicks = (maxValue: number, step: number) => {
    const ticks = [];
    for (let i = 0; i <= maxValue; i += step) {
      ticks.push(i);
    }
    return ticks;
  };

  const getNiceNumber = (value: number, round: boolean) => {
    if (value <= 0) return 1;

    const exponent = Math.floor(Math.log10(value));
    const fraction = value / Math.pow(10, exponent);
    let niceFraction = 1;

    if (round) {
      if (fraction < 1.5) niceFraction = 1;
      else if (fraction < 3) niceFraction = 2;
      else if (fraction < 7) niceFraction = 5;
      else niceFraction = 10;
    } else {
      if (fraction <= 1) niceFraction = 1;
      else if (fraction <= 2) niceFraction = 2;
      else if (fraction <= 5) niceFraction = 5;
      else niceFraction = 10;
    }

    return niceFraction * Math.pow(10, exponent);
  };

  const getVisitsAxisConfig = (data: any[]) => {
    const maxVisits = Math.max(...data.map((item: any) => Number(item.visitas || 0)), 0);

    if (maxVisits <= 0) {
      return { max: 5, step: 1, ticks: [0, 1, 2, 3, 4, 5] };
    }

    const paddedMax = maxVisits * 1.2;
    const niceMax = getNiceNumber(paddedMax, false);
    const niceStep = getNiceNumber(niceMax / 5, true);

    return {
      max: niceMax,
      step: niceStep,
      ticks: buildTicks(niceMax, niceStep),
    };
  };

  const getIncomeAxisConfig = () => {
    const max = 100000;
    const step = 10000;
    return { max, step, ticks: buildTicks(max, step) };
  };

  if (loading) {
    return <AnimatedLoadingScreen />;
  }

  if (errorMsg) {
    return (
      <div className="p-10 text-center text-red-600 text-lg md:text-xl min-h-screen">
        Error: {errorMsg}
        <br />
        <button 
          onClick={fetchStatistics}
          className="mt-4 px-5 py-2.5 bg-[#2E8B57] text-white text-base md:text-lg rounded hover:bg-[#256e45]"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const expandedFlujoData = visitasPorMes;
  const expandedCorrelacionData = visitasPorMes;
  const expandedIngresosData = ingresosPorNutriologo;
  const visitsAxisConfig = getVisitsAxisConfig(visitasPorMes);
  const incomeAxisConfig = getIncomeAxisConfig();

  return (
    <div className="p-6 space-y-8 bg-gray-50/50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900">Panel de Control</h1>
          <p className="text-muted-foreground mt-1 text-xl">Análisis de rendimiento y métricas del consultorio.</p>
        </div>
        <div className="flex flex-col gap-3 bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold">
              <input 
                type="radio" 
                value="dia" 
                checked={periodType === 'dia'}
                onChange={(e) => setPeriodType(e.target.value as 'dia' | 'semana' | 'mes' | 'año')}
                className="cursor-pointer"
              />
              Día
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold">
              <input 
                type="radio" 
                value="semana" 
                checked={periodType === 'semana'}
                onChange={(e) => setPeriodType(e.target.value as 'dia' | 'semana' | 'mes' | 'año')}
                className="cursor-pointer"
              />
              Semana
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold">
              <input 
                type="radio" 
                value="mes" 
                checked={periodType === 'mes'}
                onChange={(e) => setPeriodType(e.target.value as 'dia' | 'semana' | 'mes' | 'año')}
                className="cursor-pointer"
              />
              Mes
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold">
              <input 
                type="radio" 
                value="año" 
                checked={periodType === 'año'}
                onChange={(e) => setPeriodType(e.target.value as 'dia' | 'semana' | 'mes' | 'año')}
                className="cursor-pointer"
              />
              Año
            </label>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-gray-500" />
            
            {(periodType === 'dia' || periodType === 'semana') && (
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-sm md:text-base"
              />
            )}

            {(periodType === 'mes') && (
              <>
                <Select 
                  value={`${selectedMonth}`} 
                  onValueChange={(val) => setSelectedMonth(Number(val))}
                >
                  <SelectTrigger className="w-[140px] border-none focus:ring-0 text-sm md:text-base">
                    <SelectValue placeholder="Mes" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map(m => (
                      <SelectItem key={m.value} value={m.value.toString()} className="text-sm md:text-base">
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select 
                  value={`${selectedYear}`} 
                  onValueChange={(val) => setSelectedYear(Number(val))}
                >
                  <SelectTrigger className="w-[120px] border-none focus:ring-0 text-sm md:text-base">
                    <SelectValue placeholder="Año" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(y => (
                      <SelectItem key={y} value={y.toString()} className="text-sm md:text-base">
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}

            {periodType === 'año' && (
              <Select 
                value={`${selectedYear}`} 
                onValueChange={(val) => setSelectedYear(Number(val))}
              >
                <SelectTrigger className="w-[120px] border-none focus:ring-0 text-sm md:text-base">
                  <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={y.toString()} className="text-sm md:text-base">
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Pacientes Totales', value: stats.totalPacientes, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { title: 'Nutriólogos', value: stats.totalNutriologos, icon: Award, color: 'text-blue-600', bg: 'bg-blue-50' },
          { title: `Citas del ${periodType === 'dia' ? 'Día' : periodType === 'semana' ? 'Semana' : periodType === 'mes' ? 'Mes' : 'Año'}`, value: stats.citasMes, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
          { title: `Ingresos ${periodType === 'dia' ? 'del Día' : periodType === 'semana' ? 'de la Semana' : periodType === 'mes' ? 'Mensuales' : 'Anuales'}`, value: `$${stats.ingresosMes.toLocaleString('es-MX')}`, icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((item, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow border-none shadow-sm ring-1 ring-gray-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 p-4">
              <CardTitle className="text-sm md:text-base font-semibold text-gray-500 uppercase tracking-wider">{item.title}</CardTitle>
              <div className={`p-2 rounded-md ${item.bg}`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl md:text-3xl font-bold tracking-tight">{item.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card 
          className="shadow-sm border-none ring-1 ring-gray-200 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleExpandChart('flujo-pacientes')}
        >
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl">Flujo de Pacientes</CardTitle>
            <CardDescription className="text-sm md:text-base">Volumen de visitas en los últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={visitasPorMes}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="mes"
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  minTickGap={0}
                  angle={-30}
                  textAnchor="end"
                  height={56}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  domain={[0, visitsAxisConfig.max]}
                  ticks={visitsAxisConfig.ticks}
                  allowDecimals={false}
                  tickFormatter={formatCompactValue}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickMargin={8}
                  width={56}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Line type="monotone" dataKey="visitas" stroke="#10b981" strokeWidth={3} dot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card 
          className="shadow-sm border-none ring-1 ring-gray-200 cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleExpandChart('correlacion')}
        >
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl">Correlación Citas vs Ingresos</CardTitle>
            <CardDescription className="text-sm md:text-base">Relación entre volumen de citas e ingresos mensuales</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={visitasPorMes}>
                <defs>
                  <linearGradient id="colorVisitas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="mes"
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  minTickGap={0}
                  angle={-30}
                  textAnchor="end"
                  height={56}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  yAxisId="left"
                  axisLine={false}
                  tickLine={false}
                  domain={[0, visitsAxisConfig.max]}
                  ticks={visitsAxisConfig.ticks}
                  allowDecimals={false}
                  tickFormatter={formatCompactValue}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickMargin={8}
                  width={56}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  domain={[10000, 100000]}
                  ticks={[10000, 20000, 30000, 40000, 50000, 60000, 70000, 80000, 90000, 100000]}
                  tickFormatter={formatCompactValue}
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  tickMargin={8}
                  width={56}
                />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend />
                <Area yAxisId="left" type="monotone" dataKey="visitas" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorVisitas)" />
                <Area yAxisId="right" type="monotone" dataKey="ingresos" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorIngresos)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <Card 
        className="shadow-sm border-none ring-1 ring-gray-200 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => handleExpandChart('ingresos-nutriologo')}
      >
        <CardHeader>
          <CardTitle className="text-xl md:text-2xl">Ingresos por Especialista</CardTitle>
          <CardDescription className="text-sm md:text-base">Distribución de ingresos entre el equipo de nutriólogos</CardDescription>
        </CardHeader>
        <CardContent className="h-[400px] pt-4">
          {ingresosPorNutriologo.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ingresosPorNutriologo}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  label={({ name, value }) => `${name}: $${(value || 0).toLocaleString('es-MX')}`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {ingresosPorNutriologo.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${(value || 0).toLocaleString('es-MX')}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              No hay datos de ingresos disponibles
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="shadow-sm border-none ring-1 ring-gray-200 overflow-hidden">
        <CardHeader className="bg-white border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl md:text-2xl">Rendimiento por Especialista</CardTitle>
              <CardDescription className="text-sm md:text-base">Métricas individuales de productividad y captación.</CardDescription>
            </div>
            <Button 
              onClick={exportarReporte}
              variant="outline"
              className="border-[#2E8B57] text-[#2E8B57] hover:bg-[#F0FFF4] text-sm md:text-base flex items-center gap-2"
            >
              <Download size={16} />
              Exportar reporte
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            {rendimientoNutriologos.map((nutriologo) => (
              <div key={nutriologo.id_nutriologo} className="p-4 hover:bg-gray-50/50 transition-colors flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-[#D1E8D5] flex-shrink-0 bg-[#F0FFF4]">
                      <ImageWithFallback
                        src={nutriologo.foto_perfil || 'usu.webp'}
                        alt={`${nutriologo.nombre} ${nutriologo.apellido}`}
                        className="w-full h-full object-cover"
                        fallbackSrc="usu.webp"
                      />
                    </div>
                    <div>
                      <h4 className="font-bold text-base md:text-lg text-gray-900">{nutriologo.nombre} {nutriologo.apellido}</h4>
                      <p className="text-sm text-muted-foreground">Nutrición Clínica</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 md:w-1/2">
                  <div className="text-center md:text-left">
                    <p className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-1">Pacientes</p>
                    <p className="text-xl font-bold text-emerald-600">{nutriologo.pacientes}</p>
                  </div>
                  <div className="text-center md:text-left">
                    <p className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-1">Citas</p>
                    <p className="text-xl font-bold text-blue-600">{nutriologo.citas}</p>
                  </div>
                  <div className="text-center md:text-left">
                    <p className="text-xs uppercase tracking-wider text-gray-400 font-bold mb-1">Ingresos</p>
                    <p className="text-xl font-bold text-amber-600">${nutriologo.ingresos.toLocaleString('es-MX')}</p>
                  </div>
                </div>
              </div>
            ))}

            {rendimientoNutriologos.length === 0 && (
              <div className="p-12 text-center text-base md:text-lg text-gray-500">
                No hay nutriólogos registrados aún
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      {expandedChart && (
        <div 
          className="fixed top-0 bottom-0 right-0 left-[320px] bg-gray-50/50 z-40 flex items-center justify-center p-6"
          onClick={handleCloseChart}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full h-full overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {expandedChart === 'flujo-pacientes' && 'Flujo de Pacientes'}
                  {expandedChart === 'correlacion' && 'Correlación Citas vs Ingresos'}
                  {expandedChart === 'ingresos-nutriologo' && 'Ingresos por Especialista'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">Haz zoom con la rueda del ratón o con los botones. Arrastra para mover.</p>
              </div>
              <button
                onClick={handleCloseChart}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-600" />
              </button>
            </div>

            <TransformWrapper
              minScale={0.5}
              maxScale={3}
              initialScale={1}
              wheel={{ step: 0.1 }}
              pinch={{ step: 5 }}
              panning={{ velocityDisabled: true }}
              onTransformed={(ref) => {
                setChartZoom(ref.state.scale);
              }}
            >
              {({ zoomIn, zoomOut, resetTransform, setTransform, instance }) => (
                <>
                  <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200 gap-4">
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={() => zoomOut(0.2)}
                        variant="outline"
                        size="sm"
                        className="border-[#2E8B57] text-[#2E8B57] hover:bg-[#F0FFF4]"
                      >
                        <Minus size={16} />
                      </Button>
                      <span className="text-sm font-bold text-gray-700 w-20 text-center">
                        {Math.round(chartZoom * 100)}%
                      </span>
                      <Button
                        onClick={() => zoomIn(0.2)}
                        variant="outline"
                        size="sm"
                        className="border-[#2E8B57] text-[#2E8B57] hover:bg-[#F0FFF4]"
                      >
                        <Plus size={16} />
                      </Button>
                      <Button
                        onClick={() => {
                          resetTransform();
                          setChartZoom(1);
                        }}
                        variant="outline"
                        size="sm"
                        className="border-gray-300 text-gray-600"
                      >
                        Reset
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 mr-2">Mover eje X:</span>
                      <Button
                        onClick={() => setTransform(instance.transformState.positionX - 40, instance.transformState.positionY, instance.transformState.scale, 150)}
                        variant="outline"
                        size="sm"
                        className="border-gray-300 px-2"
                      >
                        ←
                      </Button>
                      <Button
                        onClick={() => setTransform(instance.transformState.positionX + 40, instance.transformState.positionY, instance.transformState.scale, 150)}
                        variant="outline"
                        size="sm"
                        className="border-gray-300 px-2"
                      >
                        →
                      </Button>

                      <span className="text-xs text-gray-500 ml-4 mr-2">Mover eje Y:</span>
                      <Button
                        onClick={() => setTransform(instance.transformState.positionX, instance.transformState.positionY - 40, instance.transformState.scale, 150)}
                        variant="outline"
                        size="sm"
                        className="border-gray-300 px-2"
                      >
                        ↑
                      </Button>
                      <Button
                        onClick={() => setTransform(instance.transformState.positionX, instance.transformState.positionY + 40, instance.transformState.scale, 150)}
                        variant="outline"
                        size="sm"
                        className="border-gray-300 px-2"
                      >
                        ↓
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-auto p-6 bg-white">
                    <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
                {expandedChart === 'flujo-pacientes' && (
                  <div style={{ width: '100%', height: '68vh', minWidth: '900px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={expandedFlujoData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis
                          dataKey="mes"
                          axisLine={false}
                          tickLine={false}
                          interval={0}
                          minTickGap={0}
                          angle={-30}
                          textAnchor="end"
                          height={56}
                          tick={{ fill: '#94a3b8', fontSize: 12 }}
                          dy={10}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          domain={[0, visitsAxisConfig.max]}
                          ticks={visitsAxisConfig.ticks}
                          allowDecimals={false}
                          tickFormatter={formatCompactValue}
                          tickMargin={8}
                          width={56}
                          tick={{ fill: '#94a3b8', fontSize: 13 }}
                        />
                        <Tooltip 
                          formatter={(value) => Number(value || 0).toLocaleString('es-MX')}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Line type="monotone" dataKey="visitas" stroke="#10b981" strokeWidth={3} dot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {expandedChart === 'correlacion' && (
                  <div style={{ width: '100%', height: '68vh', minWidth: '900px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={expandedCorrelacionData}>
                        <defs>
                          <linearGradient id="colorVisitasExp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorIngresosExp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis
                          dataKey="mes"
                          axisLine={false}
                          tickLine={false}
                          interval={0}
                          minTickGap={0}
                          angle={-30}
                          textAnchor="end"
                          height={56}
                          tick={{ fill: '#94a3b8', fontSize: 12 }}
                          dy={10}
                        />
                        <YAxis
                          yAxisId="left"
                          axisLine={false}
                          tickLine={false}
                          domain={[0, visitsAxisConfig.max]}
                          ticks={visitsAxisConfig.ticks}
                          allowDecimals={false}
                          tickFormatter={formatCompactValue}
                          tickMargin={8}
                          width={56}
                          tick={{ fill: '#94a3b8', fontSize: 13 }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          axisLine={false}
                          tickLine={false}
                          domain={[10000, 100000]}
                          ticks={[10000, 20000, 30000, 40000, 50000, 60000, 70000, 80000, 90000, 100000]}
                          allowDecimals={false}
                          tickMargin={8}
                          width={56}
                          tickFormatter={formatCompactValue}
                          tick={{ fill: '#94a3b8', fontSize: 13 }}
                        />
                        <Tooltip
                          formatter={(value, name) => {
                            const numeric = Number(value || 0);
                            if (name === 'ingresos') return `$${numeric.toLocaleString('es-MX')}`;
                            return numeric.toLocaleString('es-MX');
                          }}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        />
                        <Legend />
                        <Area yAxisId="left" type="monotone" dataKey="visitas" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorVisitasExp)" />
                        <Area yAxisId="right" type="monotone" dataKey="ingresos" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorIngresosExp)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {expandedChart === 'ingresos-nutriologo' && (
                  <div style={{ width: '100%', height: '68vh', minWidth: '900px' }}>
                    {ingresosPorNutriologo.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={expandedIngresosData}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={({ name, value }) => `${name}: $${(value || 0).toLocaleString('es-MX')}`}
                            outerRadius={Math.max(180, Math.min(280, incomeAxisConfig.max / 800))}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {expandedIngresosData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => `$${(value || 0).toLocaleString('es-MX')}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        No hay datos de ingresos disponibles
                      </div>
                    )}
                  </div>
                )}
                    </TransformComponent>
                  </div>
                </>
              )}
            </TransformWrapper>
          </div>
        </div>
      )}
    </div>
  );
}