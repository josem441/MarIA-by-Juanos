import { GoogleGenAI, Type, Schema } from "@google/genai";
import { MaintenanceRule, MaintenanceType } from "../types";

// Safety check: Prevent crash if process.env is undefined in some environments
const apiKey = process.env.API_KEY || '';

// Initialize lazily or safely
const getAiClient = () => {
    if (!apiKey) {
        console.warn("Gemini API Key missing. AI features will be disabled.");
        return null;
    }
    return new GoogleGenAI({ apiKey });
};

const maintenanceSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      type: { type: Type.STRING, description: "One of the MaintenanceType enum values or a similar string in Spanish" },
      intervalKm: { type: Type.NUMBER, description: "Recommended interval in full Kilometers (e.g. 5000 for 5k). Null if only time-based." },
      intervalMonths: { type: Type.NUMBER, description: "Recommended interval in Months. Null if only km-based." },
      description: { type: Type.STRING, description: "Brief explanation of why this interval is chosen for this specific model." }
    },
    required: ["type", "description"]
  }
};

const adviceSchema: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Short title of the recommendation" },
      category: { type: Type.STRING, description: "Category: 'Mecánica', 'Financiera', 'Seguridad', or 'Eficiencia'" },
      priority: { type: Type.STRING, description: "'Alta', 'Media', or 'Baja'" },
      content: { type: Type.STRING, description: "Detailed advice explanation." }
    },
    required: ["title", "category", "priority", "content"]
  }
};

const globalAnalysisSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        summary: { type: Type.STRING, description: "Un resumen ejecutivo del estado general del negocio (1 párrafo)" },
        profitabilityInsight: { type: Type.STRING, description: "Análisis sobre la rentabilidad (ingresos vs gastos)" },
        bestVehicle: { type: Type.STRING, description: "Nombre/Placa del vehículo con mejor rendimiento y por qué" },
        worstVehicle: { type: Type.STRING, description: "Nombre/Placa del vehículo con más gastos o problemas y por qué" },
        strategicAdvice: { type: Type.STRING, description: "Un consejo estratégico clave para crecer el negocio" }
    },
    required: ["summary", "profitabilityInsight", "bestVehicle", "worstVehicle", "strategicAdvice"]
};

export const analyzeVehicleMaintenance = async (brand: string, model: string, year: number, currentKm: number): Promise<Partial<MaintenanceRule & { description: string }>[]> => {
  const ai = getAiClient();
  if (!ai) return [];

  try {
    const prompt = `
      Act as an expert automotive mechanic and fleet manager in Colombia.
      I have a vehicle: ${brand} ${model} year ${year} with ${currentKm} km.
      
      Please suggest a maintenance schedule specifically optimized for this vehicle model in Colombian terrain conditions (potholes, mountains, traffic).
      
      I need you to estimate the intervals for these critical items based on the car model:
      - Change of Oil and Filters
      - Brake Pads (Frenos)
      - Timing Belt or Chain (Correa/Cadenilla - specify which one it has)
      - Suspension
      - Spark Plugs (Bujías)
      - Tires (Llantas)
      
      Return a JSON array. 
      IMPORTANT: 'intervalKm' must be the full number (e.g., return 5000, NOT 5).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-09-2025', 
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: maintenanceSchema,
        systemInstruction: "You are a helpful AI assistant for a transport business in Colombia."
      }
    });

    const text = response.text;
    if (!text) return [];
    
    const data = JSON.parse(text);
    return data;
  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return [];
  }
};

export const generateVehicleAdvice = async (vehicle: any, transactions: any[]): Promise<any[]> => {
    const ai = getAiClient();
    if (!ai) return [];

    // Calculate basic financials for the context
    const income = transactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
    const balance = income - expense;

    try {
        const prompt = `
          Contexto: Soy dueño de un negocio de transporte en Colombia. Quiero optimizar la rentabilidad.
          
          Datos del Vehículo:
          - Modelo: ${vehicle.brand} ${vehicle.model} ${vehicle.year}.
          - Kilometraje: ${vehicle.currentOdometer} km.
          - Placa: ${vehicle.plate}.
          
          Datos Financieros (Históricos):
          - Total Ingresos: $${income}
          - Total Gastos Mantenimiento: $${expense}
          - Balance: $${balance}
          - Cantidad de registros: ${transactions.length}
          
          Tu tarea:
          Actúa como un analista experto de flotas y mecánico. Dame 4 consejos MUY ESPECÍFICOS basados estrictamente en los datos anteriores.
          
          Enfoque obligatorio:
          1. **Mantenimiento Preventivo**: Basado en el kilometraje actual (${vehicle.currentOdometer}), ¿qué fallo costoso debo prevenir YA para no perder dinero?
          2. **Rentabilidad**: Analiza si el gasto ($${expense}) es alto comparado con el ingreso. Si hay pocos ingresos registrados, advierte sobre la subutilización.
          3. **Optimización**: Un consejo técnico para ahorrar combustible o llantas en este modelo específico (${vehicle.model}).
          
          No inventes datos. Si no hay suficientes transacciones, recomiéndame empezar a registrar más datos para un mejor análisis.
          Responde en JSON array con title, category, priority, content.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-09-2025',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: adviceSchema
            }
        });

        const text = response.text;
        if (!text) return [];
        return JSON.parse(text);

    } catch (error) {
        console.error("Advice generation failed", error);
        return [];
    }
};

export const analyzeBusinessPerformance = async (vehicles: any[], transactions: any[]): Promise<any> => {
    const ai = getAiClient();
    if (!ai) return null;

    try {
        const prompt = `
            Actúa como un Consultor de Negocios de Transporte en Colombia. Analiza mi flota de ${vehicles.length} vehículos.
            
            Datos de la flota (Simplificados):
            ${JSON.stringify(vehicles.map(v => ({ plate: v.plate, model: v.model, year: v.year, km: v.currentOdometer })))}

            Datos financieros (Resumen):
            Total Transacciones: ${transactions.length}
            
            Necesito que analices el rendimiento global.
            1. ¿Cómo está la salud general del negocio?
            2. Identifica patrones de rentabilidad.
            3. Compara los vehículos (cuál da más problemas vs cuál rinde más, asumiendo gastos vs ingresos).
            
            Sé directo, profesional y estratégico.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-09-2025',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: globalAnalysisSchema
            }
        });

        const text = response.text;
        if (!text) return null;
        return JSON.parse(text);
    } catch (error) {
        console.error("Global Analysis Failed", error);
        return null;
    }
}