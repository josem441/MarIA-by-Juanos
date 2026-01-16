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

export const exportMasterData = (vehicles: Vehicle[], transactions: Transaction[]) => {
    const wb = XLSX.utils.book_new();

    // TAB 1: ALL TRANSACTIONS (Merged and organized)
    const allTransactionsData = transactions.map(t => {
        const vehicle = vehicles.find(v => v.id === t.vehicleId);
        return {
            Fecha: t.date,
            Placa: vehicle ? vehicle.plate : 'Desconocido',
            Alias: vehicle ? (vehicle.aka || vehicle.model) : '-',
            Tipo: t.type === TransactionType.INCOME ? 'INGRESO' : 'GASTO',
            Categoría: t.category,
            Monto: t.amount,
            Descripción: t.description || '',
            "Km Registro": t.odometerSnapshot || ''
        };
    }).sort((a, b) => new Date(b.Fecha).getTime() - new Date(a.Fecha).getTime()); // Sort by date desc

    const wsTransactions = XLSX.utils.json_to_sheet(allTransactionsData);
    XLSX.utils.book_append_sheet(wb, wsTransactions, "Transacciones");

    // TAB 2: FLEET INVENTORY (Technical & Driver info)
    const inventoryData = vehicles.map(v => ({
        Placa: v.plate,
        Alias: v.aka,
        Marca: v.brand,
        Modelo: v.model,
        Año: v.year,
        Color: v.color,
        "Km Actual": v.currentOdometer,
        "Conductor": v.driverName,
        "Cédula": v.driverId,
        "Teléfono": v.driverPhone,
        "Dirección": v.driverAddress,
        "Póliza #": v.policyNumber
    }));
    const wsInventory = XLSX.utils.json_to_sheet(inventoryData);
    XLSX.utils.book_append_sheet(wb, wsInventory, "Inventario Flota");

    // TAB 3: DOCUMENT STATUS (Expiries)
    const docsData = vehicles.map(v => {
        const today = new Date();
        const getDays = (dateStr: string) => Math.ceil((new Date(dateStr).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
            Placa: v.plate,
            "Vence SOAT": v.soatExpiry,
            "Días SOAT": getDays(v.soatExpiry),
            "Vence Tecno": v.techMechanicalExpiry,
            "Días Tecno": getDays(v.techMechanicalExpiry),
            "Vence Póliza": v.insuranceExpiry,
            "Días Póliza": getDays(v.insuranceExpiry),
            "Vence Impuesto": v.taxExpiry,
            "Días Impuesto": getDays(v.taxExpiry)
        };
    });
    const wsDocs = XLSX.utils.json_to_sheet(docsData);
    XLSX.utils.book_append_sheet(wb, wsDocs, "Vencimientos");

    // Download
    XLSX.writeFile(wb, `Juanos_Master_Data_${new Date().toISOString().split('T')[0]}.xlsx`);
};