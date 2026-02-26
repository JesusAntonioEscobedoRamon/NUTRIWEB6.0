import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, LineChart, Line 
} from 'recharts';
import { Users, Calendar, TrendingUp, DollarSign, Award, ArrowUpRight, BarChart3, Download } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { supabase } from '@/app/context/supabaseClient';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {ImageWithFallback} from '@/app/components/figma/ImageWithFallback';

// Componente de carga animado (sin cambios)
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
          className="text-[#2E8B57] font-bold text-2xl mb-6"
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

  // Estado para el mes y año seleccionados
  const now = new Date();
  const currentYear = now.getFullYear(); // 2026 en tu caso
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-12

  // Rango de años: desde el actual hasta +10 años futuros (2026–2036)
  const minYear = currentYear;
  const maxYear = currentYear + 10;
  const years = Array.from(
    { length: maxYear - minYear + 1 },
    (_, i) => minYear + i
  );

  // Meses
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
  }, [selectedYear, selectedMonth]);

  const fetchStatistics = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      console.log(`[ESTADISTICAS] Cargando para mes ${selectedMonth}/${selectedYear}`);

      // Calcular rango de fechas del mes seleccionado
      const startDate = new Date(selectedYear, selectedMonth - 1, 1);
      const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59);

      const startISO = startDate.toISOString().slice(0, 19);
      const endISO = endDate.toISOString().slice(0, 19);

      // 1. Total pacientes activos (global)
      const { count: totalPacientes } = await supabase
        .from('pacientes')
        .select('*', { count: 'exact', head: true })
        .eq('activo', true);

      // 2. Total nutriólogos activos (global)
      const { count: totalNutriologos } = await supabase
        .from('nutriologos')
        .select('*', { count: 'exact', head: true })
        .eq('activo', true);

      // 3. Citas del mes seleccionado
      const { count: citasMes } = await supabase
        .from('citas')
        .select('*', { count: 'exact', head: true })
        .gte('fecha_hora', startISO)
        .lte('fecha_hora', endISO);

      // 4. Ingresos del mes seleccionado
      const { data: pagosMesData } = await supabase
        .from('pagos')
        .select('monto')
        .eq('estado', 'completado')
        .gte('fecha_pago', startISO)
        .lte('fecha_pago', endISO);

      const ingresosMes = pagosMesData?.reduce((sum, p) => sum + Number(p.monto || 0), 0) || 0;

      console.log(`[INGRESOS] Pagos del mes ${selectedMonth}/${selectedYear}:`, pagosMesData);
      console.log('[INGRESOS] Total calculado:', ingresosMes);

      // 5. Datos para gráficas (últimos 6 meses, independientemente del seleccionado)
      const visitasMensuales = [];
      const ingresosMensuales = [];
      const mesesLabels = [];

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mesStart = d.toISOString().slice(0, 19);
        const mesEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString().slice(0, 19);
        const nombreMes = d.toLocaleString('es-MX', { month: 'short' });
        const mesDisplay = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);

        const { count: visitas } = await supabase
          .from('citas')
          .select('*', { count: 'exact', head: true })
          .gte('fecha_hora', mesStart)
          .lte('fecha_hora', mesEnd);

        const { data: pagos } = await supabase
          .from('pagos')
          .select('monto')
          .eq('estado', 'completado')
          .gte('fecha_pago', mesStart)
          .lte('fecha_pago', mesEnd);

        const ingresos = pagos?.reduce((sum, p) => sum + Number(p.monto || 0), 0) || 0;

        mesesLabels.push(mesDisplay);
        visitasMensuales.push(visitas || 0);
        ingresosMensuales.push(ingresos);
      }

      // 6. Rendimiento por nutriólogo (global)
      const { data: nutriologos } = await supabase
        .from('nutriologos')
        .select('id_nutriologo, nombre, apellido, foto_perfil');

      const rendimiento = [];

      for (const n of nutriologos || []) {
        const { count: pacientes } = await supabase
          .from('paciente_nutriologo')
          .select('*', { count: 'exact', head: true })
          .eq('id_nutriologo', n.id_nutriologo)
          .eq('activo', true);

        const { count: citas } = await supabase
          .from('citas')
          .select('*', { count: 'exact', head: true })
          .eq('id_nutriologo', n.id_nutriologo);

        const { data: pagosNutri } = await supabase
          .from('pagos')
          .select('monto')
          .eq('id_nutriologo', n.id_nutriologo)
          .eq('estado', 'completado');

        const ingresos = pagosNutri?.reduce((sum, p) => sum + Number(p.monto || 0), 0) || 0;

        rendimiento.push({
          id_nutriologo: n.id_nutriologo,
          nombre: n.nombre,
          apellido: n.apellido,
          foto_perfil: n.foto_perfil,
          pacientes: pacientes || 0,
          citas: citas || 0,
          ingresos,
        });
      }

      // Actualizar estados
      setStats({ totalPacientes: totalPacientes || 0, totalNutriologos: totalNutriologos || 0, citasMes, ingresosMes });
      setVisitasPorMes(mesesLabels.map((mes, i) => ({ mes, visitas: visitasMensuales[i] })));
      setIngresosPorMes(mesesLabels.map((mes, i) => ({ mes, ingresos: ingresosMensuales[i] })));
      setRendimientoNutriologos(rendimiento);

    } catch (err: any) {
      console.error('[ESTADISTICAS] Error:', err);
      setErrorMsg(err.message || 'Error desconocido');
      toast.error('No se pudieron cargar las estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const exportarReporte = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(46, 139, 87);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setFontSize(22);
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE ADMINISTRATIVO', pageWidth / 2, 25, { align: 'center' });

    doc.setFontSize(14);
    doc.text('NutriU - Panel de Control', pageWidth / 2, 35, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Período: ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}`, 20, 55);

    doc.setFontSize(16);
    doc.text('Resumen General', 20, 70);
    autoTable(doc, {
      startY: 75,
      head: [['Métrica', 'Valor']],
      body: [
        ['Pacientes Totales', stats.totalPacientes],
        ['Nutriólogos Activos', stats.totalNutriologos],
        ['Citas del Mes', stats.citasMes],
        ['Ingresos Mensuales', `$${stats.ingresosMes.toLocaleString('es-MX')}`],
      ],
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 4 },
      headStyles: { fillColor: [46, 139, 87], textColor: [255] },
    });

    const finalY = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(16);
    doc.text('Rendimiento por Especialista', 20, finalY);

    const rendimientoTable = rendimientoNutriologos.map(n => [
      `${n.nombre} ${n.apellido}`,
      n.pacientes,
      n.citas,
      `$${n.ingresos.toLocaleString('es-MX')}`
    ]);

    autoTable(doc, {
      startY: finalY + 5,
      head: [['Nutriólogo', 'Pacientes', 'Citas', 'Ingresos']],
      body: rendimientoTable,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [46, 139, 87], textColor: [255] },
      alternateRowStyles: { fillColor: [245, 255, 245] }
    });

    doc.save(`Reporte_NutriU_${selectedMonth}-${selectedYear}.pdf`);
    toast.success('Reporte exportado como PDF');
  };

  if (loading) {
    return <AnimatedLoadingScreen />;
  }

  if (errorMsg) {
    return (
      <div className="p-10 text-center text-red-600 min-h-screen">
        Error: {errorMsg}
        <br />
        <button 
          onClick={fetchStatistics}
          className="mt-4 px-4 py-2 bg-[#2E8B57] text-white rounded hover:bg-[#256e45]"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-gray-50/50 min-h-screen">
      {/* Header con selector de mes/año */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Panel de Control</h1>
          <p className="text-muted-foreground mt-1 text-lg">Análisis de rendimiento y métricas del consultorio.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg shadow-sm border">
          <Calendar className="h-5 w-5 text-gray-500" />
          <Select 
            value={`${selectedMonth}`} 
            onValueChange={(val) => setSelectedMonth(Number(val))}
          >
            <SelectTrigger className="w-[140px] border-none focus:ring-0">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              {months.map(m => (
                <SelectItem key={m.value} value={m.value.toString()}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select 
            value={`${selectedYear}`} 
            onValueChange={(val) => setSelectedYear(Number(val))}
          >
            <SelectTrigger className="w-[120px] border-none focus:ring-0">
              <SelectValue placeholder="Año" />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Pacientes Totales', value: stats.totalPacientes, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50', desc: 'Usuarios registrados' },
          { title: 'Nutriólogos', value: stats.totalNutriologos, icon: Award, color: 'text-blue-600', bg: 'bg-blue-50', desc: 'Equipo activo' },
          { title: 'Citas del Mes', value: stats.citasMes, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50', desc: 'Mes seleccionado' },
          { title: 'Ingresos Mensuales', value: `$${stats.ingresosMes.toLocaleString('es-MX')}`, icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50', desc: 'Mes seleccionado' },
        ].map((item, i) => (
          <Card key={i} className="hover:shadow-md transition-shadow border-none shadow-sm outline outline-1 outline-gray-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{item.title}</CardTitle>
              <div className={`p-2 rounded-md ${item.bg}`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">{item.value}</div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                {item.desc}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-sm border-none ring-1 ring-gray-200">
          <CardHeader>
            <CardTitle>Flujo de Pacientes</CardTitle>
            <CardDescription>Volumen de visitas en los últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={visitasPorMes}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Line type="monotone" dataKey="visitas" stroke="#10b981" strokeWidth={3} dot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-none ring-1 ring-gray-200">
          <CardHeader>
            <CardTitle>Distribución de Ingresos</CardTitle>
            <CardDescription>Ingresos mensuales por consultorio (MXN)</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ingresosPorMes}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="ingresos" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Rendimiento por Especialista */}
      <Card className="shadow-sm border-none ring-1 ring-gray-200 overflow-hidden">
        <CardHeader className="bg-white border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Rendimiento por Especialista</CardTitle>
              <CardDescription>Métricas individuales de productividad y captación.</CardDescription>
            </div>
            <Button 
              onClick={exportarReporte}
              variant="outline"
              className="border-[#2E8B57] text-[#2E8B57] hover:bg-[#F0FFF4] flex items-center gap-2"
            >
              <Download size={16} />
              Exportar reporte
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            {rendimientoNutriologos.map((nutriologo) => (
              <div key={nutriologo.id_nutriologo} className="p-6 hover:bg-gray-50/50 transition-colors flex flex-col md:flex-row md:items-center gap-6">
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
                      <h4 className="font-bold text-gray-900">{nutriologo.nombre} {nutriologo.apellido}</h4>
                      <p className="text-sm text-muted-foreground">Nutrición Clínica</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-8 md:w-1/2">
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
              <div className="p-12 text-center text-gray-500">
                No hay nutriólogos registrados aún
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}