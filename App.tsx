import React, { useState, useEffect } from 'react';
import { DEFAULT_MAINTENANCE_RULES, MaintenanceType, Transaction, TransactionType, Vehicle } from './types';
import { Dashboard } from './components/Dashboard';
import { VehicleDetail } from './components/VehicleDetail';
import { exportGlobalSummary, exportVehicleHistory } from './services/excelService';
import { analyzeVehicleMaintenance } from './services/geminiService';
import { DataService } from './services/dataService';
import { X, Loader2, Sparkles, LogIn, Key, LogOut, Cloud, CloudOff, Car, User, Calendar, Wrench, ChevronLeft, Check, ChevronRight } from 'lucide-react';

// Simple ID generator
const generateId = () => Math.random().toString(36).substr(2, 9);

// --- Initial Data for Seeding ---
const INITIAL_VEHICLES: Vehicle[] = [
  {
    id: 'renault-logan-001',
    plate: 'GFT-982',
    aka: 'La Coqueta',
    brand: 'Renault',
    model: 'Logan',
    year: 2020,
    color: 'Gris Estrella',
    driverName: 'Carlos Rodríguez',
    driverId: '1.098.765.432',
    driverPhone: '300 123 4567',
    driverAddress: 'Calle 123 # 45-67, Bogotá',
    driverPhotoUrl: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&auto=format&fit=crop&q=60',
    policyNumber: 'POL-99887766',
    policyPaymentLink: 'https://www.segurosbolivar.com/pagos',
    currentOdometer: 95000,
    lastOdometerUpdate: new Date().toISOString().split('T')[0],
    soatExpiry: '2025-06-15',
    techMechanicalExpiry: '2025-06-15',
    insuranceExpiry: '2025-02-20',
    taxExpiry: '2025-05-30',
    maintenanceRules: [
        { type: MaintenanceType.OIL_FILTER, intervalKm: 6000, warningThresholdKm: 1000 },
        { type: MaintenanceType.TIMING_BELT, intervalKm: 50000, warningThresholdKm: 2000 },
        { type: MaintenanceType.BRAKES, intervalKm: 30000, warningThresholdKm: 1500 },
        ...DEFAULT_MAINTENANCE_RULES.filter(r => ![MaintenanceType.OIL_FILTER, MaintenanceType.BRAKES].includes(r.type))
    ]
  },
  {
    id: 'kia-rio-002',
    plate: 'WXZ-456',
    aka: 'Yeimi',
    brand: 'Kia',
    model: 'Rio Spice',
    year: 2016,
    color: 'Blanco',
    driverName: 'Brayan Stiven López',
    driverId: '1.122.333.444',
    driverPhone: '312 987 6543',
    driverAddress: 'Cra 80 # 12-34, Medellín',
    driverPhotoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&auto=format&fit=crop&q=60',
    policyNumber: 'AXA-554433',
    policyPaymentLink: '',
    currentOdometer: 145000,
    lastOdometerUpdate: new Date().toISOString().split('T')[0],
    soatExpiry: '2025-08-10',
    techMechanicalExpiry: '2025-01-20',
    insuranceExpiry: '2025-11-05',
    taxExpiry: '2025-06-15',
    maintenanceRules: [...DEFAULT_MAINTENANCE_RULES]
  }
];

