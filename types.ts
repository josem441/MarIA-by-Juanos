
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
  SUSPENSION = 'Suspensión',
  SHOCK_ABSORBERS = 'Amortiguadores',
  SPARK_PLUGS = 'Cables y Bujías',
  ENGINE_TUNING = 'Afinación Motor',
  SOAT = 'SOAT',
  TECH_MECHANICAL = 'Técnico Mecánica',
  INSURANCE_POLICY = 'Póliza Todo Riesgo',
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
  
  // Custom Maintenance Config (AI suggested or Manual)
  maintenanceRules: MaintenanceRule[];
}

export const DEFAULT_MAINTENANCE_RULES: MaintenanceRule[] = [
  { type: MaintenanceType.OIL_FILTER, intervalKm: 5500, warningThresholdKm: 500 },
  { type: MaintenanceType.BRAKES, intervalKm: 25000, warningThresholdKm: 1000 },
  { type: MaintenanceType.TIRES, intervalMonths: 6, warningThresholdDays: 15 }, // "2 llantas en un año" ~ every 6 months for rotation/change logic
  { type: MaintenanceType.ALIGNMENT, intervalMonths: 6, warningThresholdDays: 15 },
  { type: MaintenanceType.AIR_FILTER, intervalMonths: 6, warningThresholdDays: 15 },
  { type: MaintenanceType.AC_RECHARGE, intervalMonths: 36, warningThresholdDays: 30 }, // 3 years
  { type: MaintenanceType.SUSPENSION, intervalMonths: 6, warningThresholdDays: 15 },
  { type: MaintenanceType.SHOCK_ABSORBERS, intervalMonths: 24, warningThresholdDays: 30 },
  { type: MaintenanceType.SPARK_PLUGS, intervalKm: 50000, warningThresholdKm: 2000 },
  { type: MaintenanceType.ENGINE_TUNING, intervalKm: 50000, warningThresholdKm: 2000 },
];
