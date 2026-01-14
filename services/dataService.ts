import { Vehicle, Transaction } from '../types';
// import { supabase } from './supabaseClient'; // Disabled for local mode

// --- CONFIGURACIÓN DE ALMACENAMIENTO ---
// Establecido en false para usar LocalStorage (Modo Offline/Local)
const USE_SUPABASE = false;

// --- LOCAL STORAGE HELPERS ---
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
        // En modo local, retornamos directamente del localStorage
        return getLocalVehicles();
    },

    // SAVE VEHICLE (Create or Update)
    saveVehicle: async (vehicle: Vehicle): Promise<void> => {
        const current = getLocalVehicles();
        const index = current.findIndex(v => v.id === vehicle.id);
        if (index >= 0) {
            current[index] = vehicle;
        } else {
            current.push(vehicle);
        }
        localStorage.setItem('vehicles', JSON.stringify(current));
    },

    // FETCH TRANSACTIONS
    getTransactions: async (): Promise<Transaction[]> => {
        // En modo local, retornamos directamente del localStorage
        return getLocalTransactions();
    },

    // SAVE TRANSACTION
    saveTransaction: async (transaction: Transaction): Promise<void> => {
        const current = getLocalTransactions();
        const index = current.findIndex(t => t.id === transaction.id);
        if (index >= 0) {
            current[index] = transaction;
        } else {
            current.push(transaction);
        }
        localStorage.setItem('transactions', JSON.stringify(current));
    }
};