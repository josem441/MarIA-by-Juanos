import { Vehicle, Transaction } from '../types';
import { supabase } from './supabaseClient';

const KEY_VEHICLES = 'vehicles_data';
const KEY_TRANSACTIONS = 'transactions_data';
const COLLECTION_VEHICLES = 'vehicles';
const COLLECTION_TRANSACTIONS = 'transactions';

// Helper para guardar en localStorage
const saveLocal = (key: string, data: any) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.error("Error saving to localStorage", e);
    }
};

// Helper para leer de localStorage
const getLocal = (key: string): any[] => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : [];
    } catch (e) {
        return [];
    }
};

export const DataService = {
    
    // FETCH: Intenta Cloud, si falla o no hay config, usa Local
    getVehicles: async (): Promise<Vehicle[]> => {
        // 1. Si hay Supabase, intentamos bajar lo más reciente
        if (supabase) {
            const { data, error } = await supabase.from(COLLECTION_VEHICLES).select('*');
            if (!error && data) {
                // Éxito: Actualizamos el espejo local para la próxima vez
                saveLocal(KEY_VEHICLES, data);
                return data as Vehicle[];
            }
        }
        // 2. Fallback: Devolvemos lo que haya localmente
        return getLocal(KEY_VEHICLES) as Vehicle[];
    },

    // SAVE: Guarda Local (Inmediato) Y luego Cloud (Segundo plano)
    saveVehicle: async (vehicle: Vehicle): Promise<void> => {
        // 1. Guardado Local Inmediato
        const vehicles = getLocal(KEY_VEHICLES) as Vehicle[];
        const index = vehicles.findIndex(v => v.id === vehicle.id);
        if (index >= 0) vehicles[index] = vehicle;
        else vehicles.push(vehicle);
        saveLocal(KEY_VEHICLES, vehicles);

        // 2. Guardado en Nube (Si está disponible)
        if (supabase) {
             await supabase.from(COLLECTION_VEHICLES).upsert(vehicle);
        }
    },

    // FETCH TRANSACTIONS
    getTransactions: async (): Promise<Transaction[]> => {
        if (supabase) {
            const { data, error } = await supabase.from(COLLECTION_TRANSACTIONS).select('*');
            if (!error && data) {
                saveLocal(KEY_TRANSACTIONS, data);
                return data as Transaction[];
            }
        }
        return getLocal(KEY_TRANSACTIONS) as Transaction[];
    },

    // SAVE TRANSACTION
    saveTransaction: async (transaction: Transaction): Promise<void> => {
        // 1. Local
        const transactions = getLocal(KEY_TRANSACTIONS) as Transaction[];
        const index = transactions.findIndex(t => t.id === transaction.id);
        if (index >= 0) transactions[index] = transaction;
        else transactions.push(transaction);
        saveLocal(KEY_TRANSACTIONS, transactions);

        // 2. Cloud
        if (supabase) {
            await supabase.from(COLLECTION_TRANSACTIONS).upsert(transaction);
        }
    },

    // DELETE TRANSACTION
    deleteTransaction: async (id: string): Promise<void> => {
        // 1. Local
        let transactions = getLocal(KEY_TRANSACTIONS) as Transaction[];
        transactions = transactions.filter(t => t.id !== id);
        saveLocal(KEY_TRANSACTIONS, transactions);

        // 2. Cloud
        if (supabase) {
            await supabase.from(COLLECTION_TRANSACTIONS).delete().eq('id', id);
        }
    }
};

export const isCloudEnabled = () => !!supabase;