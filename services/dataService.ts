import { Vehicle, Transaction } from '../types';
import { supabase } from './supabaseClient';

// --- CONFIGURACIÓN DE ALMACENAMIENTO ---
// Establecido en false para usar LocalStorage (navegador)
const USE_SUPABASE = false;

// --- LOCAL STORAGE HELPERS (FALLBACK) ---
const getLocalVehicles = (): Vehicle[] => {
    try {
        const saved = localStorage.getItem('vehicles');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        console.error("Error reading vehicles from local storage", e);
        return [];
    }
};

const getLocalTransactions = (): Transaction[] => {
    try {
        const saved = localStorage.getItem('transactions');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        console.error("Error reading transactions from local storage", e);
        return [];
    }
};

// --- DATA SERVICE API ---

export const DataService = {
    
    // FETCH VEHICLES
    getVehicles: async (): Promise<Vehicle[]> => {
        if (USE_SUPABASE) {
            try {
                const { data, error } = await supabase.from('vehicles').select('*');
                if (error) {
                    console.error("Error fetching vehicles:", error);
                    return getLocalVehicles(); // Fallback
                }
                return data.map((row: any) => ({ ...row.data, id: row.id }));
            } catch (error) {
                return getLocalVehicles();
            }
        } else {
            return getLocalVehicles();
        }
    },

    // SAVE VEHICLE (Create or Update)
    saveVehicle: async (vehicle: Vehicle): Promise<void> => {
        if (USE_SUPABASE) {
            try {
                const { data } = await supabase.from('vehicles').select('id').eq('id', vehicle.id).single();
                
                if (data) {
                    await supabase.from('vehicles').update({
                        plate: vehicle.plate,
                        data: vehicle
                    }).eq('id', vehicle.id);
                } else {
                    await supabase.from('vehicles').insert({
                        id: vehicle.id,
                        plate: vehicle.plate,
                        data: vehicle
                    });
                }
            } catch (error) {
                console.error("Supabase save error", error);
                // Also save to local as backup
                const current = getLocalVehicles();
                const index = current.findIndex(v => v.id === vehicle.id);
                if (index >= 0) current[index] = vehicle;
                else current.push(vehicle);
                localStorage.setItem('vehicles', JSON.stringify(current));
            }
        } else {
            const current = getLocalVehicles();
            const index = current.findIndex(v => v.id === vehicle.id);
            if (index >= 0) {
                current[index] = vehicle;
            } else {
                current.push(vehicle);
            }
            localStorage.setItem('vehicles', JSON.stringify(current));
        }
    },

    // FETCH TRANSACTIONS
    getTransactions: async (): Promise<Transaction[]> => {
        if (USE_SUPABASE) {
            try {
                const { data, error } = await supabase.from('transactions').select('*');
                if (error) {
                    console.error("Error fetching transactions:", error);
                    return getLocalTransactions();
                }
                return data.map((row: any) => ({ ...row.data, id: row.id }));
            } catch (error) {
                return getLocalTransactions();
            }
        } else {
            return getLocalTransactions();
        }
    },

    // SAVE TRANSACTION
    saveTransaction: async (transaction: Transaction): Promise<void> => {
        if (USE_SUPABASE) {
            try {
                const { data } = await supabase.from('transactions').select('id').eq('id', transaction.id).single();
                
                if (data) {
                    await supabase.from('transactions').update({
                        vehicle_id: transaction.vehicleId,
                        data: transaction
                    }).eq('id', transaction.id);
                } else {
                    await supabase.from('transactions').insert({
                        id: transaction.id,
                        vehicle_id: transaction.vehicleId,
                        data: transaction
                    });
                }
            } catch (error) {
                console.error("Supabase save error", error);
                const current = getLocalTransactions();
                const index = current.findIndex(t => t.id === transaction.id);
                if (index >= 0) current[index] = transaction;
                else current.push(transaction);
                localStorage.setItem('transactions', JSON.stringify(current));
            }
        } else {
            const current = getLocalTransactions();
            const index = current.findIndex(t => t.id === transaction.id);
            if (index >= 0) {
                current[index] = transaction;
            } else {
                current.push(transaction);
            }
            localStorage.setItem('transactions', JSON.stringify(current));
        }
    }
};