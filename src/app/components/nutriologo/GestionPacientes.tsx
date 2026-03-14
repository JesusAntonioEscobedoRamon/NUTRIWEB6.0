import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/app/components/ui/dialog';
import { Badge } from '@/app/components/ui/badge';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/app/components/ui/accordion';
import { useAuth } from '@/app/context/useAuth';
import { supabase } from '@/app/context/supabaseClient';
import { Search, Award, TrendingUp, User, Activity, Users, Save } from 'lucide-react';
import { toast } from 'sonner';
import {ImageWithFallback} from '@/app/components/figma/ImageWithFallback';
import { dbgGroup, dbgGroupEnd, dbgLog, dbgOk, dbgWarn, dbgError } from '@/utils/debug';

const formatPoints = (value: number) => Number(value || 0).toLocaleString('es-MX');
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
            <Users size={80} strokeWidth={1.5} />
          </div>
        </div>
        
        <div 
          ref={textRef}
          className="text-[#2E8B57] font-bold text-2xl mb-6"
        >
          Cargando lista de pacientes...
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

export function GestionPacientes() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaciente, setSelectedPaciente] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPeso, setEditPeso] = useState('');
  const [editAltura, setEditAltura] = useState('');
  const [editObjetivo, setEditObjetivo] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!user?.nutriologoId) {
      setLoading(false);
      toast.error('No se detectó ID de nutriólogo');
      return;
    }

    const fetchPacientes = async () => {
      dbgGroup('screen', `GestionPacientes — nutriologoId=${user.nutriologoId}`);
      setLoading(true);

      // Safety: si la DB no responde en 15s, desbloqueamos la UI
      const timeoutId = setTimeout(() => {
        dbgError('GestionPacientes: timeout 15s — desbloqueo forzado');
        console.error('[NutriU] GestionPacientes: timeout esperando datos de Supabase. Verifica conexión y API key.');
        setLoading(false);
      }, 15000);

      try {
        dbgLog('Cargando relaciones paciente_nutriologo...');
        const { data: relaciones, error: errRel } = await supabase
          .from('paciente_nutriologo')
          .select('id_paciente')
          .eq('id_nutriologo', Number(user.nutriologoId))
          .eq('activo', true);

        if (errRel) {
          dbgError('Error paciente_nutriologo', errRel);
          throw errRel;
        }

        dbgLog(`Relaciones encontradas: ${relaciones?.length ?? 0}`);

        if (!relaciones?.length) {
          dbgWarn('Sin pacientes asignados a este nutriólogo');
          setPacientes([]);
          clearTimeout(timeoutId);
          setLoading(false);
          dbgGroupEnd();
          return;
        }

        const pacienteIds = relaciones.map(r => r.id_paciente);

        const { data: pacientesData, error: errPac } = await supabase
          .from('pacientes')
          .select(`
            id_paciente,
            nombre,
            apellido,
            correo,
            fecha_nacimiento,
            peso,
            altura,
            objetivo,
            foto_perfil,
            puntos_paciente!inner (puntos_totales)
          `)
          .in('id_paciente', pacienteIds);

        if (errPac) throw errPac;
        const pacientesConFotos = await Promise.all(
          (pacientesData || []).map(async (p) => {
            let fotoUrl = 'usu.webp'; // fallback

            if (p.foto_perfil && p.foto_perfil.trim() !== '') {
              const pathCompleto = p.foto_perfil; // ej: perfiles_mobile/1771301876297.jpeg
              const { data } = supabase.storage
                .from('perfiles')
                .getPublicUrl(pathCompleto);

              if (data?.publicUrl) {
                fotoUrl = data.publicUrl;
              } else {
              }
            }

            const nacimiento = new Date(p.fecha_nacimiento || Date.now());
            const hoy = new Date();
            const edad = hoy.getFullYear() - nacimiento.getFullYear();

            return {
              id: p.id_paciente,
              nombre: p.nombre,
              apellido: p.apellido,
              email: p.correo,
              edad,
              peso: p.peso || 0,
              altura: p.altura || 0,
              objetivo: p.objetivo || 'Sin objetivo definido',
              foto_perfil: fotoUrl,
              puntos: p.puntos_paciente?.puntos_totales || 0,
              caloriasConsumidas: [1800, 1900, 1750, 2000, 1850, 2100, 1950],
              metaCalorias: 2000,
              fechaRegistro: new Date().toLocaleDateString('es-MX')
            };
          })
        );

        dbgOk(`Pacientes cargados: ${pacientesConFotos.length}`);
        setPacientes(pacientesConFotos);
      } catch (err: any) {
        dbgError('fetchPacientes error', err);
        console.error('[NutriU] GestionPacientes error:', err?.message ?? err);
        toast.error('No se pudieron cargar los pacientes');
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
        dbgGroupEnd();
      }
    };

    fetchPacientes();
  }, [user?.nutriologoId]);

  const pacientesFiltrados = pacientes.filter(p => 
    p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calcularIMC = (peso: number, altura: number) => {
    if (!altura || altura === 0) return 0;
    const imc = peso / Math.pow(altura / 100, 2);
    return imc.toFixed(1);
  };

  const categoriaIMC = (imc: number) => {
    if (imc < 18.5) return { label: 'Bajo peso', color: 'bg-blue-100 text-blue-700' };
    if (imc < 25) return { label: 'Normal', color: 'bg-[#F0FFF4] text-[#2E8B57] border-[#D1E8D5]' };
    if (imc < 30) return { label: 'Sobrepeso', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'Obesidad', color: 'bg-red-100 text-red-700' };
  };
  const handleVerDetalles = (paciente: any) => {
    setSelectedPaciente(paciente);
    setEditPeso(paciente.peso.toString());
    setEditAltura(paciente.altura.toString());
    setEditObjetivo(paciente.objetivo);
    setHasChanges(false);
    setDialogOpen(true);
  };
  useEffect(() => {
    if (selectedPaciente) {
      const pesoChanged = editPeso !== selectedPaciente.peso.toString();
      const alturaChanged = editAltura !== selectedPaciente.altura.toString();
      const objetivoChanged = editObjetivo !== selectedPaciente.objetivo;
      
      setHasChanges(pesoChanged || alturaChanged || objetivoChanged);
    }
  }, [editPeso, editAltura, editObjetivo, selectedPaciente]);
  const handleGuardarCambios = async () => {
    if (!selectedPaciente) return;

    const pesoNum = parseFloat(editPeso);
    const alturaNum = parseFloat(editAltura);

    if (isNaN(pesoNum) || pesoNum < 0 || pesoNum > 700) {
      toast.error('Peso debe estar entre 0 y 700 kg');
      return;
    }
    if (isNaN(alturaNum) || alturaNum < 0 || alturaNum > 300) {
      toast.error('Altura debe estar entre 0 y 300 cm');
      return;
    }

    setEditLoading(true);

    try {
      const { error } = await supabase
        .from('pacientes')
        .update({
          peso: pesoNum,
          altura: alturaNum,
          objetivo: editObjetivo.trim() || null
        })
        .eq('id_paciente', selectedPaciente.id);

      if (error) throw error;

      setPacientes(prev =>
        prev.map(p =>
          p.id === selectedPaciente.id
            ? { ...p, peso: pesoNum, altura: alturaNum, objetivo: editObjetivo.trim() || 'Sin objetivo definido' }
            : p
        )
      );
      setSelectedPaciente(prev => ({
        ...prev,
        peso: pesoNum,
        altura: alturaNum,
        objetivo: editObjetivo.trim() || 'Sin objetivo definido'
      }));

      setHasChanges(false);
      toast.success('Datos actualizados correctamente');
    } catch (err: any) {
      toast.error('No se pudo actualizar: ' + (err.message || 'Intenta de nuevo'));
    } finally {
      setEditLoading(false);
    }
  };
  const handleCancel = () => {
    if (selectedPaciente) {
      setEditPeso(selectedPaciente.peso.toString());
      setEditAltura(selectedPaciente.altura.toString());
      setEditObjetivo(selectedPaciente.objetivo);
      setHasChanges(false);
    }
  };
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedPaciente(null);
    setHasChanges(false);
  };

  if (loading) {
    return <AnimatedLoadingScreen />;
  }

  return (
    <div className="min-h-screen p-6 md:p-10 font-sans bg-[#F8FFF9] space-y-10">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-2">
          <div>
            <div className="inline-flex flex-col items-start">
              <h1 className="text-4xl font-[900] text-[#2E8B57] tracking-[4px] uppercase">
                Gestión de Pacientes
              </h1>
              <div className="w-16 h-1.5 bg-[#3CB371] rounded-full mt-2" />
            </div>
            <p className="text-[#3CB371] font-bold text-lg mt-4 uppercase tracking-[2px]">
              Gestiona la información de tus pacientes
            </p>
          </div>
        </div>
        <div className="relative max-w-2xl">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#2E8B57]" />
          <Input
            placeholder="BUSCAR PACIENTE POR NOMBRE O EMAIL..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-14 py-5 bg-white border-2 border-[#D1E8D5] rounded-2xl focus:border-[#2E8B57] outline-none text-sm font-black tracking-widest uppercase placeholder:text-gray-400 shadow-sm transition-all"
          />
        </div>
        <div className="bg-white rounded-[2.5rem] border-2 border-[#D1E8D5] shadow-sm overflow-hidden">
          <div className="p-8 border-b border-[#F0FFF4] flex items-center justify-between bg-[#F8FFF9]/50">
            <h3 className="text-lg font-[900] text-[#1A3026] uppercase tracking-[2px]">
              Pacientes Activos ({pacientesFiltrados.length})
            </h3>
            <Activity className="text-[#3CB371]" size={20} />
          </div>
          
          <div className="overflow-x-auto p-4">
            <Table>
              <TableHeader>
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-xs font-black uppercase text-gray-500 tracking-wider">Paciente</TableHead>
                  <TableHead className="text-xs font-black uppercase text-gray-500 tracking-wider">Edad</TableHead>
                  <TableHead className="text-xs font-black uppercase text-gray-500 tracking-wider">Peso/Altura</TableHead>
                  <TableHead className="text-xs font-black uppercase text-gray-500 tracking-wider">IMC</TableHead>
                  <TableHead className="text-xs font-black uppercase text-gray-500 tracking-wider">Objetivo</TableHead>
                  <TableHead className="text-xs font-black uppercase text-gray-500 tracking-wider">Puntos</TableHead>
                  <TableHead className="text-right text-xs font-black uppercase text-gray-500 tracking-wider">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pacientesFiltrados.map((paciente) => {
                  const imc = Number(calcularIMC(paciente.peso, paciente.altura));
                  const categoria = categoriaIMC(imc);
                  return (
                    <TableRow 
                      key={paciente.id} 
                      onClick={() => handleVerDetalles(paciente)}
                      className="border-b border-[#F0FFF4] hover:bg-[#F8FFF9] transition-colors group cursor-pointer"
                    >
                      <TableCell className="py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-[#F0FFF4] rounded-full overflow-hidden border-2 border-[#D1E8D5] flex-shrink-0">
                            <ImageWithFallback
                              src={paciente.foto_perfil}
                              alt={`${paciente.nombre} ${paciente.apellido}`}
                              className="w-full h-full object-cover"
                              fallbackSrc="usu.webp"
                            />
                          </div>
                          <div>
                            <p className="font-black text-[#1A3026] uppercase text-sm tracking-tight">
                              {paciente.nombre} {paciente.apellido}
                            </p>
                            <p className="text-xs font-bold text-gray-400">{paciente.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-gray-600 text-sm">{paciente.edad} AÑOS</TableCell>
                      <TableCell className="font-bold text-gray-600 text-sm">{paciente.peso}KG / {paciente.altura}CM</TableCell>
                      <TableCell>
                        <Badge className={`${categoria.color} border-2 px-3 py-1 rounded-xl font-black text-[11px] uppercase tracking-tighter shadow-none`}>
                          {imc} - {categoria.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-black text-[#2E8B57] text-xs uppercase max-w-[120px] truncate" title={paciente.objetivo}>
                        {paciente.objetivo}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div className="bg-yellow-50 p-1.5 rounded-lg border border-yellow-100">
                            <Award className="h-3.5 w-3.5 text-yellow-500" />
                          </div>
                          <span className="font-black text-[#1A3026] text-base">{formatPoints(paciente.puntos)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVerDetalles(paciente);
                          }}
                          className="border-2 border-[#D1E8D5] text-[#2E8B57] font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#F0FFF4] hover:border-[#2E8B57] transition-all px-4"
                        >
                          Ver Detalles
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {pacientesFiltrados.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-gray-500">
                      No se encontraron pacientes asignados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-3xl max-h-[92vh] rounded-[2rem] sm:rounded-[2.5rem] border-2 border-[#D1E8D5] bg-white p-0 overflow-hidden font-sans">
          <div className="custom-dialog-scroll overflow-y-auto max-h-[92vh] p-4 sm:p-6 md:p-8" onClick={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle className="text-3xl font-[900] text-[#2E8B57] uppercase tracking-[2px] mb-4 text-left flex items-center gap-4">
                <div className="h-16 w-16 bg-[#F0FFF4] rounded-full overflow-hidden border-2 border-[#D1E8D5] flex-shrink-0">
                  <ImageWithFallback
                    src={selectedPaciente?.foto_perfil}
                    alt={`${selectedPaciente?.nombre} ${selectedPaciente?.apellido}`}
                    className="w-full h-full object-cover"
                    fallbackSrc="usu.webp"
                  />
                </div>
                Perfil de {selectedPaciente?.nombre} {selectedPaciente?.apellido}
              </DialogTitle>
            </DialogHeader>
            {selectedPaciente && (
              <div className="space-y-8 mt-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="bg-[#F8FFF9] p-3 rounded-xl border border-[#D1E8D5] min-h-[80px] flex flex-col">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">EMAIL</p>
                    <p className="text-sm font-black text-[#1A3026] break-all">{selectedPaciente.email}</p>
                  </div>

                  <div className="bg-[#F8FFF9] p-3 rounded-xl border border-[#D1E8D5] min-h-[80px] flex flex-col">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">EDAD</p>
                    <p className="text-sm font-black text-[#1A3026]">{selectedPaciente.edad} años</p>
                  </div>

                  <div className="bg-[#F8FFF9] p-3 rounded-xl border border-[#D1E8D5] min-h-[80px] flex flex-col">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">IMC</p>
                    <Badge className={`${categoriaIMC(Number(calcularIMC(parseFloat(editPeso), parseFloat(editAltura)))).color} border-2 px-3 py-1 rounded-xl font-black text-[11px] uppercase tracking-tighter shadow-none`}>
                      {calcularIMC(parseFloat(editPeso), parseFloat(editAltura))} - {categoriaIMC(Number(calcularIMC(parseFloat(editPeso), parseFloat(editAltura)))).label}
                    </Badge>
                  </div>

                  <div className="bg-[#F8FFF9] p-3 rounded-xl border border-[#D1E8D5] min-h-[80px] flex flex-col">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">PUNTOS</p>
                    <div className="flex items-center gap-2">
                      <Award size={14} className="text-yellow-500 flex-shrink-0" />
                      <p className="text-sm font-black text-[#1A3026]">{formatPoints(selectedPaciente.puntos)}</p>
                    </div>
                  </div>

                  <div className="bg-[#F8FFF9] p-3 rounded-xl border border-[#D1E8D5] min-h-[80px] flex flex-col">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">REGISTRO</p>
                    <p className="text-sm font-black text-[#1A3026]">{selectedPaciente.fechaRegistro}</p>
                  </div>
                </div>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="altura">
                    <AccordionTrigger>ALTURA (CM)</AccordionTrigger>
                    <AccordionContent>
                      <Input
                        type="number"
                        min="0"
                        max="300"
                        step="0.1"
                        value={editAltura}
                        onChange={(e) => setEditAltura(e.target.value)}
                        className="text-sm border-[#D1E8D5] focus:border-[#2E8B57]"
                      />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="peso">
                    <AccordionTrigger>PESO ACTUAL (KG)</AccordionTrigger>
                    <AccordionContent>
                      <Input
                        type="number"
                        min="0"
                        max="700"
                        step="0.1"
                        value={editPeso}
                        onChange={(e) => setEditPeso(e.target.value)}
                        className="text-sm border-[#D1E8D5] focus:border-[#2E8B57]"
                      />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="objetivo">
                    <AccordionTrigger>OBJETIVO</AccordionTrigger>
                    <AccordionContent>
                      <Textarea
                        value={editObjetivo}
                        onChange={(e) => setEditObjetivo(e.target.value)}
                        className="text-sm border-[#D1E8D5] focus:border-[#2E8B57] min-h-[80px]"
                        placeholder="Ej: Perder 10 kg, ganar masa muscular..."
                      />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                {hasChanges && (
                  <DialogFooter className="pt-6 border-t-2 border-dashed border-[#F0FFF4]">
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      className="border-2 border-[#D1E8D5] text-gray-500"
                      disabled={editLoading}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleGuardarCambios}
                      disabled={editLoading}
                      className="bg-[#2E8B57] hover:bg-[#1A3026] text-white flex items-center gap-2"
                    >
                      <Save size={16} />
                      {editLoading ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                  </DialogFooter>
                )}

                <div className="pt-6 border-t-2 border-dashed border-[#F0FFF4]">
                  <h4 className="text-sm font-black text-[#2E8B57] uppercase tracking-[3px] mb-6 flex items-center gap-2">
                    <TrendingUp size={16} /> Progreso Semanal de Calorías
                  </h4>
                  <div className="grid grid-cols-7 gap-2">
                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((dia, idx) => {
                      const calorias = selectedPaciente.caloriasConsumidas[idx];
                      const porcentaje = (calorias / selectedPaciente.metaCalorias) * 100;
                      return (
                        <div key={dia} className="text-center">
                          <div className="text-xs font-black text-gray-400 mb-2">{dia}</div>
                          <div className="h-24 w-full bg-[#F0FFF4] rounded-xl flex items-end justify-center border border-[#D1E8D5] overflow-hidden">
                            <div 
                              className={`w-full transition-all duration-500 ${
                                porcentaje >= 90 && porcentaje <= 110 ? 'bg-[#2E8B57]' : 
                                porcentaje < 90 ? 'bg-blue-400' : 'bg-red-400'
                              }`}
                              style={{ height: `${Math.min(porcentaje, 100)}%` }}
                            />
                          </div>
                          <div className="text-xs font-black text-[#1A3026] mt-2">{calorias}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
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
    </div>
  );
}