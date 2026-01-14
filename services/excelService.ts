import * as XLSX from 'xlsx';
import { Transaction, Vehicle, TransactionType } from '../types';

export const exportGlobalSummary = (vehicles: Vehicle[], transactions: Transaction[]) => {
  // 1. Vehicles Sheet
  const vehiclesData = vehicles.map(v => ({
    Placa: v.plate,
    Marca: v.brand,
    Modelo: v.model,
    Año: v.year,
    Conductor: v.driverName,
    "Vence SOAT": v.soatExpiry,
    "Vence Tecno": v.techMechanicalExpiry
  }));

  // 2. Financial Summary Sheet
  const summaryData = vehicles.map(v => {
    const vTrans = transactions.filter(t => t.vehicleId === v.id);
    const income = vTrans.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
    const expense = vTrans.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
    return {
      Placa: v.plate,
      Ingresos: income,
      Egresos: expense,
      Balance: income - expense
    };
  });

  const wb = XLSX.utils.book_new();
  const wsVehicles = XLSX.utils.json_to_sheet(vehiclesData);
  const wsSummary = XLSX.utils.json_to_sheet(summaryData);

  XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen Financiero");
  XLSX.utils.book_append_sheet(wb, wsVehicles, "Vehículos");

  XLSX.writeFile(wb, `Reporte_Global_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportVehicleHistory = (vehicle: Vehicle, transactions: Transaction[]) => {
  const vehicleTrans = transactions.filter(t => t.vehicleId === vehicle.id).map(t => ({
    Fecha: t.date,
    Tipo: t.type === TransactionType.INCOME ? 'Ingreso' : 'Gasto',
    Categoría: t.category,
    Descripción: t.description,
    Monto: t.amount,
    Odómetro: t.odometerSnapshot || '-'
  }));

  const wb = XLSX.utils.book_new();
  const wsHistory = XLSX.utils.json_to_sheet(vehicleTrans);

  XLSX.utils.book_append_sheet(wb, wsHistory, "Historial");
  XLSX.writeFile(wb, `Reporte_${vehicle.plate}_${new Date().toISOString().split('T')[0]}.xlsx`);
};