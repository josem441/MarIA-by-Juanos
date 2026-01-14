import { Vehicle, Transaction } from '../types';
import { db } from './firebaseClient';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

// --- CONFIGURACIÓN DE ALMACENAMIENTO ---
const COLLECTION_VEHICLES = 'vehicles';
const COLLECTION_TRANSACTIONS = 'transactions';
const LOCAL_KEYS = {
    VEHICLES: 'vehicles_data_local',
    TRANSACTIONS: 'transactions_data_local'
};

// Helper para LocalStorage (Modo Fallback/Offline)
const getLocal = <T>(key: string): T[] => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
};
const saveLocal = (key: string, data: any[]) => {
    localStorage.setItem(key, JSON.stringify(data));
};

export const DataService = {
    
    // FETCH VEHICLES
    getVehicles: async (): Promise<Vehicle[]> => {
        // 1. Si no hay DB configurada, usar LocalStorage
        if (!db) {
            return getLocal<Vehicle>(LOCAL_KEYS.VEHICLES);
        }

        // 2. Intentar nube
        try {
            const querySnapshot = await getDocs(collection(db, COLLECTION_VEHICLES));
            const vehicles: Vehicle[] = [];
            querySnapshot.forEach((doc) => {
                vehicles.push(doc.data() as Vehicle);
            });
            return vehicles;
        } catch (e) {
            console.error("Error conectando a Google Cloud (Vehículos):", e);
            // Fallback a local si la red falla
            return getLocal<Vehicle>(LOCAL_KEYS.VEHICLES);
        }
    },

    // SAVE VEHICLE
    saveVehicle: async (vehicle: Vehicle): Promise<void> => {
        // Siempre guardar en local para redundancia o modo offline
        const localVehicles = getLocal<Vehicle>(LOCAL_KEYS.VEHICLES);
        const index = localVehicles.findIndex(v => v.id === vehicle.id);
        if (index >= 0) localVehicles[index] = vehicle;
        else localVehicles.push(vehicle);
        saveLocal(LOCAL_KEYS.VEHICLES, localVehicles);

        if (!db) return; // Si no hay nube, terminamos aquí

        try {
            await setDoc(doc(db, COLLECTION_VEHICLES, vehicle.id), vehicle);
        } catch (e) {
            console.error("Error guardando vehículo en Google Cloud:", e);
            throw e; // Relanzar para que la UI sepa que falló la nube
        }
    },

    // FETCH TRANSACTIONS
    getTransactions: async (): Promise<Transaction[]> => {
        if (!db) {
            return getLocal<Transaction>(LOCAL_KEYS.TRANSACTIONS);
        }

        try {
            const querySnapshot = await getDocs(collection(db, COLLECTION_TRANSACTIONS));
            const transactions: Transaction[] = [];
            querySnapshot.forEach((doc) => {
                transactions.push(doc.data() as Transaction);
            });
            return transactions;
        } catch (e) {
            console.error("Error conectando a Google Cloud (Transacciones):", e);
            return getLocal<Transaction>(LOCAL_KEYS.TRANSACTIONS);
        }
    },

    // SAVE TRANSACTION
    saveTransaction: async (transaction: Transaction): Promise<void> => {
        // Guardado local
        const localTrans = getLocal<Transaction>(LOCAL_KEYS.TRANSACTIONS);
        const index = localTrans.findIndex(t => t.id === transaction.id);
        if (index >= 0) localTrans[index] = transaction;
        else localTrans.push(transaction);
        saveLocal(LOCAL_KEYS.TRANSACTIONS, localTrans);

        if (!db) return;

        try {
            await setDoc(doc(db, COLLECTION_TRANSACTIONS, transaction.id), transaction);
        } catch (e) {
            console.error("Error guardando transacción en Google Cloud:", e);
            throw e;
        }
    }
};

// Método para verificar estado
export const isCloudEnabled = () => !!db;