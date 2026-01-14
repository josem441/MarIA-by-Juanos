import { GoogleGenAI, Type, Schema } from "@google/genai";
import { MaintenanceRule, MaintenanceType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

export const analyzeVehicleMaintenance = async (brand: string, model: string, year: number, currentKm: number): Promise<Partial<MaintenanceRule & { description: string }>[]> => {
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
    try {
        const prompt = `
          Analiza este vehículo para un negocio de transporte en Colombia:
          Vehículo: ${vehicle.brand} ${vehicle.model} ${vehicle.year}.
          Kilometraje actual: ${vehicle.currentOdometer}.
          Historial breve: ${transactions.length} transacciones registradas.
          
          Actúa como un consultor experto de flotas. Dame 4-5 recomendaciones estratégicas Claras.
          Analiza:
          1. Desgastes probables por el kilometraje actual para este modelo específico.
          2. Sugerencias de eficiencia de combustible o cuidado.
          3. Alertas si el carro ya es muy viejo o tiene mucho kilometraje.
          
          Responde en JSON array.
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