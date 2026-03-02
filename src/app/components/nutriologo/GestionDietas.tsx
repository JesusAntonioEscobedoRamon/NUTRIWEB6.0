import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Textarea } from '@/app/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/app/components/ui/dialog';
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

// ANIMATED LOADING SCREEN
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

// COMPONENTE PRINCIPAL
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
  const [selectedDia, setSelectedDia] = useState<number>(1);

  const [isEditing, setIsEditing] = useState(false);
  const [editingDietaId, setEditingDietaId] = useState<number | null>(null);
  const [editingDietaData, setEditingDietaData] = useState<any>(null);

  const [dietaData, setDietaData] = useState<DietaData>(createEmptyDietaData());
  const [selectedIngredientByMeal, setSelectedIngredientByMeal] = useState<Record<MealKey, string>>(createMealIngredientSelection());

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dietaToDelete, setDietaToDelete] = useState<any>(null);

  const [nutriologoEmail, setNutriologoEmail] = useState<string>(''); // Email del nutriólogo

  const diasSemana = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  const fetchData = async () => {
    if (!user?.nutriologoId) {
      toast.error('No se encontró ID de nutriólogo');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Traer email del nutriólogo
      const { data: nutriData, error: nutriError } = await supabase
        .from('nutriologos')
        .select('correo')
        .eq('id_nutriologo', user.nutriologoId)
        .single();

      if (nutriError) throw nutriError;
      setNutriologoEmail(nutriData?.correo || 'nutriologo@nutriu.com');

      // Relación pacientes-nutriólogo (solo activa)
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

      // Dietas solo de pacientes activos
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
        .select('id_paciente, nombre, apellido, foto_perfil')
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
        pacientes: pacientesMap[dieta.id_paciente] || { nombre: 'Desconocido', apellido: '' },
      }));

      setDietas(enriched);

    } catch (err: any) {
      console.error('Error cargando datos:', err);
      toast.error('Error al cargar datos: ' + (err.message || 'Intenta de nuevo'));
    } finally {
      setLoading(false);
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

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredPacientes.length === 1) {
        const unico = filteredPacientes[0];
        setSelectedPaciente(unico.id_paciente.toString());
        toast.success(`Paciente seleccionado: ${unico.nombre} ${unico.apellido}`);
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

  const handleAddIngredient = (meal: MealKey) => {
    const alimentoId = selectedIngredientByMeal[meal];
    if (!alimentoId) return;

    const alimento = alimentos.find(a => a.id_alimento.toString() === alimentoId);
    if (!alimento) return;

    setDietaData(prev => {
      const currentIngredientes = prev[meal].ingredientes || [];
      const alreadySelected = currentIngredientes.some(i => i.id_alimento === alimento.id_alimento);
      if (alreadySelected) return prev;

      const updatedIngredientes = [
        ...currentIngredientes,
        {
          id_alimento: alimento.id_alimento,
          nombre: alimento.nombre,
          descripcion: alimento.descripcion,
          categoria: alimento.categoria,
          porcion_estandar: alimento.porcion_estandar,
          calorias_por_100g: Number(alimento.calorias_por_100g || 0),
        }
      ];

      const autoData = buildMealFromIngredientes(updatedIngredientes);

      return {
        ...prev,
        [meal]: {
          ...prev[meal],
          ...autoData,
          ingredientes: updatedIngredientes,
        }
      };
    });

    setSelectedIngredientByMeal(prev => ({ ...prev, [meal]: '' }));
  };

  const handleRemoveIngredient = (meal: MealKey, alimentoId: number) => {
    setDietaData(prev => {
      const updatedIngredientes = prev[meal].ingredientes.filter(i => i.id_alimento !== alimentoId);
      const autoData = buildMealFromIngredientes(updatedIngredientes);

      return {
        ...prev,
        [meal]: {
          ...prev[meal],
          ...autoData,
          ingredientes: updatedIngredientes,
        }
      };
    });
  };

  const handleHoraChange = (meal: MealKey, horario: string) => {
    setDietaData(prev => ({
      ...prev,
      [meal]: { ...prev[meal], horario }
    }));
  };

  const openEditDialog = (dieta: any) => {
    setIsEditing(true);
    setEditingDietaData(dieta);
    setSelectedPaciente(dieta.id_paciente.toString());
    setSelectedDia(1);
    
    const emptyData = createEmptyDietaData();
    setSelectedIngredientByMeal(createMealIngredientSelection());

    const detallesDia = dieta.dieta_detalle?.filter((d: any) => d.dia_semana === 1) || [];

    detallesDia.forEach((det: any) => {
      const keyMap: Record<string, keyof typeof emptyData> = {
        'Desayuno': 'desayuno',
        'Colación 1': 'colacion1',
        'Almuerzo': 'almuerzo',
        'Colación 2': 'colacion2',
        'Cena': 'cena',
        'Snack': 'snack',
      };

      const key = keyMap[det.tipo_comida];
      if (key) {
        emptyData[key] = {
          desc: det.descripcion || '',
          categoria: det.categoria || '',
          porcion: det.porcion_sugerida || '',
          cal100g: det.calorias_por_100g?.toString() || '',
          horario: det.horario || emptyData[key].horario,
          ingredientes: [],
        };
      }
    });

    setDietaData(emptyData);
    setIsDialogOpen(true);
  };

  const eliminarDieta = async (dietaId: number, pacienteNombre: string) => {
    setDietaToDelete({ id: dietaId, nombre: pacienteNombre });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!dietaToDelete) return;

    try {
      // Eliminar detalles primero
      const { error: deleteDetalles } = await supabase
        .from('dieta_detalle')
        .delete()
        .eq('id_dieta', dietaToDelete.id);

      if (deleteDetalles) throw deleteDetalles;

      // Eliminar dieta
      const { error: deleteDieta } = await supabase
        .from('dietas')
        .delete()
        .eq('id_dieta', dietaToDelete.id);

      if (deleteDieta) throw deleteDieta;

      toast.success('Plan nutricional eliminado correctamente');
      await fetchData(); // Refrescar lista
    } catch (err: any) {
      console.error('Error eliminando dieta:', err);
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
    const tieneComidas = Object.values(dietaData).some(item => item.desc.trim());
    if (!tieneComidas) return toast.error('Selecciona o escribe al menos una comida');

    setLoading(true);

    try {
      let dietaId: number;

      if (isEditing && editingDietaData) {
        dietaId = editingDietaData.id_dieta;
      } else {
        const { data: existente, error: existenteError } = await supabase
          .from('dietas')
          .select('id_dieta')
          .eq('id_nutriologo', user?.nutriologoId)
          .eq('id_paciente', parseInt(selectedPaciente))
          .eq('activa', true)
          .maybeSingle();

        if (existenteError) throw existenteError;

        if (existente) {
          dietaId = existente.id_dieta;
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
        .eq('id_dieta', dietaId)
        .eq('dia_semana', selectedDia);

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

      const detalles = comidasConfig
        .filter(c => dietaData[c.key as keyof typeof dietaData].desc.trim())
        .map((c, index) => ({
          id_dieta: dietaId,
          dia_semana: selectedDia,
          tipo_comida: c.tipo,
          descripcion: dietaData[c.key as keyof typeof dietaData].desc.trim(),
          categoria: normalizeCategoriaForDietaDetalle(dietaData[c.key as keyof typeof dietaData].categoria),
          porcion_sugerida: dietaData[c.key as keyof typeof dietaData].porcion || null,
          calorias_por_100g: parseFloat(dietaData[c.key as keyof typeof dietaData].cal100g) || null,
          horario: dietaData[c.key as keyof typeof dietaData].horario || horarioPorDefecto[c.key] || null,
          orden: index + 1,
        }));

      if (detalles.length > 0) {
        const { error: detalleError } = await supabase.from('dieta_detalle').insert(detalles);
        if (detalleError) throw detalleError;
      }

      toast.success(isEditing ? '¡Plan actualizado!' : '¡Plan asignado!');
      setIsDialogOpen(false);

      setDietaData(createEmptyDietaData());
      setSelectedIngredientByMeal(createMealIngredientSelection());

      setSelectedPaciente('');
      setSelectedDia(1);
      setSearchQuery('');
      setAlimentosSearchQuery('');
      setIsEditing(false);
      setEditingDietaData(null);

      await fetchData();
    } catch (err: any) {
      console.error('Error al guardar:', err);
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

    const verde = [240, 255, 244]; // Verde claro #F0FFF4 para fondo
    const verdeHeader = [232, 245, 233]; // Verde más suave #E8F5E9 para header
    const negro = [26, 48, 38]; // #1A3026

    doc.setFillColor(...verde);
    doc.rect(0, 0, 297, 40, 'F');

    doc.setFontSize(26);
    doc.setTextColor(46, 139, 87); // #2E8B57
    doc.setFont('helvetica', 'bold');
    doc.text('NUTRI U', 148.5, 25, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(...negro);
    let y = 50;

    doc.text(`Nombre del Paciente: ${dieta.pacientes.nombre || ''} ${dieta.pacientes.apellido || ''}`, 20, y); y += 8;
    doc.text(`Nutriólogo: ${user?.nombre || ''} ${user?.apellido || ''}`, 20, y); y += 8;

    // Obtener horarios para headers
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
        const total = detalles.reduce((sum: number, d: any) => sum + Number(d.calorias_por_100g || 0), 0);
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

    // Calcular ancho total y centrar perfectamente
    const columnWidths = [25, 45, 45, 45, 45, 45, 35]; // Ajustado para nueva columna
    const totalTableWidth = columnWidths.reduce((a, b) => a + b, 0);
    const leftMargin = (297 - totalTableWidth) / 2; // Centrado exacto en la hoja A4 landscape (297 mm ancho)

    autoTable(doc, {
      startY: y + 10,
      head,
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 4, overflow: 'linebreak', halign: 'left', lineWidth: 0.1 },
      headStyles: { fillColor: verdeHeader, textColor: negro, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: verde },
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
    doc.setFontSize(10);
    doc.text(`Correo del Nutriólogo: ${nutriologoEmail || 'nutriologo@nutriu.com'}`, 148.5, finalY + 15, { align: 'center' });
    doc.text('© +52 (653) 536 7647 • +52 (662) 146 4154', 148.5, finalY + 22, { align: 'center' });
    doc.text('Av. Kino y Calle 7 #1/2 Col. Médica, San Luis Río Colorado, Sonora', 148.5, finalY + 29, { align: 'center' });
    doc.text('f @nutlotbhm', 148.5, finalY + 36, { align: 'center' });

    doc.save(`Plan_${dieta.pacientes.nombre || ''}_${dieta.pacientes.apellido || ''}_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF generado');
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
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full md:w-auto bg-[#2E8B57] hover:bg-[#1A3026] text-white font-black py-6 px-8 rounded-2xl shadow-lg transition-all uppercase tracking-widest text-sm flex items-center justify-center gap-2">
                  <Plus className="h-5 w-5" />
                  Nueva Dieta
                </Button>
              </DialogTrigger>

            <DialogContent className="max-w-4xl max-h-[90vh] rounded-[2.5rem] border-2 border-[#D1E8D5] bg-white p-0 overflow-hidden">
              <div className="custom-dialog-scroll overflow-y-auto max-h-[90vh]">
                <div className="p-6 md:p-10">
                  <DialogHeader>
                    <DialogTitle className="text-3xl font-[900] text-[#2E8B57] uppercase tracking-[2px]">
                      {isEditing ? 'Editar Plan Nutricional' : 'Crear Plan Nutricional'}
                    </DialogTitle>
                    <DialogDescription className="text-base text-gray-500 mt-2">
                      {isEditing 
                        ? 'Modifica las comidas del día seleccionado para este paciente.' 
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
                      <Select value={selectedPaciente} onValueChange={setSelectedPaciente}>
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

                    <div className="space-y-2">
                      <Label className="text-xs font-black uppercase text-gray-400 tracking-wider">Seleccionar Día</Label>
                      <Select value={selectedDia.toString()} onValueChange={(val) => setSelectedDia(parseInt(val))}>
                        <SelectTrigger className="border-2 border-[#D1E8D5] rounded-xl h-12">
                          <SelectValue placeholder="Elige un día" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-2 border-[#D1E8D5] custom-dialog-scroll">
                          {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((dia, idx) => (
                            <SelectItem key={idx + 1} value={(idx + 1).toString()} className="font-bold text-sm uppercase">
                              {dia}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-base font-[900] text-[#2E8B57] uppercase tracking-wider border-b-2 border-[#D1E8D5] pb-2">
                        Selecciona las comidas del día
                      </h3>
                      
                      {mealModules.map((meal) => (
                        <div key={meal.key} className="space-y-4 p-5 border-2 border-[#D1E8D5] rounded-3xl bg-white shadow-sm">
                          <div className="flex items-center gap-2">
                            <meal.icon size={18} className={meal.color} />
                            <Label className="text-base font-black uppercase text-[#1A3026]">{meal.label}</Label>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
                            <Select
                              value={selectedIngredientByMeal[meal.key]}
                              onValueChange={(val) => setSelectedIngredientByMeal(prev => ({ ...prev, [meal.key]: val }))}
                            >
                              <SelectTrigger className="border-2 border-[#D1E8D5] rounded-xl h-12">
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
                                      {alimento.nombre} ({alimento.calorias_por_100g} kcal/100g)
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>

                            <Button
                              type="button"
                              onClick={() => handleAddIngredient(meal.key)}
                              className="bg-[#2E8B57] hover:bg-[#1A3026] text-white font-black text-xs uppercase rounded-xl h-12 px-5"
                            >
                              Agregar
                            </Button>
                          </div>

                          {dietaData[meal.key].ingredientes.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {dietaData[meal.key].ingredientes.map((ingrediente) => (
                                <div
                                  key={ingrediente.id_alimento}
                                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F0FFF4] border border-[#D1E8D5] text-sm font-bold text-[#1A3026]"
                                >
                                  <span>{ingrediente.nombre}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveIngredient(meal.key, ingrediente.id_alimento)}
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
                            value={dietaData[meal.key].desc}
                            onChange={(e) => setDietaData({
                              ...dietaData,
                              [meal.key]: { ...dietaData[meal.key], desc: e.target.value }
                            })}
                            required
                          />

                          {!meal.label.includes('Colación') && (
                            <div className="space-y-1">
                              <Label className="text-xs font-black uppercase text-gray-400 tracking-wider">Horario</Label>
                              <Input 
                                type="time" 
                                value={dietaData[meal.key].horario || ''} 
                                onChange={(e) => handleHoraChange(meal.key, e.target.value)} 
                                className="border-2 border-[#D1E8D5] rounded-xl h-12"
                              />
                            </div>
                          )}

                          <div className="grid grid-cols-3 gap-2 text-sm text-gray-500 uppercase font-bold text-center">
                            <p className="flex items-center justify-center gap-1">
                              <Tag size={12} className="text-[#2E8B57]" /> 
                              {dietaData[meal.key].categoria || '-'}
                            </p>
                            <p className="flex items-center justify-center gap-1">
                              <Scale size={12} className="text-[#2E8B57]" /> 
                              {dietaData[meal.key].porcion || '-'}
                            </p>
                            <p className="flex items-center justify-center gap-1">
                              <Flame size={12} className="text-[#2E8B57]" /> 
                              {dietaData[meal.key].cal100g ? `${dietaData[meal.key].cal100g} kcal` : '-'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

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
                        disabled={loading}
                        className="flex-1 bg-[#2E8B57] hover:bg-[#1A3026] text-white font-black text-xs uppercase rounded-xl h-14"
                      >
                        {loading ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Asignar Plan al Paciente')}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>

              <style jsx global>{`
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

        {/* Buscador Estilizado */}
        <div className="relative max-w-2xl">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#2E8B57]" />
          <Input
            placeholder="BUSCAR PACIENTE POR NOMBRE O EMAIL..."
            value={searchQuery}
            onChange={handleSearch}
            className="w-full pl-14 py-5 bg-white border-2 border-[#D1E8D5] rounded-2xl focus:border-[#2E8B57] outline-none text-sm font-black tracking-widest uppercase placeholder:text-gray-400 shadow-sm transition-all"
          />
        </div>

        {/* Botón de Editar fuera de los pacientes */}
        <div className="flex justify-end">
          <Button
            onClick={() => {
              if (filteredDietas.length > 0) {
                openEditDialog(filteredDietas[0]);
              } else {
                toast.warning('No hay dietas para editar');
              }
            }}
            className="bg-[#2E8B57] hover:bg-[#1A3026] text-white font-black py-4 px-6 rounded-xl text-sm uppercase tracking-widest flex items-center gap-2 shadow-lg"
          >
            <Edit className="h-4 w-4" />
            Editar Plan
          </Button>
        </div>

        {/* Lista de dietas con Accordion */}
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
                    <AccordionTrigger className="px-6 py-5 hover:no-underline hover:bg-[#F8FFF9] transition-colors">
                      <div className="flex items-center gap-4 w-full">
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
                        <div className="flex-grow text-left">
                          <p className="font-black text-[#1A3026] uppercase text-sm tracking-tight">
                            {dieta.pacientes.nombre} {dieta.pacientes.apellido}
                          </p>
                          <p className="text-xs font-black text-[#3CB371] uppercase">{dieta.nombre_dieta}</p>
                          <p className="text-xs text-gray-500">
                            Inicio: {new Date(dieta.fecha_inicio).toLocaleDateString('es-MX')}
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <Button 
                            variant="outline" 
                            onClick={(e) => {
                              e.stopPropagation();
                              exportToPDF(dieta);
                            }}
                            className="border-2 border-[#D1E8D5] text-[#2E8B57] font-black text-xs uppercase rounded-xl px-6 h-10 flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" /> Exportar PDF
                          </Button>

                          {/* Botón de eliminar dieta */}
                          <Button 
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              eliminarDieta(dieta.id_dieta, `${dieta.pacientes.nombre} ${dieta.pacientes.apellido}`);
                            }}
                            className="border-2 border-[#FF4444] text-[#FF4444] font-black text-xs uppercase rounded-xl px-6 h-10 flex items-center gap-2 hover:bg-red-50"
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
                                        {detalle.calorias_por_100g && (
                                          <p className="flex items-center gap-1">
                                            <Flame size={12} className="text-[#2E8B57]" /> ~{detalle.calorias_por_100g} kcal/100g
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

        {/* Modal personalizado de eliminar */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="rounded-[2.5rem] border-2 border-[#D1E8D5] bg-white p-10 max-w-md text-center">
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