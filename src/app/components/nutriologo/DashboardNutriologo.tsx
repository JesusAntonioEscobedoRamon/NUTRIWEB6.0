import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Users, Calendar, DollarSign, TrendingUp, CheckCircle2, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/app/context/useAuth';
import { supabase } from '@/app/context/supabaseClient';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';

const COLORS = ['#2E8B57', '#3CB371', '#D1E8D5'];

// Ajusta este base URL según tu bucket real en Supabase Storage
const STORAGE_PUBLIC_URL = 'https://hthnkzwjotwqhvjgqhfv.supabase.co/storage/v1/object/public/perfiles/';

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
            <LayoutDashboard size={80} strokeWidth={1.5} />
          </div>
        </div>
        
        <div 
          ref={textRef}
          className="text-[#2E8B57] font-bold text-2xl mb-6"
        >
          Cargando panel de control...
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

export function DashboardNutriologo() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const [dashboardData, setDashboardData] = useState({
    misPacientesCount: 0,
    citasActivas: 0,
    citasCompletadas: 0,
    citasTotales: 0,
    ingresosMes: 0,
    proximasCitas: [],
    citasPorEstado: [],
    ingresosPorMes: [],
  });

  useEffect(() => {
    if (!user?.id || user?.rol !== 'nutriologo') {
      setLoading(false);
      setErrorMsg('No se detectó sesión de nutriólogo válida. Inicia sesión nuevamente.');
      return;
    }

    console.log('[DashboardNutriologo] UUID del usuario logueado (auth):', user.id);
    console.log('[DashboardNutriologo] ID Nutriólogo (tabla):', user.nutriologoId);

    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Obtener id_nutriologo y tarifa
      const { data: nutriologo, error: errNut } = await supabase
        .from('nutriologos')
        .select('id_nutriologo, nombre, tarifa_consulta')
        .eq('id_auth_user', user.id)
        .single();

      if (errNut || !nutriologo) {
        console.error('[DashboardNutriologo] Error al buscar nutriólogo:', errNut);
        throw new Error('No se encontró tu perfil de nutriólogo');
      }

      const nutriologoId = nutriologo.id_nutriologo;
      const tarifa = nutriologo.tarifa_consulta || 0;

      // 2. Conteo de pacientes
      const { count: misPacientesCount, error: errPac } = await supabase
        .from('paciente_nutriologo')
        .select('count', { count: 'exact', head: true })
        .eq('id_nutriologo', nutriologoId)
        .eq('activo', true);

      if (errPac) throw errPac;

      // 3. Todas las citas (para conteos)
      const { data: citas, error: errCitas } = await supabase
        .from('citas')
        .select('id_cita, fecha_hora, estado')
        .eq('id_nutriologo', nutriologoId)
        .order('fecha_hora', { ascending: false });

      if (errCitas) throw errCitas;

      const citasActivas = citas.filter(c => ['confirmada', 'pendiente'].includes(c.estado)).length;
      const citasCompletadas = citas.filter(c => c.estado === 'completada').length;
      const citasTotales = citas.length;

      // 4. Ingresos mes actual
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 19);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString().slice(0, 19);

      const { data: pagosMesActual, error: errPagos } = await supabase
        .from('pagos')
        .select('monto')
        .eq('id_nutriologo', nutriologoId)
        .eq('estado', 'completado')
        .gte('fecha_pago', currentMonthStart)
        .lte('fecha_pago', currentMonthEnd);

      if (errPagos) throw errPagos;

      const ingresosMes = pagosMesActual?.reduce((sum, p) => sum + Number(p.monto || 0), 0) || 0;

      // 5. Ingresos por mes (últimos 6 meses)
      const ingresosPorMes = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mesStart = d.toISOString().slice(0, 19);
        const mesEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString().slice(0, 19);
        const nombreMes = d.toLocaleString('es-MX', { month: 'short' });
        const mesDisplay = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);

        const { data: pagosMes, error } = await supabase
          .from('pagos')
          .select('monto')
          .eq('id_nutriologo', nutriologoId)
          .eq('estado', 'completado')
          .gte('fecha_pago', mesStart)
          .lte('fecha_pago', mesEnd);

        const ingresos = pagosMes?.reduce((sum, p) => sum + Number(p.monto || 0), 0) || 0;
        ingresosPorMes.push({ mes: mesDisplay, ingresos });
      }

      // 6. Próximas citas SOLO de HOY, sin completadas, ordenadas por hora
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const { data: proximasCitasRaw, error: errProx } = await supabase
        .from('citas')
        .select(`
          id_cita,
          fecha_hora,
          estado,
          pacientes!inner (
            nombre,
            apellido,
            foto_perfil
          )
        `)
        .eq('id_nutriologo', nutriologoId)
        .in('estado', ['confirmada', 'pendiente'])  // Solo pendientes y confirmadas
        .gte('fecha_hora', todayStart.toISOString())  // Desde 00:00 hoy
        .lte('fecha_hora', todayEnd.toISOString())    // Hasta 23:59 hoy
        .order('fecha_hora', { ascending: true })     // Más cercana primero
        .limit(6);

      if (errProx) throw errProx;

      // Construir URLs públicas para fotos
      const proximasCitas = proximasCitasRaw.map(cita => {
        let fotoUrl = cita.pacientes?.foto_perfil;

        if (fotoUrl && !fotoUrl.startsWith('http')) {
          fotoUrl = `${STORAGE_PUBLIC_URL}${fotoUrl}`;
        }

        return {
          ...cita,
          monto: tarifa,
          foto_perfil: fotoUrl || null
        };
      });

      // 7. Citas por estado para gráfica
      const citasPorEstado = [
        { name: 'Confirmadas', value: citas.filter(c => c.estado === 'confirmada').length },
        { name: 'Completadas', value: citasCompletadas },
        { name: 'Pendientes', value: citas.filter(c => c.estado === 'pendiente').length }
      ];

      setDashboardData({
        misPacientesCount: misPacientesCount || 0,
        citasActivas,
        citasCompletadas,
        citasTotales,
        ingresosMes,
        proximasCitas,
        citasPorEstado,
        ingresosPorMes,
      });
    } catch (err: any) {
      console.error('Error cargando dashboard:', err);
      toast.error('No se pudieron cargar las estadísticas');
      setErrorMsg(err.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <AnimatedLoadingScreen />;

  if (errorMsg) {
    return (
      <div className="min-h-screen p-10 text-center text-red-600 flex flex-col items-center justify-center gap-4">
        <p className="text-xl font-bold">Error</p>
        <p>{errorMsg}</p>
        <button 
          onClick={fetchDashboardData}
          className="px-6 py-3 bg-[#2E8B57] text-white rounded-xl hover:bg-[#256e45]"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-10 font-sans bg-[#F8FFF9] space-y-10">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-2">
          <div>
            <div className="inline-flex flex-col items-start">
              <h1 className="text-4xl font-[900] text-[#2E8B57] tracking-[4px] uppercase">
                Panel de Control
              </h1>
              <div className="w-16 h-1.5 bg-[#3CB371] rounded-full mt-2" />
            </div>
            <p className="text-[#3CB371] font-bold text-sm mt-4 uppercase tracking-[2px]">
              Bienvenido de nuevo, {user?.nombre || 'Nutriólogo'}
            </p>
          </div>
        </div>

        {/* Tarjetas estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: 'Mis Pacientes', val: dashboardData.misPacientesCount, desc: 'Pacientes activos', icon: Users, color: '#2E8B57' },
            { title: 'Citas Activas', val: dashboardData.citasActivas, desc: `${dashboardData.citasCompletadas} completadas`, icon: Calendar, color: '#3CB371' },
            { title: 'Ingresos Mes', val: `$${dashboardData.ingresosMes.toLocaleString()}`, desc: 'Mes actual', icon: DollarSign, color: '#2E8B57' },
            { title: 'Consultas Totales', val: dashboardData.citasTotales, desc: 'Histórico global', icon: TrendingUp, color: '#3CB371' }
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-[2rem] border-2 border-[#D1E8D5] shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-[2px] text-gray-500">{stat.title}</span>
                <stat.icon size={20} style={{ color: stat.color }} />
              </div>
              <div className="text-3xl font-black text-[#1A3026] tracking-tight">{stat.val}</div>
              <p className="text-[10px] font-bold text-[#3CB371] uppercase mt-1 tracking-wider">{stat.desc}</p>
            </div>
          ))}
        </div>

        {/* Gráficas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-[#D1E8D5] shadow-sm">
            <h3 className="text-lg font-black text-[#1A3026] uppercase tracking-[2px] mb-6 flex items-center gap-2">
              <TrendingUp size={18} className="text-[#2E8B57]" /> Ingresos por Mes
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.ingresosPorMes}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0FFF4" />
                  <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fill: '#1A3026', fontWeight: 'bold', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#1A3026', fontWeight: 'bold', fontSize: 12}} />
                  <Tooltip cursor={{fill: '#F0FFF4'}} contentStyle={{borderRadius: '15px', border: '2px solid #D1E8D5'}} />
                  <Bar dataKey="ingresos" fill="#2E8B57" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-[#D1E8D5] shadow-sm">
            <h3 className="text-lg font-black text-[#1A3026] uppercase tracking-[2px] mb-6 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-[#2E8B57]" /> Estado de Citas
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardData.citasPorEstado}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {dashboardData.citasPorEstado.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius: '15px', border: '2px solid #D1E8D5'}} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                {dashboardData.citasPorEstado.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i]}} />
                    <span className="text-[9px] font-black uppercase text-gray-500">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Próximas citas con AVATAR - SIN CAMBIOS EN DISEÑO */}
        <div className="bg-white p-8 rounded-[2.5rem] border-2 border-[#D1E8D5] shadow-sm">
          <h3 className="text-lg font-black text-[#1A3026] uppercase tracking-[3px] mb-8">Próximas Citas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dashboardData.proximasCitas.map((cita) => {
              const paciente = cita.pacientes;
              const iniciales = `${paciente?.nombre?.charAt(0) || ''}${paciente?.apellido?.charAt(0) || ''}`.toUpperCase() || '?';

              return (
                <div 
                  key={cita.id_cita} 
                  className="flex items-center justify-between p-5 bg-white border-2 border-[#F0FFF4] hover:border-[#D1E8D5] rounded-3xl transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-14 w-14 border-2 border-[#D1E8D5] group-hover:border-[#2E8B57] transition-colors">
                      <AvatarImage 
                        src={cita.foto_perfil || ''} 
                        alt={`${paciente?.nombre || ''} ${paciente?.apellido || ''}`} 
                      />
                      <AvatarFallback className="bg-[#F0FFF4] text-[#2E8B57] font-black">
                        {iniciales}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-black text-[#1A3026] uppercase text-sm tracking-tight">
                        {paciente?.nombre || 'Paciente'} {paciente?.apellido || ''}
                      </p>
                      <p className="text-[11px] font-bold text-[#3CB371] uppercase tracking-tighter">
                        {new Date(cita.fecha_hora).toLocaleDateString('es-MX')} • {new Date(cita.fecha_hora).toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-[#2E8B57] text-lg">
                      ${cita.monto.toLocaleString()}.00
                    </p>
                    <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${cita.estado === 'completada' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'}`}>
                      {cita.estado}
                    </span>
                  </div>
                </div>
              );
            })}
            {dashboardData.proximasCitas.length === 0 && (
              <div className="col-span-2 text-center text-gray-500 py-8">
                No hay citas próximas programadas
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}