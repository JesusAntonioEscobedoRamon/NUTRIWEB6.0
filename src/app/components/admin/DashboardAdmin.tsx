import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Users, Calendar, TrendingUp, DollarSign, Activity, ArrowUpRight, LayoutDashboard } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell, PieChart, Pie, Legend } from 'recharts';
import { supabase } from '@/app/context/supabaseClient';
import { toast } from 'sonner';

const SUPABASE_URL = 'https://hthnkzwjotwqhvjgqhfv.supabase.co';
const STORAGE_BUCKET = 'perfiles';

function getProfileImageUrl(fotoPerfilPath: string): string {
  if (!fotoPerfilPath) return '';
  if (fotoPerfilPath.startsWith('http')) return fotoPerfilPath;
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${fotoPerfilPath}`;
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
            <LayoutDashboard size={80} strokeWidth={1.5} />
          </div>
        </div>
        
        <div 
          ref={textRef}
          className="text-[#2E8B57] font-bold text-2xl mb-6"
        >
          Cargando dashboard administrativo...
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

export function DashboardAdmin() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPacientes: 0,
    citasHoy: 0,
    citasMes: 0,
    ingresosMes: 0,
    actividadReciente: [],
  });

  const [citasPorDia, setCitasPorDia] = useState([]);
  const [estadosCitas, setEstadosCitas] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      const { count: totalPacientes, error: errPac } = await supabase
        .from('pacientes')
        .select('*', { count: 'exact', head: true })
        .eq('activo', true);

      if (errPac) throw new Error(`Error pacientes: ${errPac.message}`);
      const { data: citas, error: errCitas } = await supabase
        .from('citas')
        .select('fecha_hora, estado')
        .gte('fecha_hora', `${monthStart}T00:00:00`)
        .lte('fecha_hora', `${monthEnd}T23:59:59`);

      if (errCitas) throw new Error(`Error citas: ${errCitas.message}`);

      const citasHoyCount = citas.filter(c => c.fecha_hora.startsWith(today)).length;
      const citasMesCount = citas.length;
      const { data: pagos, error: errPagos } = await supabase
        .from('pagos')
        .select('monto, fecha_pago')
        .eq('estado', 'completado')
        .gte('fecha_pago', monthStart)
        .lte('fecha_pago', monthEnd);

      if (errPagos) throw new Error(`Error pagos: ${errPagos.message}`);

      const ingresosMesTotal = pagos.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
      const { data: actividad, error: errAct } = await supabase
        .from('citas')
        .select(`
          id_cita,
          fecha_hora,
          estado,
          id_paciente,
          pacientes (
            nombre, 
            apellido, 
            foto_perfil,
            paciente_nutriologo (
              nutriologos (
                nombre,
                apellido
              )
            )
          )
        `)
        .in('estado', ['confirmada', 'completada'])
        .order('fecha_hora', { ascending: false })
        .limit(5);

      if (errAct) throw new Error(`Error actividad: ${errAct.message}`);
      const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const citasPorDiaData = diasSemana.map((dia, idx) => ({
        dia,
        citas: citas.filter(c => new Date(c.fecha_hora).getDay() === idx).length,
      }));
      const estadosPendiente = citas.filter(c => c.estado === 'pendiente').length;
      const estadosConfirmada = citas.filter(c => c.estado === 'confirmada').length;
      const estadosCompletada = citas.filter(c => c.estado === 'completada').length;
      const estadosCancelada = citas.filter(c => c.estado === 'cancelada').length;

      const estadosData = [
        { name: 'Pendiente', value: estadosPendiente, fill: '#fbbf24' },
        { name: 'Confirmada', value: estadosConfirmada, fill: '#3b82f6' },
        { name: 'Completada', value: estadosCompletada, fill: '#10b981' },
        { name: 'Cancelada', value: estadosCancelada, fill: '#ef4444' }
      ];

      setStats({
        totalPacientes: totalPacientes || 0,
        citasHoy: citasHoyCount,
        citasMes: citasMesCount,
        ingresosMes: ingresosMesTotal,
        actividadReciente: actividad || [],
      });

      setCitasPorDia(citasPorDiaData);
      setEstadosCitas(estadosData);

    } catch (err: any) {
      toast.error('Error al cargar estadísticas: ' + (err.message || 'Intenta de nuevo'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <AnimatedLoadingScreen />;
  }

  return (
    <div className="min-h-screen p-4 md:p-10 font-sans bg-[#F8FFF9] space-y-10">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="px-2">
          <h1 className="text-4xl md:text-5xl font-[900] text-[#1A3026] tracking-[4px] uppercase leading-none">
            Dashboard <span className="text-[#2E8B57]">Admin</span>
          </h1>
          <p className="text-[#3CB371] font-bold text-base md:text-lg mt-4 uppercase tracking-[2px]">
            Vista general del consultorio NUTRI U
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard title="Citas Este Mes" value={stats.citasMes} sub={`+${stats.citasHoy} hoy`} icon={<Calendar size={20} />} color="bg-blue-50 text-blue-600" />
          <StatCard title="Tasa Asistencia" value="92%" sub="+5% vs anterior" icon={<TrendingUp size={20} />} color="bg-purple-50 text-purple-600" />
          <StatCard title="Actividad" value={Math.round((stats.citasHoy / Math.max(stats.citasMes, 1)) * 100) + '%'} sub="Citas hoy vs mes" icon={<Activity size={20} />} color="bg-pink-50 text-pink-600" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="rounded-[2.5rem] border-2 border-[#D1E8D5] overflow-hidden bg-white shadow-sm">
            <CardHeader className="bg-[#F8FFF9] border-b border-[#F0FFF4] p-8">
              <CardTitle className="text-sm md:text-base font-[900] text-[#1A3026] uppercase tracking-[2px] flex items-center gap-2">
                <Activity size={18} className="text-[#2E8B57]" /> Volumen de Citas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={citasPorDia}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0FFF4" />
                  <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 700 }} />
                  <YAxis hide />
                  <Tooltip cursor={{ fill: '#F8FFF9' }} contentStyle={{ borderRadius: '15px', border: '2px solid #D1E8D5', fontWeight: 'bold' }} />
                  <Bar dataKey="citas" radius={[10, 10, 10, 10]} barSize={35}>
                    {citasPorDia.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#2E8B57' : '#3CB371'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-2 border-[#D1E8D5] overflow-hidden bg-white shadow-sm">
            <CardHeader className="bg-[#F8FFF9] border-b border-[#F0FFF4] p-8">
              <CardTitle className="text-sm md:text-base font-[900] text-[#1A3026] uppercase tracking-[2px] flex items-center gap-2">
                <Activity size={18} className="text-purple-600" /> Estado de Citas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={estadosCitas}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {estadosCitas.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '15px', border: '2px solid #D1E8D5', fontWeight: 'bold' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
        <Card className="rounded-[2.5rem] border-2 border-[#D1E8D5] overflow-hidden bg-white shadow-sm">
          <CardHeader className="bg-[#F8FFF9] border-b border-[#F0FFF4] p-8 flex flex-row items-center justify-between">
            <CardTitle className="text-sm md:text-base font-[900] text-[#1A3026] uppercase tracking-[2px]">
              Actividad Reciente
            </CardTitle>
            <ArrowUpRight className="text-[#3CB371]" size={20} />
          </CardHeader>
          <CardContent className="p-4 md:p-8">
            <div className="space-y-4">
              {stats.actividadReciente.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No hay actividad reciente
                </div>
              ) : (
                stats.actividadReciente.map((cita) => (
                  <div 
                    key={cita.id_cita} 
                    className="flex items-center justify-between p-5 bg-[#F8FFF9] border-2 border-[#F0FFF4] rounded-3xl hover:border-[#D1E8D5] transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center border-2 border-[#D1E8D5] group-hover:scale-110 transition-transform overflow-hidden">
                        {cita.pacientes?.foto_perfil ? (
                          <img 
                            src={getProfileImageUrl(cita.pacientes.foto_perfil)} 
                            alt={`${cita.pacientes?.nombre}`}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users className="h-5 w-5 text-[#2E8B57]" />
                        )}
                      </div>
                      <div>
                        <p className="font-[900] text-[#1A3026] uppercase text-sm md:text-base tracking-wide">
                          {cita.pacientes?.nombre} {cita.pacientes?.apellido}
                        </p>
                        <p className="text-xs md:text-sm font-bold text-[#3CB371] uppercase mt-0.5">
                          DR. {cita.pacientes?.paciente_nutriologo?.[0]?.nutriologos?.nombre} {cita.pacientes?.paciente_nutriologo?.[0]?.nutriologos?.apellido}
                        </p>
                        <p className="text-xs md:text-xs font-bold text-gray-400 uppercase mt-0.5">
                          {new Date(cita.fecha_hora).toLocaleDateString('es-MX')} • {new Date(cita.fecha_hora).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-4 py-1.5 text-[10px] md:text-xs font-[900] uppercase rounded-xl border-2 tracking-widest ${
                        cita.estado === 'completada' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        cita.estado === 'confirmada' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        cita.estado === 'pendiente' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                        'bg-red-50 text-red-600 border-red-100'
                      }`}>
                        {cita.estado}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
function StatCard({ title, value, sub, icon, color }) {
  return (
    <Card className="rounded-[2.5rem] border-2 border-[#D1E8D5] bg-white shadow-sm hover:shadow-md transition-all overflow-hidden">
      <CardContent className="p-8">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-2xl ${color} border-2 border-white shadow-sm`}>
            {icon}
          </div>
        </div>
        <div>
          <p className="text-xs md:text-sm font-[900] text-gray-400 uppercase tracking-widest mb-1">{title}</p>
          <p className="text-4xl font-[900] text-[#1A3026] tracking-tight">{value}</p>
          <p className="text-xs md:text-sm font-bold text-[#3CB371] mt-2 uppercase">{sub}</p>
        </div>
      </CardContent>
    </Card>
  ); 
}