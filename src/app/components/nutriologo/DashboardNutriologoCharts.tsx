import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CheckCircle2, TrendingUp } from 'lucide-react';

const COLORS = ['#2E8B57', '#3CB371', '#D1E8D5', '#E74C3C'];

type IngresoMesItem = {
  mes: string;
  ingresos: number;
};

type CitasEstadoItem = {
  name: string;
  value: number;
};

interface DashboardNutriologoChartsProps {
  ingresosPorMes: IngresoMesItem[];
  citasPorEstado: CitasEstadoItem[];
  onTabChange?: (tab: string) => void;
}

export function DashboardNutriologoCharts({
  ingresosPorMes,
  citasPorEstado,
  onTabChange,
}: DashboardNutriologoChartsProps) {
  return (
    <>
      <div
        className="bg-white p-8 rounded-[2.5rem] border-2 border-[#D1E8D5] shadow-sm cursor-pointer hover:shadow-lg transition-shadow duration-300"
        onClick={() => onTabChange?.('pagos')}
      >
        <h3 className="text-2xl font-black text-[#1A3026] uppercase tracking-[2px] mb-6 flex items-center gap-2">
          <TrendingUp size={18} className="text-[#2E8B57]" /> Ingresos por Mes
        </h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ingresosPorMes}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0FFF4" />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#1A3026', fontWeight: 'bold', fontSize: 15 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#1A3026', fontWeight: 'bold', fontSize: 15 }} />
              <Tooltip cursor={{ fill: '#F0FFF4' }} contentStyle={{ borderRadius: '15px', border: '2px solid #D1E8D5' }} />
              <Bar dataKey="ingresos" fill="#2E8B57" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div
        className="bg-white p-8 rounded-[2.5rem] border-2 border-[#D1E8D5] shadow-sm cursor-pointer hover:shadow-lg transition-shadow duration-300"
        onClick={() => onTabChange?.('citas')}
      >
        <h3 className="text-2xl font-black text-[#1A3026] uppercase tracking-[2px] mb-6 flex items-center gap-2">
          <CheckCircle2 size={18} className="text-[#2E8B57]" /> Estado de Citas
        </h3>
        <div className="h-[300px] w-full flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={citasPorEstado}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {citasPorEstado.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '15px', border: '2px solid #D1E8D5' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="pt-2 flex flex-wrap justify-center gap-x-3 gap-y-2 px-2 shrink-0">
            {citasPorEstado.map((entry, i) => (
              <div key={i} className="flex items-center gap-1.5 min-w-0">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-[10px] sm:text-xs font-black uppercase text-gray-500 leading-none whitespace-nowrap">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
