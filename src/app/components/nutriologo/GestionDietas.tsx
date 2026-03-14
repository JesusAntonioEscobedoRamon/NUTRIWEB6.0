import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Textarea } from '@/app/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/app/components/ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { supabase } from '@/app/context/supabaseClient';
import { useAuth } from '@/app/context/useAuth';
import { 
  FileText, 
  Download, 
  Plus, 
  Utensils, 
  Coffee, 
  Sun, 
  Moon, 
  Search, 
  Salad,
  Scale,
  Flame,
  Tag,
  Apple,
  Edit,
  Clock,
  ChevronDown,
  X,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { dbgGroup, dbgGroupEnd, dbgLog, dbgOk, dbgError } from '@/utils/debug';

type MealKey = 'desayuno' | 'colacion1' | 'almuerzo' | 'colacion2' | 'cena' | 'snack';

type Ingrediente = {
  id_alimento: number;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  porcion_estandar?: string;
  calorias_por_100g?: number;
};

type MealData = {
  desc: string;
  categoria: string;
  porcion: string;
  cal100g: string;
  horario: string;
  ingredientes: Ingrediente[];
};

type DietaData = Record<MealKey, MealData>;
type WeeklyDietaData = Record<number, DietaData>;
type WeeklyMealIngredientSelection = Record<number, Record<MealKey, string>>;
const UNIDADES_PORCION = [
  'unidad', 'pieza', 'rebanada', 'cucharada', 'cucharadita', 
  'taza', 'vaso', 'puñado', 'porción', 'fracción', 
  'g', 'ml', 'litro', 'onza'
];

const DIETA_DETALLE_CATEGORIAS_VALIDAS = new Set([
  'frutas',
  'verduras',
  'cereales',
  'carnes',
  'lacteos',
  'otros',
]);

const STORAGE_PUBLIC_URL = 'https://hthnkzwjotwqhvjgqhfv.supabase.co/storage/v1/object/public/perfiles/';

function normalizeCategoriaForDietaDetalle(categoria?: string | null): string | null {
  if (!categoria) return null;

  const categorias = categoria
    .split(',')
    .map(item => item.trim().toLowerCase())
    .filter(Boolean)
    .map(item => {
      if (item === 'lácteos') return 'lacteos';
      if (item === 'procesados') return 'otros';
      return item;
    })
    .filter(item => DIETA_DETALLE_CATEGORIAS_VALIDAS.has(item));

  if (categorias.length === 0) return null;
  if (categorias.length > 1) return 'otros';

  return categorias[0];
}

const mealModules: Array<{ key: MealKey; label: string; icon: any; color: string }> = [
  { key: 'desayuno', label: 'Desayuno', icon: Coffee, color: 'text-amber-600' },
  { key: 'colacion1', label: 'Colación 1', icon: Apple, color: 'text-green-600' },
  { key: 'almuerzo', label: 'Almuerzo', icon: Sun, color: 'text-orange-600' },
  { key: 'colacion2', label: 'Colación 2', icon: Apple, color: 'text-green-600' },
  { key: 'cena', label: 'Cena', icon: Moon, color: 'text-indigo-600' },
];

const createEmptyDietaData = (): DietaData => ({
  desayuno: { desc: '', categoria: '', porcion: '', cal100g: '', horario: '05:30', ingredientes: [] },
  colacion1: { desc: '', categoria: '', porcion: '', cal100g: '', horario: '', ingredientes: [] },
  almuerzo: { desc: '', categoria: '', porcion: '', cal100g: '', horario: '13:00', ingredientes: [] },
  colacion2: { desc: '', categoria: '', porcion: '', cal100g: '', horario: '', ingredientes: [] },
  cena: { desc: '', categoria: '', porcion: '', cal100g: '', horario: '20:00', ingredientes: [] },
  snack: { desc: '', categoria: '', porcion: '', cal100g: '', horario: '', ingredientes: [] },
});

const createMealIngredientSelection = (): Record<MealKey, string> => ({
  desayuno: '',
  colacion1: '',
  almuerzo: '',
  colacion2: '',
  cena: '',
  snack: '',
});

const createEmptyWeeklyDietaData = (): WeeklyDietaData => {
  const weeklyData: WeeklyDietaData = {} as WeeklyDietaData;
  for (let dia = 1; dia <= 7; dia++) {
    weeklyData[dia] = createEmptyDietaData();
  }
  return weeklyData;
};

const createWeeklyMealIngredientSelection = (): WeeklyMealIngredientSelection => {
  const weeklySelection: WeeklyMealIngredientSelection = {} as WeeklyMealIngredientSelection;
  for (let dia = 1; dia <= 7; dia++) {
    weeklySelection[dia] = createMealIngredientSelection();
  }
  return weeklySelection;
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
        { duration: 3000, iterations: Infinity, easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)' }
      );
    }

    if (textElement) {
      textElement.animate(
        [{ opacity: 0.5 }, { opacity: 1 }, { opacity: 0.5 }],
        { duration: 2000, iterations: Infinity, easing: 'ease-in-out' }
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
          { duration: 1500, delay: index * 200, iterations: Infinity, easing: 'ease-in-out' }
        );
      });
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FFF9]">
      <div className="text-center">
        <div className="flex justify-center mb-8">
          <div ref={iconRef} className="text-[#2E8B57]">
            <Salad size={80} strokeWidth={1.5} />
          </div>
        </div>
        
        <div ref={textRef} className="text-[#2E8B57] font-bold text-2xl mb-6">
          Cargando planes de alimentación...
        </div>
        
        <div ref={dotsRef} className="flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-3 h-3 rounded-full bg-[#2E8B57]" />
          ))}
        </div>
      </div>
    </div>
  );
}
export function GestionDietas() {
  const { user } = useAuth();

  const [pacientes, setPacientes] = useState<any[]>([]);
  const [filteredPacientes, setFilteredPacientes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dietas, setDietas] = useState<any[]>([]);
  const [alimentos, setAlimentos] = useState<any[]>([]);
  const [filteredAlimentos, setFilteredAlimentos] = useState<any[]>([]);
  const [alimentosSearchQuery, setAlimentosSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState<string>('');
  const [activeDia, setActiveDia] = useState<number>(1);

  const [isEditing, setIsEditing] = useState(false);
  const [editingDietaId, setEditingDietaId] = useState<number | null>(null);
  const [editingDietaData, setEditingDietaData] = useState<any>(null);

  const [dietaByDay, setDietaByDay] = useState<WeeklyDietaData>(createEmptyWeeklyDietaData());
  const [selectedIngredientByMeal, setSelectedIngredientByMeal] = useState<WeeklyMealIngredientSelection>(createWeeklyMealIngredientSelection());
  const [tempCantidad, setTempCantidad] = useState<Record<number, Record<MealKey, string>>>({});
  const [tempUnidad, setTempUnidad] = useState<Record<number, Record<MealKey, string>>>({});

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dietaToDelete, setDietaToDelete] = useState<any>(null);

  const [nutriologoEmail, setNutriologoEmail] = useState<string>('');

  const diasSemana = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const diasAbreviados = ['', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

  const sanitizeCantidadInput = (rawValue: string): string => {
    let normalized = rawValue.replace(',', '.').replace(/[^0-9.]/g, '');

    if (!normalized) return '';

    const firstDotIndex = normalized.indexOf('.');
    if (firstDotIndex !== -1) {
      normalized =
        normalized.slice(0, firstDotIndex + 1) +
        normalized.slice(firstDotIndex + 1).replace(/\./g, '');
    }

    if (normalized.startsWith('.')) {
      normalized = `0${normalized}`;
    }

    if (/^0\d+/.test(normalized)) {
      normalized = normalized.replace(/^0+/, '');
      if (!normalized) normalized = '0';
    }

    return normalized;
  };
  useEffect(() => {
    if (isDialogOpen) {
      const initCant = {};
      const initUnid = {};
      for (let dia = 1; dia <= 7; dia++) {
        initCant[dia] = {};
        initUnid[dia] = {};
        mealModules.forEach(m => {
          initCant[dia][m.key] = '0';     // valor visual inicial
          initUnid[dia][m.key] = 'unidad'; // default unidad genérica
        });
      }
      setTempCantidad(initCant);
      setTempUnidad(initUnid);
    }
  }, [isDialogOpen]);

  const fetchData = async () => {
    if (!user?.nutriologoId) {
      toast.error('No se encontró ID de nutriólogo');
      setLoading(false);
      return;
    }

    dbgGroup('screen', `GestionDietas — nutriologoId=${user.nutriologoId}`);
    setLoading(true);

    const timeoutId = setTimeout(() => {
      dbgError('GestionDietas: timeout 15s — desbloqueo forzado');
      console.error('[NutriU] GestionDietas: timeout esperando datos de Supabase.');
      setLoading(false);
    }, 15000);

    try {
      const { data: nutriData, error: nutriError } = await supabase
        .from('nutriologos')
        .select('correo')
        .eq('id_nutriologo', user.nutriologoId)
        .single();

      if (nutriError) {
        dbgError('Error nutriologos', nutriError);
        clearTimeout(timeoutId);
        dbgGroupEnd();
        throw nutriError;
      }
      dbgLog('nutriData', nutriData);
      setNutriologoEmail(nutriData?.correo || 'nutriologo@nutriu.com');

      const { data: relData, error: relError } = await supabase
        .from('paciente_nutriologo')
        .select('id_paciente')
        .eq('id_nutriologo', user.nutriologoId)
        .eq('activo', true);

      if (relError) throw relError;

      let pacientesData: any[] = [];
      if (relData?.length > 0) {
        const ids = relData.map(r => r.id_paciente);
        const { data, error: pacientesError } = await supabase
          .from('pacientes')
          .select('id_paciente, nombre, apellido, correo')
          .in('id_paciente', ids);

        if (pacientesError) throw pacientesError;
        pacientesData = data || [];
      }

      setPacientes(pacientesData);
      setFilteredPacientes(pacientesData);

      const { data: dietaData, error: dietaError } = await supabase
        .from('dietas')
        .select(`
          id_dieta,
          nombre_dieta,
          descripcion,
          fecha_inicio,
          id_paciente,
          dieta_detalle (*)
        `)
        .eq('id_nutriologo', user.nutriologoId)
        .eq('activa', true)
        .order('fecha_inicio', { ascending: false })
        .limit(50);

      if (dietaError) throw dietaError;

      const pacienteIds = [...new Set(dietaData?.map(d => d.id_paciente) || [])];
      const { data: pacientesEnriquecidos } = await supabase
        .from('pacientes')
        .select('id_paciente, nombre, apellido, correo, foto_perfil')
        .in('id_paciente', pacienteIds);

      const pacientesMap = (pacientesEnriquecidos || []).reduce((acc: any, p: any) => {
        let fotoUrl = p.foto_perfil;
        if (fotoUrl && !fotoUrl.startsWith('http')) {
          fotoUrl = `${STORAGE_PUBLIC_URL}${fotoUrl}`;
        }

        acc[p.id_paciente] = p;
        acc[p.id_paciente].foto_perfil = fotoUrl || null;
        return acc;
      }, {});

      const enriched = (dietaData || []).map(dieta => ({
        ...dieta,
        pacientes: pacientesMap[dieta.id_paciente] || { nombre: 'Desconocido', apellido: '', correo: 'Sin email' },
      }));

      setDietas(enriched);
      dbgOk(`GestionDietas cargada: ${enriched.length} dietas`);

    } catch (err: any) {
      dbgError('GestionDietas fetchData error', err);
      console.error('[NutriU] GestionDietas error:', err?.message ?? err);
      toast.error('Error al cargar datos: ' + (err.message || 'Intenta de nuevo'));
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      dbgGroupEnd();
    }
  };

  const loadAlimentos = async () => {
    if (alimentos.length > 0) return;

    try {
      const { data, error } = await supabase
        .from('alimentos')
        .select('id_alimento, nombre, descripcion, categoria, porcion_estandar, calorias_por_100g')
        .eq('activo', true)
        .order('nombre')
        .limit(300);

      if (error) throw error;

      setAlimentos(data || []);
      setFilteredAlimentos(data || []);
    } catch (err: any) {
      toast.error('Error cargando alimentos');
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.nutriologoId]);

  useEffect(() => {
    if (isDialogOpen) {
      loadAlimentos();
    }
  }, [isDialogOpen]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase().trim();
    setSearchQuery(query);
    if (!query) {
      setFilteredPacientes(pacientes);
      return;
    }
    const filtered = pacientes.filter(p =>
      (p.nombre + ' ' + p.apellido).toLowerCase().includes(query) ||
      p.correo?.toLowerCase().includes(query)
    );
    setFilteredPacientes(filtered);
  };

  const hasActiveDietForPaciente = async (pacienteId: number, excludeDietaId?: number) => {
    if (!user?.nutriologoId) return false;

    const { data, error } = await supabase
      .from('dietas')
      .select('id_dieta')
      .eq('id_nutriologo', user.nutriologoId)
      .eq('id_paciente', pacienteId)
      .eq('activa', true)
      .order('fecha_inicio', { ascending: false })
      .limit(1);

    if (error) throw error;

    const existente = data?.[0];
    if (!existente) return false;

    if (excludeDietaId && existente.id_dieta === excludeDietaId) return false;

    return true;
  };

  const handlePacienteSelection = async (pacienteId: string): Promise<boolean> => {
    if (!pacienteId) {
      setSelectedPaciente('');
      return false;
    }

    if (!isEditing) {
      try {
        const alreadyHasDiet = await hasActiveDietForPaciente(parseInt(pacienteId));
        if (alreadyHasDiet) {
          toast.warning('Este paciente ya tiene un plan asignado');
          setSelectedPaciente('');
          return false;
        }
      } catch (err: any) {
        toast.error('No se pudo validar la dieta del paciente');
        return false;
      }
    }

    setSelectedPaciente(pacienteId);
    return true;
  };

  const handleSearchKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredPacientes.length === 1) {
        const unico = filteredPacientes[0];
        const pacienteId = unico.id_paciente.toString();
        const selected = await handlePacienteSelection(pacienteId);

        if (selected) {
          toast.success(`Paciente seleccionado: ${unico.nombre} ${unico.apellido}`);
        }
      } else if (filteredPacientes.length > 1) {
        toast.info('Varios pacientes encontrados. Selecciona uno.');
      } else {
        toast.warning('No se encontró ningún paciente.');
      }
    }
  };

  const handleAlimentosSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase().trim();
    setAlimentosSearchQuery(query);
    if (!query) {
      setFilteredAlimentos(alimentos);
      return;
    }
    setFilteredAlimentos(alimentos.filter(a => a.nombre.toLowerCase().includes(query)));
  };

  const buildMealFromIngredientes = (ingredientes: Ingrediente[]) => {
    const descripcion = ingredientes.map(i => i.nombre).join(' con ');
    const categoria = [...new Set(ingredientes.map(i => i.categoria).filter(Boolean))].join(', ');
    const porcion = ingredientes
      .map(i => i.porcion_estandar)
      .filter(Boolean)
      .join(' + ');
    const totalCalorias = ingredientes.reduce((sum, i) => sum + Number(i.calorias_por_100g || 0), 0);

    return {
      desc: descripcion,
      categoria,
      porcion,
      cal100g: totalCalorias ? totalCalorias.toFixed(0) : '',
    };
  };

  const getDetalleCalorias = (detalle: any): number => {
    return Number(detalle?.calorias_estimadas ?? detalle?.calorias_por_100g ?? 0);
  };

  const handleAddIngredient = (dia: number, meal: MealKey) => {
    const alimentoId = selectedIngredientByMeal[dia]?.[meal];
    if (!alimentoId) return;

    const alimento = alimentos.find(a => a.id_alimento.toString() === alimentoId);
    if (!alimento) return;
    const cantidadStr = tempCantidad[dia]?.[meal] || '0';
    const unidad = tempUnidad[dia]?.[meal] || 'unidad';
    const cantidadNum = parseFloat(cantidadStr);

    if (!Number.isFinite(cantidadNum) || cantidadNum <= 0) {
      toast.warning('Ingresa una cantidad mayor a 0');
      return;
    }
    const porcionCompleta = `${cantidadStr} ${unidad}${cantidadNum !== 1 && !unidad.endsWith('s') ? 's' : ''}`.trim();

    setDietaByDay(prev => {
      const currentIngredientes = prev[dia][meal].ingredientes || [];
      const alreadySelected = currentIngredientes.some(i => i.id_alimento === alimento.id_alimento);
      if (alreadySelected) {
        toast.info('Este ingrediente ya fue agregado');
        return prev;
      }

      const updatedIngredientes = [
        ...currentIngredientes,
        {
          id_alimento: alimento.id_alimento,
          nombre: alimento.nombre,
          descripcion: alimento.descripcion,
          categoria: alimento.categoria,
          porcion_estandar: porcionCompleta,
          calorias_por_100g: Number(alimento.calorias_por_100g || 0),
        }
      ];

      const autoData = buildMealFromIngredientes(updatedIngredientes);

      return {
        ...prev,
        [dia]: {
          ...prev[dia],
          [meal]: {
            ...prev[dia][meal],
            ...autoData,
            porcion: porcionCompleta,
            ingredientes: updatedIngredientes,
          }
        }
      };
    });
    setSelectedIngredientByMeal(prev => ({
      ...prev,
      [dia]: { ...prev[dia], [meal]: '' }
    }));
    setTempCantidad(prev => ({
      ...prev,
      [dia]: { ...prev[dia], [meal]: '0' }
    }));
    setTempUnidad(prev => ({
      ...prev,
      [dia]: { ...prev[dia], [meal]: 'unidad' }
    }));
  };

  const handleRemoveIngredient = (dia: number, meal: MealKey, alimentoId: number) => {
    setDietaByDay(prev => {
      const updatedIngredientes = prev[dia][meal].ingredientes.filter(i => i.id_alimento !== alimentoId);
      const autoData = buildMealFromIngredientes(updatedIngredientes);

      return {
        ...prev,
        [dia]: {
          ...prev[dia],
          [meal]: {
            ...prev[dia][meal],
            ...autoData,
            ingredientes: updatedIngredientes,
          }
        }
      };
    });
  };

  const handleHoraChange = (dia: number, meal: MealKey, horario: string) => {
    setDietaByDay(prev => ({
      ...prev,
      [dia]: {
        ...prev[dia],
        [meal]: { ...prev[dia][meal], horario }
      }
    }));
  };

  const openCreateDialog = () => {
    setIsEditing(false);
    setEditingDietaData(null);
    setSelectedPaciente('');
    setSearchQuery('');
    setAlimentosSearchQuery('');
    setDietaByDay(createEmptyWeeklyDietaData());
    setSelectedIngredientByMeal(createWeeklyMealIngredientSelection());
    setActiveDia(1);
    setIsDialogOpen(true);
  };

  const openEditDialog = (dieta: any) => {
    setIsEditing(true);
    setEditingDietaData(dieta);
    setSelectedPaciente(dieta.id_paciente.toString());
    
    const emptyData = createEmptyWeeklyDietaData();
    setSelectedIngredientByMeal(createWeeklyMealIngredientSelection());

    (dieta.dieta_detalle || []).forEach((det: any) => {
      const keyMap: Record<string, MealKey> = {
        'Desayuno': 'desayuno',
        'Colación 1': 'colacion1',
        'Almuerzo': 'almuerzo',
        'Colación 2': 'colacion2',
        'Cena': 'cena',
        'Snack': 'snack',
      };

      const dia = Number(det.dia_semana);
      const key = keyMap[det.tipo_comida];

      if (dia >= 1 && dia <= 7 && key) {
        emptyData[dia][key] = {
          desc: det.descripcion || '',
          categoria: det.categoria || '',
          porcion: det.porcion_sugerida || '',
          cal100g: (det.calorias_estimadas ?? det.calorias_por_100g)?.toString() || '',
          horario: det.horario || emptyData[dia][key].horario,
          ingredientes: [],
        };
      }
    });

    const primerDiaConComidas = Array.from({ length: 7 }, (_, idx) => idx + 1).find((dia) =>
      Object.values(emptyData[dia]).some(item => item.desc.trim())
    );

    setActiveDia(primerDiaConComidas || 1);

    setDietaByDay(emptyData);
    setIsDialogOpen(true);
  };

  const eliminarDieta = async (dietaId: number, pacienteNombre: string) => {
    setDietaToDelete({ id: dietaId, nombre: pacienteNombre });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!dietaToDelete) return;

    try {
      const { error: deleteDetalles } = await supabase
        .from('dieta_detalle')
        .delete()
        .eq('id_dieta', dietaToDelete.id);

      if (deleteDetalles) throw deleteDetalles;

      const { error: deleteDieta } = await supabase
        .from('dietas')
        .delete()
        .eq('id_dieta', dietaToDelete.id);

      if (deleteDieta) throw deleteDieta;

      toast.success('Plan nutricional eliminado correctamente');
      await fetchData();
    } catch (err: any) {
      toast.error('Error al eliminar el plan: ' + (err.message || 'Intenta de nuevo'));
    } finally {
      setDeleteDialogOpen(false);
      setDietaToDelete(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.nutriologoId) return toast.error('No se encontró ID de nutriólogo');
    if (!selectedPaciente) return toast.error('Selecciona un paciente');

    const diasSinComidas = Array.from({ length: 7 }, (_, idx) => idx + 1).filter((dia) => {
      return !Object.values(dietaByDay[dia]).some(item => item.desc.trim());
    });

    if (diasSinComidas.length > 0) {
      const diasFaltantes = diasSinComidas.map(dia => diasSemana[dia]).join(', ');
      return toast.error(`Falta agregar al menos una comida en: ${diasFaltantes}`);
    }

    setLoading(true);

    try {
      let dietaId: number;

      if (isEditing && editingDietaData) {
        dietaId = editingDietaData.id_dieta;
      } else {
        const alreadyHasDiet = await hasActiveDietForPaciente(parseInt(selectedPaciente));

        if (alreadyHasDiet) {
          toast.warning('Este paciente ya tiene un plan asignado');
          setLoading(false);
          return;
        }
        const { data: dietaExistente, error: buscarError } = await supabase
          .from('dietas')
          .select('id_dieta')
          .eq('id_nutriologo', user?.nutriologoId)
          .eq('id_paciente', parseInt(selectedPaciente))
          .order('fecha_inicio', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (buscarError) throw buscarError;

        if (dietaExistente) {
          const { error: updateError } = await supabase
            .from('dietas')
            .update({
              nombre_dieta: `Plan semanal - ${new Date().toLocaleDateString('es-MX')}`,
              fecha_inicio: new Date().toISOString().split('T')[0],
              activa: true,
            })
            .eq('id_dieta', dietaExistente.id_dieta);

          if (updateError) throw updateError;
          dietaId = dietaExistente.id_dieta;
        } else {
          const { data: nueva, error: insertError } = await supabase
            .from('dietas')
            .insert({
              id_nutriologo: user?.nutriologoId,
              id_paciente: parseInt(selectedPaciente),
              nombre_dieta: `Plan semanal - ${new Date().toLocaleDateString('es-MX')}`,
              fecha_inicio: new Date().toISOString().split('T')[0],
              activa: true,
            })
            .select('id_dieta')
            .single();

          if (insertError) throw insertError;
          dietaId = nueva.id_dieta;
        }
      }

      const { error: deleteDetalleError } = await supabase
        .from('dieta_detalle')
        .delete()
        .eq('id_dieta', dietaId);

      if (deleteDetalleError) throw deleteDetalleError;

      const comidasConfig = [
        { tipo: 'Desayuno', key: 'desayuno' },
        { tipo: 'Colación 1', key: 'colacion1' },
        { tipo: 'Almuerzo', key: 'almuerzo' },
        { tipo: 'Colación 2', key: 'colacion2' },
        { tipo: 'Cena', key: 'cena' },
      ];

      const horarioPorDefecto: Record<string, string> = {
        desayuno: '05:30',
        colacion1: '10:30',
        almuerzo: '13:00',
        colacion2: '17:00',
        cena: '20:00',
      };

      const detalles = Array.from({ length: 7 }, (_, idx) => idx + 1).flatMap((dia) => {
        const comidasDelDia = dietaByDay[dia];

        return comidasConfig
          .filter(c => comidasDelDia[c.key as MealKey].desc.trim())
          .map((c, index) => {
            const ingredientes = comidasDelDia[c.key as MealKey].ingredientes;
            const porcionSugerida = comidasDelDia[c.key as MealKey].porcion 
              ? comidasDelDia[c.key as MealKey].porcion 
              : ingredientes.length > 0 
                ? ingredientes.map(i => i.porcion_estandar || '1 unidad').join(' + ')
                : null;

            const caloriasPor100g = ingredientes.length > 0 
              ? Number(ingredientes[0].calorias_por_100g || null) 
              : null;

            return {
              id_dieta: dietaId,
              dia_semana: dia,
              tipo_comida: c.tipo,
              descripcion: comidasDelDia[c.key as MealKey].desc.trim(),
              categoria: normalizeCategoriaForDietaDetalle(comidasDelDia[c.key as MealKey].categoria),
              porcion_sugerida: porcionSugerida,
              calorias_por_100g: caloriasPor100g,
              horario: comidasDelDia[c.key as MealKey].horario || horarioPorDefecto[c.key] || null,
              orden: index + 1,
            };
          });
      });

      if (detalles.length > 0) {
        const { error: detalleError } = await supabase.from('dieta_detalle').insert(detalles);
        if (detalleError) throw detalleError;
      }

      toast.success(isEditing ? '¡Plan actualizado!' : '¡Plan asignado!');
      try {
        const { data: nutriologoInfo } = await supabase
          .from('nutriologos')
          .select('nombre, apellido')
          .eq('id_nutriologo', user?.nutriologoId)
          .single();

        const nutriologoNombre = nutriologoInfo 
          ? `${nutriologoInfo.nombre} ${nutriologoInfo.apellido}`
          : undefined;

        const dietaNombre = `Plan semanal - ${new Date().toLocaleDateString('es-MX')}`;
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://servidor-nutri-u.vercel.app';
        const notificationResponse = await fetch(`${backendUrl}/notifications/diet-updated`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pacienteId: parseInt(selectedPaciente),
            nutriologoNombre,
            dietaNombre,
            action: isEditing ? 'updated' : 'created',
          }),
        });

        if (notificationResponse.ok) {
          const result = await notificationResponse.json();
          if (result.sent > 0) {
          }
        } else {
        }
      } catch (notifError) {
      }

      setIsDialogOpen(false);

      setDietaByDay(createEmptyWeeklyDietaData());
      setSelectedIngredientByMeal(createWeeklyMealIngredientSelection());
      setActiveDia(1);

      setSelectedPaciente('');
      setSearchQuery('');
      setAlimentosSearchQuery('');
      setIsEditing(false);
      setEditingDietaData(null);

      await fetchData();
    } catch (err: any) {
      const detalle = [err?.message, err?.details, err?.hint, err?.code].filter(Boolean).join(' | ');
      toast.error('Error al guardar: ' + (detalle || 'Revisa consola'));
    } finally {
      setLoading(false);
    }
  };

  function convertTo12Hour(hora: string): string {
    if (!hora) return '';
    const [hours, minutes] = hora.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const adjustedHours = hours % 12 || 12;
    return `${adjustedHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  const exportToPDF = async (dieta: any) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const verdePrincipal = [46, 139, 87];
    const verdeClaro = [240, 255, 244];
    const verdeHeader = [232, 245, 233];
    const grisOscuro = [26, 48, 38];
    const grisMedio = [75, 85, 99];

    doc.setFillColor(...verdeClaro);
    doc.rect(0, 0, 297, 35, 'F');

    const logoWidth = 50;
    const logoHeight = 25;
    doc.addImage(
      '/assets/logo.png',
      'PNG',
      (297 - logoWidth) / 2,
      5,
      logoWidth,
      logoHeight
    );

    doc.setFontSize(16);
    doc.setTextColor(...verdePrincipal);
    doc.setFont('helvetica', 'bold');
    doc.text('PLAN NUTRICIONAL SEMANAL', 148.5, 40, { align: 'center' });

    doc.setFontSize(8);
    doc.setTextColor(...grisOscuro);
    let y = 50;

    doc.setFont('helvetica', 'bold');
    doc.text('Paciente:', 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${dieta.pacientes.nombre || ''} ${dieta.pacientes.apellido || ''}`, 45, y); y += 5;

    y = 50;
    const rightX = 160;

    doc.setFont('helvetica', 'bold');
    doc.text('Nutriólogo:', rightX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${user?.nombre || 'Jose C'} ${user?.apellido || ''}`, rightX + 25, y); y += 5;

    doc.setFont('helvetica', 'bold');
    doc.text('Correo:', rightX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${user?.email || 'nutriologo.josec@email.com'}`, rightX + 25, y); y += 5;

    doc.setFont('helvetica', 'bold');
    doc.text('Teléfono:', rightX, y);
    doc.setFont('helvetica', 'normal');
    doc.text('+52 (653) 536 7647', rightX + 25, y); y += 10;

    const allDetalles = dieta.dieta_detalle || [];
    const getHeaderWithHorario = (tipo: string) => {
      const det = allDetalles.find((d: any) => d.tipo_comida === tipo);
      if (det && det.horario && !tipo.includes('Colación')) {
        return `${tipo} ${convertTo12Hour(det.horario)}`;
      }
      return tipo;
    };

    const head = [
      ['Día', getHeaderWithHorario('Desayuno'), getHeaderWithHorario('Colación 1'), getHeaderWithHorario('Almuerzo'), getHeaderWithHorario('Colación 2'), getHeaderWithHorario('Cena'), 'Calorías']
    ];

    const tableData: string[][] = [];
    for (let dia = 1; dia <= 7; dia++) {
      const detalles = allDetalles.filter((d: any) => d.dia_semana === dia);
      const getCell = (tipo: string) => {
        const det = detalles.find((d: any) => d.tipo_comida === tipo);
        return det ? det.descripcion : '-';
      };

      const getCalorias = () => {
        const total = detalles.reduce((sum: number, d: any) => sum + getDetalleCalorias(d), 0);
        return total > 0 ? `${total.toFixed(0)} kcal` : '-';
      };

      tableData.push([
        diasSemana[dia],
        getCell('Desayuno'),
        getCell('Colación 1'),
        getCell('Almuerzo'),
        getCell('Colación 2'),
        getCell('Cena'),
        getCalorias()
      ]);
    }

    const columnWidths = [18, 38, 38, 38, 38, 38, 28];
    const totalTableWidth = columnWidths.reduce((a, b) => a + b, 0);
    const leftMargin = (297 - totalTableWidth) / 2;

    autoTable(doc, {
      startY: y + 5,
      head,
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5, overflow: 'linebreak', halign: 'left', lineWidth: 0.1 },
      headStyles: { fillColor: verdeHeader, textColor: grisOscuro, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: verdeClaro },
      columnStyles: {
        0: { cellWidth: columnWidths[0], halign: 'center' },
        1: { cellWidth: columnWidths[1] },
        2: { cellWidth: columnWidths[2] },
        3: { cellWidth: columnWidths[3] },
        4: { cellWidth: columnWidths[4] },
        5: { cellWidth: columnWidths[5] },
        6: { cellWidth: columnWidths[6], halign: 'center' }
      },
      margin: { left: leftMargin, right: leftMargin }
    });

    const finalY = doc.lastAutoTable.finalY || 180;
    doc.setFontSize(7);
    doc.setTextColor(...grisMedio);
    doc.text('© +52 (653) 536 7647 • +52 (662) 146 4154', 148.5, finalY + 8, { align: 'center' });
    doc.text('nutriologo.josec@email.com', 148.5, finalY + 12, { align: 'center' });
    doc.text('Av. Kino y Calle 7 #1/2 Col. Médica, San Luis Río Colorado, Sonora', 148.5, finalY + 16, { align: 'center' });
    doc.text('@nutlotbhm', 148.5, finalY + 20, { align: 'center' });

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

  if (loading) return <AnimatedLoadingScreen />;

  const groupByDay = (detalles: any[]) => {
    const groups: { [key: number]: any[] } = {};
    detalles.forEach(d => {
      if (!groups[d.dia_semana]) groups[d.dia_semana] = [];
      groups[d.dia_semana].push(d);
    });
    return groups;
  };

  const filteredDietas = dietas.filter(dieta => {
    const pacienteName = (dieta.pacientes.nombre + ' ' + dieta.pacientes.apellido).toLowerCase();
    return pacienteName.includes(searchQuery.toLowerCase());
  });

  const diasSinComidasEnModal = Array.from({ length: 7 }, (_, idx) => idx + 1).filter((dia) => {
    return !Object.values(dietaByDay[dia]).some(item => item.desc.trim());
  });

  return (
    <div className="min-h-screen p-4 md:p-10 font-sans bg-[#F8FFF9] space-y-10">
      <div className="max-w-7xl mx-auto space-y-10">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
          <div>
            <h1 className="text-4xl md:text-5xl font-[900] text-[#2E8B57] tracking-[4px] uppercase">
              Gestión de Dietas
            </h1>
            <div className="w-16 h-1.5 bg-[#3CB371] rounded-full mt-2" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (open) setActiveDia(1);
              }}
            >
              <Button
                type="button"
                onClick={openCreateDialog}
                className="w-full md:w-auto bg-[#2E8B57] hover:bg-[#1A3026] text-white font-black py-6 px-8 rounded-2xl shadow-lg transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2"
              >
                <Plus className="h-5 w-5" />
                Nueva Dieta
              </Button>

              <DialogContent className="!w-[calc(100vw-1rem)] sm:!w-[calc(100vw-2rem)] lg:!w-[calc(100vw-4rem)] !max-w-none !h-[94vh] !max-h-[94vh] rounded-[2rem] sm:rounded-[2.5rem] border-2 border-[#D1E8D5] bg-white p-0 overflow-hidden">
                <div className="custom-dialog-scroll h-full overflow-y-auto overflow-x-hidden">
                  <div className="p-4 md:p-8 lg:p-10">
                    <DialogHeader>
                      <DialogTitle className="text-3xl font-[900] text-[#2E8B57] uppercase tracking-[2px]">
                        {isEditing ? 'Editar Plan Nutricional' : 'Crear Plan Nutricional'}
                      </DialogTitle>
                      <DialogDescription className="text-base text-gray-500 mt-2">
                        {isEditing 
                          ? 'Modifica las comidas de toda la semana para este paciente.' 
                          : 'Asigna un plan alimenticio personalizado seleccionando comidas de tu catálogo.'}
                      </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 mt-8">
                      <div className="space-y-2">
                        <Label className="text-xs font-black uppercase text-gray-400 tracking-wider">Buscar Paciente</Label>
                        <div className="relative">
                          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#2E8B57]" />
                          <Input
                            placeholder="Escribe nombre, apellido o correo..."
                            value={searchQuery}
                            onChange={handleSearch}
                            onKeyDown={handleSearchKeyDown}
                            className="pl-12 border-2 border-[#D1E8D5] rounded-xl h-12 font-bold focus:ring-[#2E8B57]"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-black uppercase text-gray-400 tracking-wider">Paciente Seleccionado</Label>
                        <Select value={selectedPaciente} onValueChange={handlePacienteSelection}>
                          <SelectTrigger className="border-2 border-[#D1E8D5] rounded-xl h-12">
                            <SelectValue placeholder="Selecciona o busca un paciente" />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl max-h-60 overflow-y-auto custom-dialog-scroll">
                            {filteredPacientes.length === 0 && searchQuery ? (
                              <div className="p-4 text-center text-gray-500 text-sm">
                                No se encontraron pacientes
                              </div>
                            ) : (
                              filteredPacientes.map((p) => (
                                <SelectItem
                                  key={p.id_paciente}
                                  value={p.id_paciente.toString()}
                                  className="font-bold text-sm uppercase py-3"
                                >
                                  {p.nombre} {p.apellido}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-6">
                        <h3 className="text-base font-[900] text-[#2E8B57] uppercase tracking-wider border-b-2 border-[#D1E8D5] pb-2">
                          Selecciona las comidas de la semana
                        </h3>

                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                          {Array.from({ length: 7 }, (_, idx) => idx + 1).map((dia) => (
                            <button
                              key={dia}
                              type="button"
                              onClick={() => setActiveDia(dia)}
                              className={`shrink-0 min-w-12 h-12 rounded-full border-2 text-xs font-black uppercase tracking-wide transition-all ${
                                activeDia === dia
                                  ? 'bg-[#2E8B57] border-[#2E8B57] text-white'
                                  : 'bg-[#F3F4F6] border-[#E5E7EB] text-gray-600 hover:border-[#D1E8D5]'
                              }`}
                              title={diasSemana[dia]}
                            >
                              {diasAbreviados[dia]}
                            </button>
                          ))}
                        </div>

                        <div className="p-4 border-2 border-[#D1E8D5] rounded-2xl bg-[#F8FFF9]/40">
                          <p className="text-sm font-[900] uppercase tracking-wider text-[#2E8B57]">
                            {diasSemana[activeDia]}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {mealModules.map((meal) => (
                            <div key={`${activeDia}-${meal.key}`} className="min-w-0 space-y-4 p-5 border-2 border-[#D1E8D5] rounded-3xl bg-white shadow-sm">
                              <div className="flex items-center gap-2">
                                <meal.icon size={18} className={meal.color} />
                                <Label className="text-base font-black uppercase text-[#1A3026]">{meal.label}</Label>
                              </div>

                              <div className="grid grid-cols-1 gap-2">
                                <Select
                                  value={selectedIngredientByMeal[activeDia][meal.key]}
                                  onValueChange={(val) =>
                                    setSelectedIngredientByMeal(prev => ({
                                      ...prev,
                                      [activeDia]: {
                                        ...prev[activeDia],
                                        [meal.key]: val,
                                      }
                                    }))
                                  }
                                >
                                  <SelectTrigger className="w-full min-w-0 border-2 border-[#D1E8D5] rounded-xl h-12">
                                    <SelectValue placeholder="Selecciona un ingrediente" />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl border-2 border-[#D1E8D5] custom-dialog-scroll max-h-60">
                                    {filteredAlimentos.length === 0 ? (
                                      <div className="p-4 text-center text-gray-500 text-sm">
                                        No hay alimentos disponibles
                                      </div>
                                    ) : (
                                      filteredAlimentos.map((alimento) => (
                                        <SelectItem
                                          key={alimento.id_alimento}
                                          value={alimento.id_alimento.toString()}
                                          className="font-bold text-sm py-3"
                                        >
                                          {alimento.nombre}
                                        </SelectItem>
                                      ))
                                    )}
                                  </SelectContent>
                                </Select>
                                <div className="grid grid-cols-[1fr_auto_auto] gap-2">
                                  <Input
                                    type="number"
                                    placeholder="Cant."
                                    value={tempCantidad[activeDia]?.[meal.key] || '0'}
                                    onChange={(e) => {
                                      const val = sanitizeCantidadInput(e.target.value);
                                      setTempCantidad(prev => ({
                                        ...prev,
                                        [activeDia]: { ...prev[activeDia], [meal.key]: val }
                                      }));
                                    }}
                                    onFocus={() => {
                                      if ((tempCantidad[activeDia]?.[meal.key] || '0') === '0') {
                                        setTempCantidad(prev => ({
                                          ...prev,
                                          [activeDia]: { ...prev[activeDia], [meal.key]: '' }
                                        }));
                                      }
                                    }}
                                    onBlur={() => {
                                      const current = tempCantidad[activeDia]?.[meal.key] || '';
                                      if (!current) {
                                        setTempCantidad(prev => ({
                                          ...prev,
                                          [activeDia]: { ...prev[activeDia], [meal.key]: '0' }
                                        }));
                                      }
                                    }}
                                    min="0"
                                    step="0.01"
                                    className="border-2 border-[#D1E8D5] rounded-xl h-10 text-center"
                                  />

                                  <Select
                                    value={tempUnidad[activeDia]?.[meal.key] || 'unidad'}
                                    onValueChange={(val) => {
                                      setTempUnidad(prev => ({
                                        ...prev,
                                        [activeDia]: { ...prev[activeDia], [meal.key]: val }
                                      }));
                                    }}
                                  >
                                    <SelectTrigger className="w-32 border-2 border-[#D1E8D5] rounded-xl h-10">
                                      <SelectValue placeholder="Unidad" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {UNIDADES_PORCION.map(u => (
                                        <SelectItem key={u} value={u}>
                                          {u}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  <Button
                                    type="button"
                                    onClick={() => handleAddIngredient(activeDia, meal.key)}
                                    className="bg-[#2E8B57] hover:bg-[#1A3026] text-white font-black text-xs uppercase rounded-xl h-10 px-4"
                                  >
                                    Agregar
                                  </Button>
                                </div>
                              </div>

                              {dietaByDay[activeDia][meal.key].ingredientes.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {dietaByDay[activeDia][meal.key].ingredientes.map((ingrediente) => (
                                    <div
                                      key={ingrediente.id_alimento}
                                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F0FFF4] border border-[#D1E8D5] text-sm font-bold text-[#1A3026]"
                                    >
                                      <span>{ingrediente.nombre}</span>
                                      {ingrediente.porcion_estandar && (
                                        <span className="text-xs text-gray-600 font-normal">
                                          ({ingrediente.porcion_estandar})
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveIngredient(activeDia, meal.key, ingrediente.id_alimento)}
                                        className="text-[#2E8B57] hover:text-[#1A3026]"
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <Textarea
                                placeholder="Descripción de la comida (ej. Huevo con apio y ajo)..."
                                className="border-2 border-[#D1E8D5] rounded-xl min-h-[90px] text-sm p-4 bg-[#F8FFF9]/30"
                                value={dietaByDay[activeDia][meal.key].desc}
                                onChange={(e) =>
                                  setDietaByDay(prev => ({
                                    ...prev,
                                    [activeDia]: {
                                      ...prev[activeDia],
                                      [meal.key]: { ...prev[activeDia][meal.key], desc: e.target.value }
                                    }
                                  }))
                                }
                              />

                              {!meal.label.includes('Colación') && (
                                <div className="space-y-1">
                                  <Label className="text-xs font-black uppercase text-gray-400 tracking-wider">Horario</Label>
                                  <Input
                                    type="time"
                                    value={dietaByDay[activeDia][meal.key].horario || ''}
                                    onChange={(e) => handleHoraChange(activeDia, meal.key, e.target.value)}
                                    className="border-2 border-[#D1E8D5] rounded-xl h-12"
                                  />
                                </div>
                              )}

                              <div className="grid grid-cols-3 gap-2 text-sm text-gray-500 uppercase font-bold text-center">
                                <p className="flex items-center justify-center gap-1">
                                  <Tag size={12} className="text-[#2E8B57]" />
                                  {dietaByDay[activeDia][meal.key].categoria || '-'}
                                </p>
                                <p className="flex items-center justify-center gap-1">
                                  <Scale size={12} className="text-[#2E8B57]" />
                                  {dietaByDay[activeDia][meal.key].porcion || '-'}
                                </p>
                                <p className="flex items-center justify-center gap-1">
                                  <Flame size={12} className="text-[#2E8B57]" />
                                  {dietaByDay[activeDia][meal.key].cal100g ? `${dietaByDay[activeDia][meal.key].cal100g} kcal` : '-'}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {diasSinComidasEnModal.length > 0 && (
                        <p className="text-xs font-bold text-[#FF4444] uppercase tracking-wide">
                          Debes agregar al menos una comida en: {diasSinComidasEnModal.map(dia => diasSemana[dia]).join(', ')}
                        </p>
                      )}

                      <div className="flex flex-col md:flex-row gap-3 pt-6">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                          className="flex-1 border-2 border-[#D1E8D5] text-gray-400 font-black text-xs uppercase rounded-xl h-14"
                        >
                          Descartar
                        </Button>
                        <Button
                          type="submit"
                          disabled={loading || !selectedPaciente || diasSinComidasEnModal.length > 0}
                          className="flex-1 bg-[#2E8B57] hover:bg-[#1A3026] text-white font-black text-xs uppercase rounded-xl h-14"
                        >
                          {loading ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Asignar Plan al Paciente')}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>

                <style>{`
                  .custom-dialog-scroll::-webkit-scrollbar {
                    width: 6px;
                  }
                  .custom-dialog-scroll::-webkit-scrollbar-track {
                    background: transparent;
                  }
                  .custom-dialog-scroll::-webkit-scrollbar-thumb {
                    background: #D1E8D5;
                    border-radius: 10px;
                  }
                  .custom-dialog-scroll::-webkit-scrollbar-thumb:hover {
                    background: #3CB371;
                  }
                `}</style>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="relative max-w-2xl">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#2E8B57]" />
          <Input
            placeholder="BUSCAR PACIENTE POR NOMBRE O EMAIL..."
            value={searchQuery}
            onChange={handleSearch}
            className="w-full pl-14 py-5 bg-white border-2 border-[#D1E8D5] rounded-2xl focus:border-[#2E8B57] outline-none text-sm font-black tracking-widest uppercase placeholder:text-gray-400 shadow-sm transition-all"
          />
        </div>
        <div className="space-y-4">
          {filteredDietas.length === 0 ? (
            <div className="bg-white rounded-[2.5rem] border-2 border-[#D1E8D5] p-20 flex flex-col items-center justify-center text-center">
              <FileText className="h-10 w-10 text-[#D1E8D5] mb-4" />
              <h3 className="text-lg font-black text-[#1A3026] uppercase">No hay dietas activas</h3>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {filteredDietas.map((dieta) => {
                const porDia = groupByDay(dieta.dieta_detalle || []);

                return (
                  <AccordionItem value={dieta.id_dieta.toString()} key={dieta.id_dieta} className="border-b border-[#F0FFF4]">
                    <AccordionTrigger className="px-4 sm:px-6 py-5 hover:no-underline hover:bg-[#F8FFF9] transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full min-w-0">
                        <Avatar className="h-12 w-12 border-2 border-[#D1E8D5] rounded-2xl">
                          <AvatarImage
                            src={dieta.pacientes?.foto_perfil || ''}
                            alt={`${dieta.pacientes?.nombre || ''} ${dieta.pacientes?.apellido || ''}`}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-[#F0FFF4] text-[#2E8B57] font-black text-sm uppercase rounded-2xl">
                            {`${dieta.pacientes?.nombre?.[0] || ''}${dieta.pacientes?.apellido?.[0] || ''}`.trim() || 'NA'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-grow text-left min-w-0">
                          <p className="font-black text-[#1A3026] uppercase text-sm tracking-tight">
                            {dieta.pacientes.nombre} {dieta.pacientes.apellido}
                          </p>
                          <p className="text-xs font-black text-[#3CB371] uppercase">{dieta.nombre_dieta}</p>
                          <p className="text-xs text-gray-500">
                            Inicio: {new Date(dieta.fecha_inicio).toLocaleDateString('es-MX')}
                          </p>
                        </div>

                        <div className="w-full sm:w-auto flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 sm:justify-end sm:ml-auto">
                          <Button
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(dieta);
                            }}
                            className="w-full sm:w-auto border-2 border-[#D1E8D5] text-[#2E8B57] font-black text-[11px] sm:text-xs uppercase rounded-xl px-3 sm:px-6 h-10 flex items-center justify-center gap-2"
                          >
                            <Edit className="h-4 w-4" /> Editar
                          </Button>

                          <Button 
                            variant="outline" 
                            onClick={(e) => {
                              e.stopPropagation();
                              exportToPDF(dieta);
                            }}
                            className="w-full sm:w-auto border-2 border-[#D1E8D5] text-[#2E8B57] font-black text-[11px] sm:text-xs uppercase rounded-xl px-3 sm:px-6 h-10 flex items-center justify-center gap-2"
                          >
                            <Download className="h-4 w-4" /> Ver PDF
                          </Button>

                          <Button 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              eliminarDieta(dieta.id_dieta, `${dieta.pacientes.nombre} ${dieta.pacientes.apellido}`);
                            }}
                            className="w-full sm:w-auto border-2 border-[#FF4444] text-[#FF4444] font-black text-[11px] sm:text-xs uppercase rounded-xl px-3 sm:px-6 h-10 flex items-center justify-center gap-2 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" /> Eliminar
                          </Button>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6">
                      <div className="space-y-8">
                        {Object.keys(porDia)
                          .sort((a, b) => Number(a) - Number(b))
                          .map((diaKey) => {
                            const diaNum = Number(diaKey);
                            const detallesDia = porDia[diaNum].sort((a, b) => a.orden - b.orden);

                            return (
                              <div key={diaNum} className="space-y-4">
                                <h3 className="text-xl font-[900] text-[#2E8B57] uppercase tracking-wide">
                                  {diasSemana[diaNum]}
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                                  {detallesDia.map((detalle: any, idx: number) => (
                                    <div key={idx} className="p-5 rounded-2xl border-2 border-[#F0FFF4] bg-[#F8FFF9] shadow-sm hover:shadow-md transition-all">
                                      <p className="font-[900] text-base text-[#1A3026] uppercase mb-3 flex items-center gap-1">
                                        {detalle.tipo_comida === 'Desayuno' && <Coffee size={14} className="text-amber-600" />}
                                        {detalle.tipo_comida === 'Colación 1' && <Apple size={14} className="text-green-600" />}
                                        {detalle.tipo_comida === 'Almuerzo' && <Sun size={14} className="text-orange-600" />}
                                        {detalle.tipo_comida === 'Colación 2' && <Apple size={14} className="text-green-600" />}
                                        {detalle.tipo_comida === 'Cena' && <Moon size={14} className="text-indigo-600" />}
                                        {detalle.tipo_comida}
                                      </p>
                                      <p className="text-base font-medium text-gray-700 mb-3">
                                        "{detalle.descripcion}"
                                      </p>
                                      <div className="text-sm text-gray-500 space-y-1 uppercase font-bold text-center">
                                        {detalle.categoria && (
                                          <p className="flex items-center gap-1">
                                            <Tag size={12} className="text-[#2E8B57]" /> {detalle.categoria}
                                          </p>
                                        )}
                                        {detalle.porcion_sugerida && (
                                          <p className="flex items-center gap-1">
                                            <Scale size={12} className="text-[#2E8B57]" /> {detalle.porcion_sugerida}
                                          </p>
                                        )}
                                        {getDetalleCalorias(detalle) > 0 && (
                                          <p className="flex items-center gap-1">
                                            <Flame size={12} className="text-[#2E8B57]" /> ~{getDetalleCalorias(detalle)} kcal estimadas
                                          </p>
                                        )}
                                        {detalle.horario && (
                                          <p className="flex items-center justify-center gap-1">
                                            <Clock size={12} className="text-[#2E8B57]" /> {convertTo12Hour(detalle.horario)}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </div>
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-md max-h-[90vh] overflow-y-auto rounded-[2rem] sm:rounded-[2.5rem] border-2 border-[#D1E8D5] bg-white p-4 sm:p-6 md:p-10 text-center">
            <DialogHeader>
              <DialogTitle className="text-3xl font-[900] text-[#FF4444] uppercase tracking-[2px] mb-6">
                Eliminar Plan Nutricional
              </DialogTitle>
            </DialogHeader>
            <p className="text-lg text-[#1A3026] mb-8">
              ¿Estás seguro de eliminar el plan de {dietaToDelete?.nombre || 'este paciente'}?<br/>
              Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-center gap-4">
              <Button 
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                className="border-2 border-[#D1E8D5] text-gray-600 font-black text-sm uppercase rounded-xl px-8 py-4 hover:bg-gray-50"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleConfirmDelete}
                className="bg-[#FF4444] hover:bg-[#d32f2f] text-white font-black text-sm uppercase rounded-xl px-8 py-4"
              >
                Eliminar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function groupByDay(detalles: any[]) {
  const groups: { [key: number]: any[] } = {};
  detalles.forEach(d => {
    if (!groups[d.dia_semana]) groups[d.dia_semana] = [];
    groups[d.dia_semana].push(d);
  });
  return groups;
}