import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/app/components/ui/dialog';
import { Progress } from '@/app/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { useAuth } from '@/app/context/useAuth';
import { supabase } from '@/app/context/supabaseClient';
import { toast } from 'sonner';
import { 
  Trophy, 
  Star, 
  Award, 
  Crown, 
  Target, 
  Plus, 
  TrendingUp,
  Search
} from 'lucide-react';

const STORAGE_PUBLIC_URL = 'https://hthnkzwjotwqhvjgqhfv.supabase.co/storage/v1/object/public/perfiles/';
const premioBronceImg = new URL('../../../../assets/premiocobre.png', import.meta.url).href;
const premioPlataImg = new URL('../../../../assets/premioplata.png', import.meta.url).href;
const premioOroImg = new URL('../../../../assets/premiooro.png', import.meta.url).href;
const premioDiamanteImg = new URL('../../../../assets/premiodiamante.png', import.meta.url).href;

const getPremioImageByNivel = (nivel: string) => {
  if (nivel === 'Bronce') return premioBronceImg;
  if (nivel === 'Plata') return premioPlataImg;
  if (nivel === 'Oro') return premioOroImg;
  if (nivel === 'Diamante') return premioDiamanteImg;
  return null;
};

// ────────────────────────────────────────────────────────────────
// LÓGICA DE GAMIFICACIÓN (ajustada: sin rango <100 pts, nombres como "Bronce")
// ────────────────────────────────────────────────────────────────
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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState('');
  const [puntosAsignar, setPuntosAsignar] = useState('');
  const [misPacientes, setMisPacientes] = useState<any[]>([]);
  const [filteredPacientes, setFilteredPacientes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState(''); // ← Barra principal
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.nutriologoId) {
      fetchMisPacientes();
    }
  }, [user]);

  const fetchMisPacientes = async () => {
    setLoading(true);
    try {
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

      setMisPacientes(pacientesConPuntos);
      setFilteredPacientes(pacientesConPuntos);
    } catch (error: any) {
      console.error('[Gamificacion] Error cargando pacientes:', error.message);
      toast.error('No se pudieron cargar los pacientes');
    } finally {
      setLoading(false);
    }
  };

  // Filtrado para la pantalla principal (ranking y metas)
  const pacientesFiltrados = misPacientes.filter(paciente =>
    !searchQuery ||
    paciente.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    paciente.apellido.toLowerCase().includes(searchQuery.toLowerCase()) ||
    paciente.correo?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pacientesOrdenados = [...pacientesFiltrados].sort((a, b) => b.puntos - a.puntos);

  // Búsqueda solo para el diálogo de asignar puntos
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

      toast.success(`${puntosNum} puntos asignados con éxito`);
      setIsDialogOpen(false);
      setSelectedPaciente('');
      setPuntosAsignar('');
      fetchMisPacientes();
    } catch (error: any) {
      console.error('[Gamificacion] Error asignando puntos:', error.message);
      toast.error('Error al asignar puntos');
    }
  };

  if (loading) {
    return <AnimatedLoadingScreen />;
  }

  return (
    <div className="min-h-screen p-4 md:p-10 font-sans bg-[#F8FFF4] space-y-10">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header */}
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
              <DialogContent className="rounded-[2.5rem] border-2 border-[#D1E8D5] p-8 max-w-lg">
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
                              {paciente.nombre} {paciente.apellido} ({paciente.correo}) - {paciente.puntos} pts
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

            {/* BARRA DE BÚSQUEDA EN LA PANTALLA PRINCIPAL */}
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

        {/* Niveles - AJUSTADOS A UMBRALES Y NOMBRES */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { n: 'Bronce', pts: '100-999', color: 'text-orange-600', bg: 'bg-orange-50', image: premioBronceImg, level: 'Principiante' },
            { n: 'Plata', pts: '1000-4999', color: 'text-slate-500', bg: 'bg-slate-50', image: premioPlataImg, level: 'Intermedio' },
            { n: 'Oro', pts: '5000-9999', color: 'text-yellow-600', bg: 'bg-yellow-50', image: premioOroImg, level: 'Avanzado' },
            { n: 'Diamante', pts: '10000+', color: 'text-blue-600', bg: 'bg-blue-50', image: premioDiamanteImg, level: 'Leyenda' },
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
          {/* Ranking */}
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
                            {paciente.puntos}
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

          {/* Cumplimiento de Metas */}
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
                            <p className="text-xs md:text-sm font-bold text-gray-400 tracking-tight">META: 10000 PTS</p>
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
      </div>
    </div>
  );
}