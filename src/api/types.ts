export type UUID = string;

export type BaseResponseDto<T> = {
  message: string;
  data: T | null;
};

export type NestErrorResponse = {
  statusCode: number;
  message: string | string[];
  error: string;
};

export type SoftDeleteEntity = {
  isActive: boolean;
};

export type Usuario = {
  id: UUID;
  email: string;
  nombre: string;
  role?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export const RUTA_SERVICIOS = [
  "Regular",
  "Expreso_1",
  "Expreso_2",
  "Expreso_4",
  "Expreso_5",
  "Expreso_7",
  "SuperExpreso",
  "Alimentador",
] as const;

export type RutaServicio = (typeof RUTA_SERVICIOS)[number];

export const BUS_ESTADOS = [
  "en_ruta",
  "en_estacion",
  "fuera_servicio",
  "retraso",
] as const;

export type BusEstado = (typeof BUS_ESTADOS)[number];

export const VIAJE_ESTADOS = [
  "programado",
  "en_recorrido",
  "completado",
  "cancelado",
  "retrasado",
] as const;

export type ViajeEstado = (typeof VIAJE_ESTADOS)[number];

export const VIAJE_SENTIDOS = ["ida", "vuelta"] as const;

export type ViajeSentido = (typeof VIAJE_SENTIDOS)[number];

export const VIAJE_ESTACION_ESTADOS = [
  "pendiente",
  "a_tiempo",
  "tarde",
  "omitida",
] as const;

export type ViajeEstacionEstadoCumplimiento = (typeof VIAJE_ESTACION_ESTADOS)[number];

export type Ruta = SoftDeleteEntity & {
  id: UUID;
  codigo: string;
  nombre: string;
  servicio: RutaServicio;
  color: string;
  frecuenciaMin: number;
};

export type Estacion = SoftDeleteEntity & {
  id: UUID;
  nombre: string;
  distrito: string;
  latitud: number;
  longitud: number;
  orden: number;
};

export type Bus = SoftDeleteEntity & {
  id: UUID;
  codigo: string;
  capacidad: number;
  placa: string | null;
  rutaId: UUID | null;
  estado: BusEstado;
  createdAt: string;
};

export type Viaje = SoftDeleteEntity & {
  id: UUID;
  rutaId: UUID;
  busId: UUID;
  fechaOperacion: string;
  horaSalidaProgramada: string;
  horaSalidaReal: string | null;
  horaLlegadaProgramada: string | null;
  horaLlegadaReal: string | null;
  estado: ViajeEstado;
  sentido: ViajeSentido;
  observaciones: string | null;
};

export type ViajeEstacion = SoftDeleteEntity & {
  id: UUID;
  viajeId: UUID;
  estacionId: UUID;
  orden: number;
  horaLlegadaProgramada: string | null;
  horaLlegadaReal: string | null;
  horaSalidaProgramada: string | null;
  horaSalidaReal: string | null;
  estadoCumplimiento: ViajeEstacionEstadoCumplimiento;
  observaciones: string | null;
};

export type Reporte = SoftDeleteEntity & {
  id: UUID;
  busId: UUID;
  latitud: number;
  longitud: number;
  cantidadPasajeros: number;
  timestamp: string;
  estacionId: UUID | null;
  ocupacionPct: number | null;
  velocidadKmh: number | null;
};

export type RutaEstacion = SoftDeleteEntity & {
  rutaId: UUID;
  estacionId: UUID;
  orden: number;
};

export type CreateRutaRequest = {
  codigo: string;
  nombre: string;
  servicio: RutaServicio;
  color: string;
  frecuenciaMin: number;
};

export type UpdateRutaRequest = Partial<CreateRutaRequest>;

export type CreateEstacionRequest = {
  nombre: string;
  distrito: string;
  latitud: number;
  longitud: number;
  orden: number;
};

export type UpdateEstacionRequest = Partial<CreateEstacionRequest>;

export type CreateBusRequest = {
  codigo: string;
  capacidad: number;
  placa: string | null;
  rutaId?: UUID;
  estado: BusEstado;
};

export type UpdateBusRequest = Partial<CreateBusRequest>;

export type CreateViajeRequest = {
  rutaId: UUID;
  busId: UUID;
  fechaOperacion: string;
  horaSalidaProgramada: string;
  horaSalidaReal?: string | null;
  horaLlegadaProgramada?: string | null;
  horaLlegadaReal?: string | null;
  estado: ViajeEstado;
  sentido: ViajeSentido;
  observaciones?: string | null;
};

export type UpdateViajeRequest = Partial<CreateViajeRequest>;

export type CreateViajeEstacionRequest = {
  viajeId: UUID;
  estacionId: UUID;
  orden: number;
  horaLlegadaProgramada?: string | null;
  horaLlegadaReal?: string | null;
  horaSalidaProgramada?: string | null;
  horaSalidaReal?: string | null;
  estadoCumplimiento: ViajeEstacionEstadoCumplimiento;
  observaciones?: string | null;
};

export type UpdateViajeEstacionRequest = Partial<CreateViajeEstacionRequest>;

export type CreateReporteRequest = {
  busId: UUID;
  latitud: number;
  longitud: number;
  cantidadPasajeros: number;
  timestamp: string;
  estacionId?: UUID | null;
  ocupacionPct?: number | null;
  velocidadKmh?: number | null;
};

export type UpdateReporteRequest = Partial<CreateReporteRequest>;

export type CreateRutaEstacionRequest = {
  rutaId: UUID;
  estacionId: UUID;
  orden: number;
};

export type UpdateRutaEstacionRequest = Partial<Pick<CreateRutaEstacionRequest, "orden">>;

export type CreateRutaEstacionesLoteRequest = {
  rutaId: UUID;
  estaciones: Array<{
    estacionId: UUID;
    orden: number;
  }>;
};

export type CreateUsuarioRequest = {
  email: string;
  nombre: string;
  password?: string;
  role?: string;
};

export type UpdateUsuarioRequest = Partial<CreateUsuarioRequest>;
