export type PublicId = string;

export type PublicRuta = {
  id: PublicId;
  codigo: string;
  nombre: string;
  servicio: string;
  color: string;
  frecuenciaMin: number;
  isActive: boolean;
  descripcion?: string;
};

export type PublicEstacion = {
  id: PublicId;
  nombre: string;
  distrito: string;
  latitud: number;
  longitud: number;
  orden: number;
  isActive: boolean;
};

export type PublicRutaEstacion = {
  rutaId: PublicId;
  estacionId: PublicId;
  orden: number;
  isActive: boolean;
};

export type PublicBus = {
  id: PublicId;
  codigo: string;
  capacidad: number;
  placa: string | null;
  rutaId: PublicId | null;
  estado: "en_ruta" | "en_estacion" | "fuera_servicio" | "retraso";
  createdAt: string;
  isActive: boolean;
};

export type PublicReporte = {
  id: PublicId;
  busId: PublicId;
  latitud: number;
  longitud: number;
  cantidadPasajeros: number;
  timestamp: string;
  estacionId: PublicId | null;
  ocupacionPct: number | null;
  velocidadKmh: number | null;
  isActive: boolean;
};

export type PublicBusLiveView = {
  id: PublicId;
  codigo: string;
  placa: string | null;
  rutaId: PublicId | null;
  capacidad: number;
  ocupacionActual: number;
  estado: PublicBus["estado"];
  estacionActualId: PublicId | null;
  estacionSiguienteId: PublicId | null;
  progreso: number;
  velocidadKmh: number | null;
  etaMinutos: number | null;
  ultimaActualizacion: string;
  latitud: number;
  longitud: number;
  direccion: "norte" | "sur" | null;
};
