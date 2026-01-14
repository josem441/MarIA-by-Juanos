
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export enum MaintenanceType {
  OIL_FILTER = 'Aceite y Filtros',
  BRAKES = 'Frenos',
  TIRES = 'Llantas',
  ALIGNMENT = 'Alineación y Balanceo',
  AIR_FILTER = 'Filtro de Aire',
  AC_RECHARGE = 'Recarga Aire Acondicionado',
  TIMING_BELT = 'Correa/Cadenilla',
  SUSPENSION = 'Suspensión', // Deprecated but kept for type safety
  SHOCK_ABSORBERS = 'Amortiguadores',
  SPARK_PLUGS = 'Cables y Bujías', // Deprecated but kept for type safety
  ENGINE_TUNING = 'Afinación Motor',
  TRANSMISSION_OIL = 'Aceite Caja Cambios', // New
  
  // Docs
  SOAT = 'SOAT',
  TECH_MECHANICAL = 'Técnico Mecánica',
  INSURANCE_POLICY = 'Póliza Todo Riesgo',
  TAXES = 'Impuestos', // New
  
  OTHER = 'Otro'
}

export interface MaintenanceRule {
  type: MaintenanceType;
  intervalKm?: number; // Every X kms
  intervalMonths?: number; // Every X months
  warningThresholdKm?: number; // Warn X kms before
  warningThresholdDays?: number; // Warn X days before
  
  // Manual Overrides
  lastManualDate?: string; // YYYY-MM-DD
  lastManualKm?: number;
}

export interface Transaction {
  id: string;
  vehicleId: string;
  date: string;
  type: TransactionType;
  amount: number;
  category: MaintenanceType | string;
  description: string;
  odometerSnapshot?: number; // Odometer reading at time of transaction
}

export interface Vehicle {
  id: string;
  plate: string;
  aka?: string; // Nickname e.g. "La Coqueta"
  brand: string;
  model: string;
  year: number;
  color: string;
  
  // Driver Info
  driverName: string;
  driverId: string; // Cédula
  driverPhone: string;
  driverAddress?: string;
  driverPhotoUrl?: string; // Placeholder or URL
  
  // Insurance Details
  policyNumber?: string;
  policyPaymentLink?: string;

  // Status
  currentOdometer: number;
  lastOdometerUpdate: string;
  
  // Dates (YYYY-MM-DD)
  soatExpiry: string;
  techMechanicalExpiry: string;
  insuranceExpiry: string;
  taxExpiry: string; // New field for Taxes
  
  // Custom Maintenance Config (AI suggested or Manual)
  maintenanceRules: MaintenanceRule[];
}

export const DEFAULT_MAINTENANCE_RULES: MaintenanceRule[] = [
  { type: MaintenanceType.OIL_FILTER, intervalKm: 6000, warningThresholdKm: 500 },
  { type: MaintenanceType.BRAKES, intervalKm: 25000, warningThresholdKm: 1000 },
  { type: MaintenanceType.TIRES, intervalMonths: 6, warningThresholdDays: 15 }, // "2 llantas en un año" ~ every 6 months for rotation/change logic
  { type: MaintenanceType.ALIGNMENT, intervalMonths: 6, warningThresholdDays: 15 },
  { type: MaintenanceType.AIR_FILTER, intervalMonths: 6, warningThresholdDays: 15 },
  { type: MaintenanceType.AC_RECHARGE, intervalMonths: 36, warningThresholdDays: 30 }, // 3 years
  { type: MaintenanceType.SHOCK_ABSORBERS, intervalMonths: 24, warningThresholdDays: 30 },
  { type: MaintenanceType.ENGINE_TUNING, intervalKm: 50000, warningThresholdKm: 2000 },
  { type: MaintenanceType.TRANSMISSION_OIL, intervalKm: 100000, warningThresholdKm: 5000 }, // New rule
];