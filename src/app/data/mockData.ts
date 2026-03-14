
export interface Paciente {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  edad: number;
  peso: number;
  altura: number;
  objetivo: string;
  nutriologoId: string;
  puntos: number;
  fechaRegistro: string;
  metaCalorias: number;
  caloriasConsumidas: number[];
}

export interface Dieta {
  id: string;
  pacienteId: string;
  nutriologoId: string;
  fecha: string;
  comidas: {
    desayuno: string;
    comidaMediaManana: string;
    comida: string;
    merienda: string;
    cena: string;
  };
  calorias: number;
}

export interface Cita {
  id: string;
  pacienteId: string;
  nutriologoId: string;
  fecha: string;
  hora: string;
  estado: 'pendiente' | 'confirmada' | 'completada' | 'cancelada';
  pagada: boolean;
  monto: number;
}

export interface Pago {
  id: string;
  citaId: string;
  nutriologoId: string;
  pacienteId: string;
  monto: number;
  fecha: string;
  metodo: string;
  comprobante: string;
}

export const mockPacientes: Paciente[] = [
  {
    id: 'p1',
    nombre: 'Ana',
    apellido: 'Martínez',
    email: 'ana@ejemplo.com',
    edad: 28,
    peso: 68,
    altura: 165,
    objetivo: 'Pérdida de peso',
    nutriologoId: '2',
    puntos: 250,
    fechaRegistro: '2025-11-15',
    metaCalorias: 1800,
    caloriasConsumidas: [1750, 1820, 1790, 1680, 1850, 1800, 1770]
  },
  {
    id: 'p2',
    nombre: 'Luis',
    apellido: 'García',
    email: 'luis@ejemplo.com',
    edad: 35,
    peso: 85,
    altura: 178,
    objetivo: 'Ganancia muscular',
    nutriologoId: '2',
    puntos: 180,
    fechaRegistro: '2025-12-01',
    metaCalorias: 2500,
    caloriasConsumidas: [2450, 2520, 2480, 2390, 2550, 2500, 2470]
  },
  {
    id: 'p3',
    nombre: 'Patricia',
    apellido: 'López',
    email: 'patricia@ejemplo.com',
    edad: 42,
    peso: 72,
    altura: 160,
    objetivo: 'Mantenimiento',
    nutriologoId: '3',
    puntos: 320,
    fechaRegistro: '2025-10-20',
    metaCalorias: 2000,
    caloriasConsumidas: [1980, 2010, 1990, 2020, 1970, 2000, 2030]
  },
  {
    id: 'p4',
    nombre: 'Roberto',
    apellido: 'Hernández',
    email: 'roberto@ejemplo.com',
    edad: 25,
    peso: 75,
    altura: 175,
    objetivo: 'Pérdida de peso',
    nutriologoId: '3',
    puntos: 150,
    fechaRegistro: '2025-12-10',
    metaCalorias: 1900,
    caloriasConsumidas: [1850, 1920, 1880, 1900, 1910, 1870, 1890]
  },
  {
    id: 'p5',
    nombre: 'Sandra',
    apellido: 'Torres',
    email: 'sandra@ejemplo.com',
    edad: 30,
    peso: 58,
    altura: 162,
    objetivo: 'Ganancia de peso saludable',
    nutriologoId: '2',
    puntos: 200,
    fechaRegistro: '2025-11-25',
    metaCalorias: 2200,
    caloriasConsumidas: [2180, 2210, 2190, 2220, 2170, 2200, 2230]
  }
];

export const mockDietas: Dieta[] = [
  {
    id: 'd1',
    pacienteId: 'p1',
    nutriologoId: '2',
    fecha: '2026-01-13',
    comidas: {
      desayuno: '2 claras de huevo, 1 taza de avena, 1 manzana',
      comidaMediaManana: '1 yogurt griego bajo en grasa, almendras (10 piezas)',
      comida: '150g pechuga de pollo, 1 taza de arroz integral, ensalada verde',
      merienda: '1 plátano, 1 cucharada de crema de cacahuate',
      cena: '150g pescado a la plancha, verduras al vapor'
    },
    calorias: 1800
  },
  {
    id: 'd2',
    pacienteId: 'p2',
    nutriologoId: '2',
    fecha: '2026-01-13',
    comidas: {
      desayuno: '4 huevos enteros, 2 tazas de avena, 2 plátanos',
      comidaMediaManana: 'Batido de proteína con leche, mantequilla de maní',
      comida: '200g pechuga de pollo, 2 tazas de arroz, brócoli',
      merienda: 'Sandwich de atún, frutas',
      cena: '200g carne magra, papa al horno, ensalada'
    },
    calorias: 2500
  }
];