const App: React.FC = () => {
  // --- Auth State ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState(false);

  // --- Data State ---
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // --- UI State ---
  const [currentView, setCurrentView] = useState<'dashboard' | 'detail'>('dashboard');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  
  // Modals
  const [isAddVehicleModalOpen, setIsAddVehicleModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType>(TransactionType.INCOME);
  const [transactionDefaultCategory, setTransactionDefaultCategory] = useState<string>(''); 

  // Wizard State
  const [wizardStep, setWizardStep] = useState(1);
  const [newVehicleData, setNewVehicleData] = useState<Partial<Vehicle>>({
      maintenanceRules: [...DEFAULT_MAINTENANCE_RULES]
  });
  const [aiAnalysisResults, setAiAnalysisResults] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // --- Data Loading ---
  const loadData = async () => {
      setIsLoadingData(true);
      try {
          let v = await DataService.getVehicles();
          let t = await DataService.getTransactions();
          
          // Seeding if empty
          if (v.length === 0) {
             console.log("Inicializando base de datos...");
             for (const vehicle of INITIAL_VEHICLES) {
                 await DataService.saveVehicle(vehicle);
             }
             v = INITIAL_VEHICLES;
          }
          
          setVehicles(v);
          setTransactions(t);
      } catch (error) {
          console.error("Error loading data", error);
          setIsOnline(false);
      } finally {
          setIsLoadingData(false);
      }
  };

  useEffect(() => {
    if (isLoggedIn) {
        loadData();
    }
  }, [isLoggedIn]);

  // --- Handlers (Optimistic UI) ---

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      setIsLoggedIn(true);
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  const handleLogout = () => {
      setIsLoggedIn(false);
      setPassword('');
      setCurrentView('dashboard');
      setSelectedVehicle(null);
  };

  const openAddVehicleModal = () => {
      setWizardStep(1);
      setNewVehicleData({ maintenanceRules: [...DEFAULT_MAINTENANCE_RULES] });
      setAiAnalysisResults([]);
      setIsAddVehicleModalOpen(true);
  };

  const handleWizardNext = async (e: React.FormEvent) => {
      e.preventDefault();
      const formData = new FormData(e.target as HTMLFormElement);
      const data = Object.fromEntries(formData.entries());
      const updatedData = { ...newVehicleData, ...data };
      setNewVehicleData(updatedData);

      if (wizardStep < 4) {
          if (wizardStep === 3) {
             setWizardStep(4);
             await runAiAnalysis(updatedData);
          } else {
             setWizardStep(prev => prev + 1);
          }
      } else {
          finalizeAddVehicle(updatedData);
      }
  };

  const handleWizardBack = () => {
      if (wizardStep > 1) setWizardStep(prev => prev - 1);
  };

  const runAiAnalysis = async (data: any) => {
      setIsAnalyzing(true);
      try {
          const suggestions = await analyzeVehicleMaintenance(
              data.brand, data.model, parseInt(data.year), parseInt(data.currentOdometer)
          );
          setAiAnalysisResults(suggestions);
          let rules = [...(data.maintenanceRules || DEFAULT_MAINTENANCE_RULES)];
          suggestions.forEach(suggestion => {
              const idx = rules.findIndex(r => r.type === suggestion.type);
              const newRule = {
                  type: suggestion.type as MaintenanceType || MaintenanceType.OTHER,
                  intervalKm: suggestion.intervalKm,
                  intervalMonths: suggestion.intervalMonths,
                  warningThresholdKm: 500,
                  warningThresholdDays: 15,
                  description: suggestion.description
              };
              if (idx >= 0) rules[idx] = { ...rules[idx], ...newRule } as any;
              else rules.push(newRule as any);
          });
          setNewVehicleData(prev => ({ ...prev, maintenanceRules: rules }));
      } catch (e) { console.error(e); } finally { setIsAnalyzing(false); }
  };

  const finalizeAddVehicle = async (data: any) => {
      const newVehicle: Vehicle = {
        id: generateId(),
        plate: (data.plate || '').toUpperCase(),
        aka: data.aka,
        brand: data.brand,
        model: data.model,
        year: parseInt(data.year),
        color: data.color,
        driverName: data.driverName,
        driverId: data.driverId,
        driverPhone: data.driverPhone,
        currentOdometer: parseInt(data.currentOdometer),
        lastOdometerUpdate: new Date().toISOString().split('T')[0],
        soatExpiry: data.soatExpiry,
        techMechanicalExpiry: data.techMechanicalExpiry,
        insuranceExpiry: data.insuranceExpiry,
        taxExpiry: data.taxExpiry,
        maintenanceRules: data.maintenanceRules
      };

      // OPTIMISTIC UPDATE
      setVehicles(prev => [...prev, newVehicle]);
      setIsAddVehicleModalOpen(false);
      
      // Async Save
      await DataService.saveVehicle(newVehicle);
  };

  const handleAddTransaction = async (formData: any) => {
    if (!selectedVehicle) return;
    const formOdometer = formData.odometer ? parseInt(formData.odometer) : null;
    const finalOdometer = formOdometer && !isNaN(formOdometer) ? formOdometer : selectedVehicle.currentOdometer;

    const newTx: Transaction = {
      id: generateId(),
      vehicleId: selectedVehicle.id,
      date: formData.date,
      type: transactionType,
      amount: parseFloat(formData.amount),
      category: formData.category,
      description: formData.description,
      odometerSnapshot: finalOdometer
    };

    // OPTIMISTIC UPDATE
    setTransactions(prev => [...prev, newTx]);
    setIsTransactionModalOpen(false);

    // Async Save
    await DataService.saveTransaction(newTx);
  };
  
  const handleEditTransaction = async (updatedTx: Transaction) => {
      // OPTIMISTIC UPDATE
      setTransactions(prev => prev.map(t => t.id === updatedTx.id ? updatedTx : t));
      
      // Async Save
      await DataService.saveTransaction(updatedTx);
  };

  const updateVehicleOdometer = async (newVal: number) => {
    if (selectedVehicle) {
        const updated = { ...selectedVehicle, currentOdometer: newVal, lastOdometerUpdate: new Date().toISOString().split('T')[0] };
        
        // OPTIMISTIC UPDATE
        setSelectedVehicle(updated);
        setVehicles(prev => prev.map(v => v.id === updated.id ? updated : v));
        
        // Async Save
        await DataService.saveVehicle(updated);
    }
  };

  const handleUpdateVehicle = async (updatedVehicle: Vehicle) => {
      // OPTIMISTIC UPDATE
      setSelectedVehicle(updatedVehicle);
      setVehicles(prev => prev.map(v => v.id === updatedVehicle.id ? updatedVehicle : v));

      // Async Save
      await DataService.saveVehicle(updatedVehicle);
  };

  // --- Views ---

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#05123D] p-4 font-['Source_Sans_3']">
        {/* Usamos un fondo más oscuro para el form para asegurar contraste si el blur falla */}
        <div className="bg-slate-900/80 backdrop-blur-md p-8 rounded-3xl shadow-2xl w-full max-w-md border border-white/10">
            <div className="text-center mb-8">
                <div className="bg-[#37F230] w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(55,242,48,0.3)]">
                    <Sparkles className="text-[#05123D]" size={36} />
                </div>
                <h1 className="text-3xl font-black text-white font-['Nunito']">
                    MarIA<span className="text-[#37F230]"> by Juanos</span>
                </h1>
                <p className="text-slate-300 mt-2">Gestor de Flota de Transportes</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-5">
                <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2 font-['Nunito']">Contraseña</label>
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-4 bg-black/20 border border-white/10 rounded-xl focus:ring-2 focus:ring-[#37F230] focus:border-[#37F230] outline-none transition-all text-white placeholder-slate-500"
                        placeholder="••••••••"
                    />
                </div>
                {loginError && <p className="text-rose-400 text-sm font-bold bg-rose-900/20 p-2 rounded-lg text-center">Contraseña incorrecta (Hint: admin123)</p>}
                <button 
                    type="submit"
                    className="w-full bg-[#37F230] text-[#05123D] py-4 rounded-xl font-black text-lg hover:bg-[#32d62b] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center shadow-lg"
                >
                    <LogIn size={20} className="mr-2" /> Ingresar
                </button>
            </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#05123D] text-slate-100 font-['Source_Sans_3']">
      {/* Top Navigation */}
      <header className="bg-[#05123D] border-b border-white/10 sticky top-0 z-10 backdrop-blur-xl bg-opacity-90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => { setCurrentView('dashboard'); setSelectedVehicle(null); }}>
                <div className="bg-[#37F230] p-2 rounded-xl group-hover:scale-110 transition-transform shadow-[0_0_15px_rgba(55,242,48,0.2)]">
                    <Sparkles size={24} className="text-[#05123D]" /> 
                </div>
                <span className="text-2xl font-black text-white tracking-tight font-['Nunito']">
                    MarIA<span className="text-[#37F230]"> by Juanos</span>
                </span>
            </div>
            <div className="flex items-center space-x-4">
                <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 border ${isOnline ? 'bg-white/10 text-[#37F230] border-white/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                     {isOnline ? <Cloud size={12} /> : <CloudOff size={12} />} 
                     {isOnline ? 'Cloud Sync' : 'Modo Local'}
                </div>
                <div className="text-xs text-right hidden sm:block">
                    <p className="font-bold text-white font-['Nunito']">Admin</p>
                    <p className="text-[#37F230]">Sesión Activa</p>
                </div>
                <div className="w-10 h-10 bg-slate-700/50 rounded-full border-2 border-[#37F230] shadow-sm flex items-center justify-center">
                    <Key size={18} className="text-[#37F230]" />
                </div>
                <button 
                    onClick={handleLogout}
                    title="Cerrar Sesión"
                    className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-transparent hover:border-white/10"
                >
                    <LogOut size={20} />
                </button>
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Loading State Overlay */}
        {isLoadingData && (
             <div className="fixed inset-0 z-40 bg-[#05123D]/80 flex items-center justify-center backdrop-blur-sm">
                 <div className="text-center">
                     <Loader2 className="animate-spin text-[#37F230] mx-auto mb-4" size={48} />
                     <p className="text-white font-bold animate-pulse">Sincronizando flota...</p>
                 </div>
             </div>
        )}

        {currentView === 'dashboard' && (
            <Dashboard 
                vehicles={vehicles}
                transactions={transactions}
                onSelectVehicle={(v) => { setSelectedVehicle(v); setCurrentView('detail'); }}
                onAddVehicle={openAddVehicleModal}
                onExport={() => exportGlobalSummary(vehicles, transactions)}
            />
        )}

        {currentView === 'detail' && selectedVehicle && (
            <VehicleDetail 
                vehicle={selectedVehicle}
                transactions={transactions.filter(t => t.vehicleId === selectedVehicle.id)}
                onBack={() => { setCurrentView('dashboard'); setSelectedVehicle(null); }}
                onAddTransaction={(type, category) => { 
                    setTransactionType(type); 
                    setTransactionDefaultCategory(category || '');
                    setIsTransactionModalOpen(true); 
                }}
                onUpdateOdometer={updateVehicleOdometer}
                onUpdateVehicle={handleUpdateVehicle}
                onEditTransaction={handleEditTransaction}
                onExport={() => exportVehicleHistory(selectedVehicle, transactions)}
            />
        )}
      </main>

      {/* --- WIZARD MODAL FOR ADD VEHICLE --- */}
      {isAddVehicleModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col text-slate-800">
                {/* Wizard Header */}
                <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 font-['Nunito']">Registrar Vehículo</h2>
                        <div className="flex items-center space-x-2 mt-2">
                             {[1, 2, 3, 4].map(step => (
                                 <div key={step} className={`h-1.5 w-8 rounded-full transition-colors ${step <= wizardStep ? 'bg-[#37F230]' : 'bg-slate-200'}`} />
                             ))}
                             <span className="text-xs text-slate-400 ml-2">Paso {wizardStep} de 4</span>
                        </div>
                    </div>
                    <button onClick={() => setIsAddVehicleModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                </div>
                
                {/* Wizard Content */}
                <form id="wizardForm" onSubmit={handleWizardNext} className="flex-1 overflow-y-auto p-6">
                    
                    {/* STEP 1: VEHICLE IDENTITY */}
                    {wizardStep === 1 && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex items-center gap-3 text-[#05123D] mb-4">
                                <Car size={24} />
                                <h3 className="text-lg font-bold font-['Nunito']">Información del Vehículo</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Placa</label>
                                    <input name="plate" required placeholder="AAA-123" defaultValue={newVehicleData.plate} className="input-field uppercase" autoFocus />
                                </div>
                                <div>
                                    <label className="label">Sobrenombre (A.K.A)</label>
                                    <input name="aka" placeholder="Ej: La Coqueta" defaultValue={newVehicleData.aka} className="input-field" />
                                </div>
                                <div>
                                    <label className="label">Kilometraje Actual</label>
                                    <input name="currentOdometer" type="number" required placeholder="0" defaultValue={newVehicleData.currentOdometer} className="input-field" />
                                </div>
                                <div>
                                    <label className="label">Marca</label>
                                    <input name="brand" required placeholder="Renault" defaultValue={newVehicleData.brand} className="input-field" />
                                </div>
                                <div>
                                    <label className="label">Modelo</label>
                                    <input name="model" required placeholder="Logan" defaultValue={newVehicleData.model} className="input-field" />
                                </div>
                                <div>
                                    <label className="label">Año</label>
                                    <input name="year" type="number" required placeholder="2022" defaultValue={newVehicleData.year} className="input-field" />
                                </div>
                                <div>
                                    <label className="label">Color</label>
                                    <input name="color" placeholder="Gris" defaultValue={newVehicleData.color} className="input-field" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: DRIVER INFO */}
                    {wizardStep === 2 && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex items-center gap-3 text-[#05123D] mb-4">
                                <User size={24} />
                                <h3 className="text-lg font-bold font-['Nunito']">Datos del Conductor</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="label">Nombre Completo</label>
                                    <input name="driverName" required placeholder="Juan Pérez" defaultValue={newVehicleData.driverName} className="input-field" autoFocus />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Cédula</label>
                                        <input name="driverId" required placeholder="1.000.000" defaultValue={newVehicleData.driverId} className="input-field" />
                                    </div>
                                    <div>
                                        <label className="label">Teléfono</label>
                                        <input name="driverPhone" required placeholder="300..." defaultValue={newVehicleData.driverPhone} className="input-field" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: DOCUMENTATION */}
                    {wizardStep === 3 && (
                        <div className="space-y-6 animate-fade-in">
                             <div className="flex items-center gap-3 text-[#05123D] mb-4">
                                <Calendar size={24} />
                                <h3 className="text-lg font-bold font-['Nunito']">Documentación y Vencimientos</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Vencimiento SOAT</label>
                                        <input name="soatExpiry" type="date" required defaultValue={newVehicleData.soatExpiry} className="input-field" />
                                    </div>
                                    <div>
                                        <label className="label">Vencimiento Tecno Mecánica</label>
                                        <input name="techMechanicalExpiry" type="date" required defaultValue={newVehicleData.techMechanicalExpiry} className="input-field" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Vencimiento Póliza Todo Riesgo</label>
                                        <input name="insuranceExpiry" type="date" required defaultValue={newVehicleData.insuranceExpiry} className="input-field" />
                                    </div>
                                    <div>
                                        <label className="label">Vencimiento Impuestos</label>
                                        <input name="taxExpiry" type="date" required defaultValue={newVehicleData.taxExpiry} className="input-field" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: AI ANALYSIS & REVIEW */}
                    {wizardStep === 4 && (
                        <div className="space-y-6 animate-fade-in h-full flex flex-col">
                            <div className="flex items-center gap-3 text-[#05123D] mb-2">
                                <Wrench size={24} />
                                <h3 className="text-lg font-bold font-['Nunito']">Plan de Mantenimiento Sugerido</h3>
                            </div>
                            
                            {isAnalyzing ? (
                                <div className="flex-1 flex flex-col items-center justify-center min-h-[200px] text-slate-500">
                                    <Loader2 className="animate-spin mb-3 text-[#05123D]" size={40} />
                                    <p className="font-medium">Analizando modelo {newVehicleData.brand} {newVehicleData.model}...</p>
                                    <p className="text-xs">Consultando especificaciones técnicas y condiciones de terreno.</p>
                                </div>
                            ) : (
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex-1 overflow-y-auto max-h-[300px] space-y-3">
                                    <div className="text-sm text-slate-600 mb-2">
                                        Hemos generado un plan basado en tu <strong>{newVehicleData.brand} {newVehicleData.model} ({newVehicleData.year})</strong>:
                                    </div>
                                    {newVehicleData.maintenanceRules?.map((rule, idx) => (
                                        <div key={idx} className="bg-white p-3 rounded-lg border border-slate-100 flex justify-between items-center shadow-sm">
                                            <div>
                                                <div className="font-semibold text-slate-800">{rule.type}</div>
                                                <div className="text-xs text-slate-500">
                                                    {(rule as any).description || 'Mantenimiento estándar'}
                                                </div>
                                            </div>
                                            <div className="text-right text-sm font-medium text-[#05123D]">
                                                {rule.intervalKm ? `${rule.intervalKm.toLocaleString()} km` : ''}
                                                {rule.intervalKm && rule.intervalMonths ? ' o ' : ''}
                                                {rule.intervalMonths ? `${rule.intervalMonths} meses` : ''}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </form>

                {/* Wizard Footer */}
                <div className="p-4 border-t border-slate-100 flex justify-between bg-white">
                    <button 
                        type="button" 
                        onClick={handleWizardBack}
                        disabled={wizardStep === 1 || isAnalyzing}
                        className="px-4 py-2 text-slate-500 hover:text-slate-800 disabled:opacity-30 flex items-center"
                    >
                        <ChevronLeft size={16} className="mr-1" /> Atrás
                    </button>
                    
                    <button 
                        form="wizardForm"
                        type="submit"
                        disabled={isAnalyzing}
                        className="px-6 py-2 bg-[#05123D] hover:bg-[#030b26] text-white rounded-lg flex items-center shadow-lg disabled:opacity-70 font-bold"
                    >
                        {wizardStep === 4 ? (
                            <>Confirmar y Guardar <Check size={16} className="ml-2"/></>
                        ) : (
                            <>Siguiente <ChevronRight size={16} className="ml-2"/></>
                        )}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {isTransactionModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-scale-up text-slate-800">
                <div className={`p-6 border-b flex justify-between items-center ${transactionType === TransactionType.INCOME ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
                    <h2 className={`text-xl font-bold font-['Nunito'] ${transactionType === TransactionType.INCOME ? 'text-emerald-800' : 'text-rose-800'}`}>
                        Registrar {transactionType === TransactionType.INCOME ? 'Ingreso' : 'Gasto'}
                    </h2>
                    <button onClick={() => setIsTransactionModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24}/></button>
                </div>
                <div className="p-6">
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        const data = Object.fromEntries(formData.entries());
                        handleAddTransaction(data);
                    }} className="space-y-4">
                        
                        <div>
                            <label className="label">Monto</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-slate-400">$</span>
                                <input 
                                    name="amount" 
                                    type="number" 
                                    required 
                                    defaultValue={transactionType === TransactionType.INCOME ? 390000 : undefined}
                                    className="input-field pl-8 font-mono text-lg" 
                                />
                            </div>
                            {transactionType === TransactionType.INCOME && <p className="text-xs text-emerald-600 mt-1">Sugerido: Liquidación Semanal</p>}
                        </div>

                        <div>
                            <label className="label">Fecha</label>
                            <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="input-field" />
                        </div>
                        
                        <div>
                            <label className="label">Kilometraje al momento (Opcional)</label>
                            <div className="relative">
                                <input 
                                    name="odometer" 
                                    type="number" 
                                    defaultValue={selectedVehicle?.currentOdometer} 
                                    placeholder={selectedVehicle?.currentOdometer.toString()}
                                    className="input-field" 
                                />
                                <p className="text-xs text-slate-400 mt-1">Si se deja vacío, se usará el actual: {selectedVehicle?.currentOdometer} km</p>
                            </div>
                        </div>

                        <div>
                            <label className="label">Categoría</label>
                            {transactionType === TransactionType.INCOME ? (
                                <select name="category" className="input-field">
                                    <option value="Liquidación Semanal">Liquidación Semanal</option>
                                    <option value="Bono">Bono</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            ) : (
                                <select name="category" className="input-field" defaultValue={transactionDefaultCategory}>
                                    {Object.values(MaintenanceType).map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div>
                            <label className="label">Descripción / Notas</label>
                            <textarea name="description" rows={3} className="input-field" placeholder="Detalles adicionales..."></textarea>
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <button type="button" onClick={() => setIsTransactionModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold">Cancelar</button>
                            <button type="submit" className={`px-6 py-2 text-white rounded-lg shadow-lg font-bold ${transactionType === TransactionType.INCOME ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'}`}>
                                Guardar
                            </button>
                        </div>
                    </form>
                </div>
             </div>
        </div>
      )}

      <style>{`
        .input-field {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #e2e8f0;
            border-radius: 0.75rem;
            outline: none;
            transition: all 0.2s;
            color: #05123D;
            background-color: #f8fafc;
        }
        .input-field:focus {
            border-color: #37F230;
            box-shadow: 0 0 0 3px rgba(55, 242, 48, 0.2);
        }
        .label {
            display: block;
            font-size: 0.875rem;
            font-weight: 700;
            color: #64748b;
            margin-bottom: 0.25rem;
        }
      `}</style>
    </div>
  );
};

export default App;