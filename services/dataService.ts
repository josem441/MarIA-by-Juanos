import { Vehicle, Transaction } from '../types';
import { supabase } from './supabaseClient';

// --- CAMBIA ESTO A TRUE CUANDO TENGAS LAS LLAVES DE SUPABASE ---
const USE_SUPABASE = true;

// --- LOCAL STORAGE HELPERS (FALLBACK) ---
const getLocalVehicles = (): Vehicle[] => {
    const saved = localStorage.getItem('vehicles');
    return saved ? JSON.parse(saved) : [];
};

const getLocalTransactions = (): Transaction[] => {
    const saved = localStorage.getItem('transactions');
    return saved ? JSON.parse(saved) : [];
};

// --- DATA SERVICE API ---

export const DataService = {
    
    // FETCH VEHICLES
    getVehicles: async (): Promise<Vehicle[]> => {
        if (USE_SUPABASE) {
            const { data, error } = await supabase.from('vehicles').select('*');
            if (error) {
                console.error("Error fetching vehicles:", error);
                return [];
            }
            // Map the JSONB 'data' column back to our Vehicle type
            return data.map((row: any) => ({ ...row.data, id: row.id }));
        } else {
            return getLocalVehicles();
        }
    },

    // SAVE VEHICLE (Create or Update)
    saveVehicle: async (vehicle: Vehicle): Promise<void> => {
        if (USE_SUPABASE) {
            // Check if exists
            const { data } = await supabase.from('vehicles').select('id').eq('id', vehicle.id).single();
            
            if (data) {
                // Update
                await supabase.from('vehicles').update({
                    plate: vehicle.plate,
                    data: vehicle
                }).eq('id', vehicle.id);
            } else {
                // Insert
                await supabase.from('vehicles').insert({
                    id: vehicle.id,
                    plate: vehicle.plate,
                    data: vehicle
                });
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
            const { data, error } = await supabase.from('transactions').select('*');
            if (error) {
                console.error("Error fetching transactions:", error);
                return [];
            }
            return data.map((row: any) => ({ ...row.data, id: row.id }));
        } else {
            return getLocalTransactions();
        }
    },

    // SAVE TRANSACTION
    saveTransaction: async (transaction: Transaction): Promise<void> => {
        if (USE_SUPABASE) {
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