export const mockCitas: Cita[] = [
  {
    id: 'c1',
    pacienteId: 'p1',
    nutriologoId: '2',
    fecha: '2026-01-20',
    hora: '10:00',
    estado: 'confirmada',
    pagada: true,
    monto: 500
  },
  {
    id: 'c2',
    pacienteId: 'p2',
    nutriologoId: '2',
    fecha: '2026-01-20',
    hora: '11:00',
    estado: 'confirmada',
    pagada: true,
    monto: 500
  },
  {
    id: 'c3',
    pacienteId: 'p5',
    nutriologoId: '2',
    fecha: '2026-01-21',
    hora: '09:00',
    estado: 'confirmada',
    pagada: true,
    monto: 500
  },
  {
    id: 'c4',
    pacienteId: 'p3',
    nutriologoId: '3',
    fecha: '2026-01-22',
    hora: '10:00',
    estado: 'confirmada',
    pagada: true,
    monto: 600
  },
  {
    id: 'c5',
    pacienteId: 'p4',
    nutriologoId: '3',
    fecha: '2026-01-22',
    hora: '11:30',
    estado: 'pendiente',
    pagada: false,
    monto: 600
  },
  {
    id: 'c6',
    pacienteId: 'p1',
    nutriologoId: '2',
    fecha: '2026-01-10',
    hora: '10:00',
    estado: 'completada',
    pagada: true,
    monto: 500
  },
  {
    id: 'c7',
    pacienteId: 'p2',
    nutriologoId: '2',
    fecha: '2026-01-08',
    hora: '11:00',
    estado: 'completada',
    pagada: true,
    monto: 500
  }
];

export const mockPagos: Pago[] = [
  {
    id: 'pago1',
    citaId: 'c1',
    nutriologoId: '2',
    pacienteId: 'p1',
    monto: 500,
    fecha: '2026-01-15',
    metodo: 'Stripe',
    comprobante: 'COMP-001-2026'
  },
  {
    id: 'pago2',
    citaId: 'c2',
    nutriologoId: '2',
    pacienteId: 'p2',
    monto: 500,
    fecha: '2026-01-15',
    metodo: 'Stripe',
    comprobante: 'COMP-002-2026'
  },
  {
    id: 'pago3',
    citaId: 'c3',
    nutriologoId: '2',
    pacienteId: 'p5',
    monto: 500,
    fecha: '2026-01-16',
    metodo: 'Stripe',
    comprobante: 'COMP-003-2026'
  },
  {
    id: 'pago4',
    citaId: 'c4',
    nutriologoId: '3',
    pacienteId: 'p3',
    monto: 600,
    fecha: '2026-01-16',
    metodo: 'Stripe',
    comprobante: 'COMP-004-2026'
  },
  {
    id: 'pago5',
    citaId: 'c6',
    nutriologoId: '2',
    pacienteId: 'p1',
    monto: 500,
    fecha: '2026-01-05',
    metodo: 'Stripe',
    comprobante: 'COMP-005-2025'
  },
  {
    id: 'pago6',
    citaId: 'c7',
    nutriologoId: '2',
    pacienteId: 'p2',
    monto: 500,
    fecha: '2026-01-03',
    metodo: 'Stripe',
    comprobante: 'COMP-006-2025'
  }
];
export interface Nutriologo {
  id: string;
  nombre: string;
  apellido: string;
  nombreUsuario: string;
  email: string;
  celular: string;
  contrasena?: string;
  tarifa: number;
  fechaRegistro?: string;
}

export let mockNutriologos: Nutriologo[] = [
  {
    id: '2',
    email: 'maria@nutricion.com',
    nombre: 'María',
    apellido: 'González',
    nombreUsuario: 'mariag',
    celular: '5559876543',
    tarifa: 500
  },
  {
    id: '3',
    email: 'carlos@nutricion.com',
    nombre: 'Carlos',
    apellido: 'Ramírez',
    nombreUsuario: 'carlosr',
    celular: '5551122334',
    tarifa: 600
  }
];

export function agregarNutriologo(nutriologo: Nutriologo) {
  mockNutriologos.push(nutriologo);
}

export function actualizarNutriologo(nutriologoActualizado: Nutriologo) {
  const index = mockNutriologos.findIndex(n => n.id === nutriologoActualizado.id);
  if (index !== -1) {
    const contrasenaActual = mockNutriologos[index].contrasena;
    mockNutriologos[index] = {
      ...nutriologoActualizado,
      contrasena: nutriologoActualizado.contrasena || contrasenaActual
    };
  }
}

export function eliminarNutriologo(id: string) {
  mockNutriologos = mockNutriologos.filter(n => n.id !== id);
}