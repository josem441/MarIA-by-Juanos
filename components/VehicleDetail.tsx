import React, { useState } from 'react';
import { Vehicle, Transaction, TransactionType, MaintenanceRule, MaintenanceType } from '../types';
import { generateVehicleAdvice } from '../services/geminiService';
import { 
  ArrowLeft, Plus, AlertTriangle, CheckCircle, FileDown, Calendar, User, 
  Truck, Phone, Hash, Edit2, Save, ChevronDown, ChevronUp, ChevronRight, History, 
  Shield, FileText, Wrench, Thermometer, Droplet, Gauge, Activity, Zap, X, ExternalLink, MapPin, Sparkles, Brain, Lightbulb, DollarSign, TrendingUp, Cherry,
  Landmark, Settings
} from 'lucide-react';

interface VehicleDetailProps {
  vehicle: Vehicle;
  transactions: Transaction[];
  onBack: () => void;
  onAddTransaction: (type: TransactionType, category?: string) => void;
  onUpdateOdometer: (newOdometer: number) => void;
  onUpdateVehicle: (updatedVehicle: Vehicle) => void;
  onEditTransaction: (tx: Transaction) => void;
  onExport: () => void;
}

const getIconForMaintenance = (type: string | MaintenanceType) => {
    switch (type) {
        case MaintenanceType.OIL_FILTER: return <Droplet size={18} />;
        case MaintenanceType.TRANSMISSION_OIL: return <Droplet size={18} />;
        case MaintenanceType.BRAKES: return <Activity size={18} />;
        case MaintenanceType.TIRES: return <Gauge size={18} />; 
        case MaintenanceType.SPARK_PLUGS: return <Zap size={18} />;
        case MaintenanceType.AC_RECHARGE: return <Thermometer size={18} />;
        case MaintenanceType.OTHER: return <DollarSign size={18} />;
        case MaintenanceType.TAXES: return <Landmark size={18} />;
        case MaintenanceType.TRANSMISSION_OIL: return <Settings size={18} />;
        default: return <Wrench size={18} />;
    }
};

export const VehicleDetail: React.FC<VehicleDetailProps> = ({ 
  vehicle, transactions, onBack, onAddTransaction, onUpdateOdometer, onUpdateVehicle, onEditTransaction, onExport 
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'maintenance' | 'ai' | 'income'>('maintenance');
  const [odometerInput, setOdometerInput] = useState(vehicle.currentOdometer.toString());
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [isEditingDocs, setIsEditingDocs] = useState(false);
  const [docDates, setDocDates] = useState({
      soat: vehicle.soatExpiry,
      tech: vehicle.techMechanicalExpiry,
      insurance: vehicle.insuranceExpiry,
      taxes: vehicle.taxExpiry
  });
  
  // AI State
  const [aiAdvice, setAiAdvice] = useState<any[]>([]);
  const [isGeneratingAdvice, setIsGeneratingAdvice] = useState(false);

  // Modals
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [isInsuranceModalOpen, setIsInsuranceModalOpen] = useState(false);
  
  // Editing Maintenance
  const [editingRule, setEditingRule] = useState<MaintenanceType | null>(null);
  const [manualDate, setManualDate] = useState('');
  const [manualKm, setManualKm] = useState('');
  
  // Editing Transaction
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const income = transactions.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);

  const formatCurrency = (val: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  // Check if this is "La Coqueta" for custom icon
  const isCoqueta = vehicle.aka?.toLowerCase().includes('coqueta');
  const MainIcon = isCoqueta ? Cherry : Truck;

  // --- Logic Helpers ---

  const getMaintenanceStatus = (rule: MaintenanceRule) => {
    const categoryTransactions = sortedTransactions.filter(t => 
      t.type === TransactionType.EXPENSE && 
      (t.category === rule.type)
    );
    const lastMaintenance = categoryTransactions[0]; 

    // Determine the "Last Performed" data (Transaction OR Manual Override)
    let lastDate = lastMaintenance ? lastMaintenance.date : null;
    let lastKm = lastMaintenance?.odometerSnapshot || 0;

    // Override if manual data exists and is preferred
    if (rule.lastManualDate) {
         if (!lastDate || new Date(rule.lastManualDate) > new Date(lastDate)) {
             lastDate = rule.lastManualDate;
         }
    }
    if (rule.lastManualKm) {
        if (rule.lastManualKm > lastKm) {
            lastKm = rule.lastManualKm;
        }
    }

    let status: 'ok' | 'warning' | 'danger' = 'ok';
    let message = 'Al día';
    let totalSpent = categoryTransactions.reduce((acc, t) => acc + t.amount, 0);

    // Logic for KM
    if (rule.intervalKm) {
      const nextDueKm = lastKm + rule.intervalKm;
      const kmRemaining = nextDueKm - vehicle.currentOdometer;

      if (lastKm === 0 && !lastDate) {
          status = 'warning';
          message = 'Sin registro';
      } else if (kmRemaining <= 0) {
        status = 'danger';
        message = `Vencido`;
      } else if (rule.warningThresholdKm && kmRemaining <= rule.warningThresholdKm) {
        status = 'warning';
        message = `Próximo a cambio`;
      } else {
        status = 'ok';
        message = `OK`;
      }
      
      return { status, message, lastDate, totalSpent, transactions: categoryTransactions, lastKm, kmRemaining, type: 'km' };
    } 
    // Logic for Time
    else if (rule.intervalMonths) {
       const baseDate = lastDate ? new Date(lastDate) : new Date(vehicle.year, 0, 1);
       const nextDueDate = new Date(baseDate);
       nextDueDate.setMonth(nextDueDate.getMonth() + rule.intervalMonths);
       
       const today = new Date();
       const diffTime = nextDueDate.getTime() - today.getTime();
       const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

       if (lastKm === 0 && !lastDate && !rule.lastManualDate) {
           status = 'warning';
           message = 'Sin registro';
       } else if (diffDays <= 0) {
        status = 'danger';
        message = `Vencido`;
       } else if (rule.warningThresholdDays && diffDays <= rule.warningThresholdDays) {
        status = 'warning';
        message = `Próximo`;
       } else {
           status = 'ok';
           message = 'OK';
       }
       return { status, message, lastDate, totalSpent, transactions: categoryTransactions, lastKm, diffDays, type: 'time' };
    }

    return { status: 'ok', message: 'Vigente', lastDate: null, totalSpent: 0, transactions: [], lastKm: 0, type: 'doc' };
  };

  const handleBlurOdometer = () => {
    const val = parseInt(odometerInput);
    if (!isNaN(val) && val !== vehicle.currentOdometer) {
        onUpdateOdometer(val);
    }
  };

  const handleSaveDocs = () => {
      onUpdateVehicle({
          ...vehicle,
          soatExpiry: docDates.soat,
          techMechanicalExpiry: docDates.tech,
          insuranceExpiry: docDates.insurance,
          taxExpiry: docDates.taxes
      });
      setIsEditingDocs(false);
  };

  const handleManualMaintenanceUpdate = (type: MaintenanceType) => {
      const updatedRules = vehicle.maintenanceRules.map(r => {
          if (r.type === type) {
              return { 
                  ...r, 
                  lastManualDate: manualDate || r.lastManualDate,
                  lastManualKm: manualKm ? parseInt(manualKm) : r.lastManualKm
              };
          }
          return r;
      });
      onUpdateVehicle({ ...vehicle, maintenanceRules: updatedRules });
      setEditingRule(null);
      setManualDate('');
      setManualKm('');
  };

  const handleGenerateAdvice = async () => {
      setIsGeneratingAdvice(true);
      try {
          const advice = await generateVehicleAdvice(vehicle, transactions);
          setAiAdvice(advice);
      } finally {
          setIsGeneratingAdvice(false);
      }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20 relative text-slate-800">
      
      {/* 1. TOP HEADER & ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <button onClick={onBack} className="group flex items-center text-slate-400 hover:text-[#37F230] transition-colors">
          <div className="bg-white/10 p-2 rounded-full shadow-sm border border-white/20 group-hover:border-[#37F230] mr-3">
             <ArrowLeft size={18} /> 
          </div>
          <span className="font-bold">Volver</span>
        </button>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <button 
                onClick={onExport}
                className="flex items-center px-4 py-2.5 text-sm font-bold text-slate-400 bg-[#05123D]/50 border border-white/10 rounded-xl hover:bg-white/10 hover:text-white transition-all whitespace-nowrap backdrop-blur-md"
            >
                <FileDown size={18} className="mr-2" /> Reporte Excel
            </button>
            <div className="h-full w-px bg-white/10 mx-1 hidden md:block"></div>
            <button 
                onClick={() => onAddTransaction(TransactionType.INCOME)}
                className="flex items-center px-5 py-2.5 text-sm font-black text-[#05123D] bg-[#37F230] rounded-xl hover:bg-[#32d62b] shadow-lg shadow-green-500/20 transition-all whitespace-nowrap"
            >
                <Plus size={18} className="mr-2" strokeWidth={3} /> Ingreso
            </button>
            <button 
                onClick={() => onAddTransaction(TransactionType.EXPENSE)}
                className="flex items-center px-5 py-2.5 text-sm font-black text-white bg-rose-600 rounded-xl hover:bg-rose-700 shadow-lg shadow-rose-500/20 transition-all whitespace-nowrap"
            >
                <Plus size={18} className="mr-2" strokeWidth={3} /> Gasto
            </button>
        </div>
      </div>

      {/* 2. VEHICLE PROFILE CARD */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 md:p-8 relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#37F230]/20 to-transparent rounded-bl-full -z-0"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row gap-8">
            {/* Left: Car Identity */}
            <div className="flex-1">
                <div className="flex items-center gap-4 mb-2">
                    <div className="bg-[#05123D] text-[#37F230] p-4 rounded-2xl shadow-lg">
                        <MainIcon size={40} strokeWidth={1.5} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-[#05123D] tracking-tight font-['Nunito']">{vehicle.plate}</h1>
                        {vehicle.aka && (
                            <div className="text-xl font-bold text-slate-400 italic mt-0.5">"{vehicle.aka}"</div>
                        )}
                        <div className="flex gap-2 mt-3">
                             <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold uppercase rounded-lg border border-slate-200">
                                {vehicle.brand}
                             </span>
                             <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold uppercase rounded-lg border border-slate-200">
                                {vehicle.model}
                             </span>
                             <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg border border-slate-200">
                                {vehicle.year}
                             </span>
                        </div>
                    </div>
                </div>

                {/* Driver Info Button */}
                <div className="mt-6">
                    <button 
                        onClick={() => setIsDriverModalOpen(true)}
                        className="flex items-center gap-3 bg-slate-50 hover:bg-[#37F230]/10 border border-slate-200 hover:border-[#37F230] text-slate-700 px-5 py-3 rounded-2xl transition-all group"
                    >
                        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden group-hover:ring-2 ring-[#37F230] transition-all">
                            {vehicle.driverPhotoUrl ? (
                                <img src={vehicle.driverPhotoUrl} alt="Driver" className="w-full h-full object-cover" />
                            ) : (
                                <User size={24} className="m-2 text-slate-400"/>
                            )}
                        </div>
                        <div className="text-left">
                            <p className="text-xs font-bold text-slate-400 uppercase group-hover:text-[#37F230]">Conductor Asignado</p>
                            <p className="font-bold text-sm text-[#05123D]">{vehicle.driverName}</p>
                        </div>
                        <ChevronRight size={16} className="ml-2 text-slate-400 group-hover:text-[#37F230]" />
                    </button>
                </div>
            </div>

            {/* Right: Metrics */}
            <div className="flex flex-col items-end justify-between min-w-[200px]">
                 <div className="text-right">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Kilometraje</label>
                    <div className="flex items-center justify-end gap-2 group">
                        <input 
                            type="number" 
                            value={odometerInput}
                            onChange={(e) => setOdometerInput(e.target.value)}
                            onBlur={handleBlurOdometer}
                            className="text-4xl font-black text-[#05123D] bg-transparent text-right w-48 border-b-2 border-transparent hover:border-slate-200 focus:border-[#37F230] outline-none transition-all font-['Nunito']"
                        />
                        <span className="text-sm font-bold text-slate-400 mt-2">km</span>
                        <Edit2 size={14} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity mt-2" />
                    </div>
                 </div>

                 <div className="mt-6 md:mt-0 text-right bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Balance Total</label>
                    <div className={`text-3xl font-black font-['Nunito'] ${income - expense >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCurrency(income - expense)}
                    </div>
                 </div>
            </div>
        </div>
      </div>

      {/* 3. TABS NAVIGATION */}
      <div className="flex space-x-2 bg-white/10 p-1.5 rounded-2xl w-fit mx-auto md:mx-0 overflow-x-auto backdrop-blur-md">
         <button 
            onClick={() => setActiveTab('maintenance')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'maintenance' ? 'bg-[#37F230] text-[#05123D] shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
         >
            Mantenimiento
         </button>
         <button 
            onClick={() => setActiveTab('history')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'history' ? 'bg-[#37F230] text-[#05123D] shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
         >
            Historial
         </button>
         <button 
            onClick={() => setActiveTab('ai')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'ai' ? 'bg-[#37F230] text-[#05123D] shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
         >
            <Sparkles size={16} /> Recomendaciones IA
         </button>
         <button 
            onClick={() => setActiveTab('income')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'income' ? 'bg-[#37F230] text-[#05123D] shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
         >
            <TrendingUp size={16} /> Ingresos
         </button>
      </div>

      {activeTab === 'maintenance' && (
        <div className="space-y-8">
            
            {/* SECTION: DOCUMENTATION CARDS */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2 font-['Nunito']">
                        <Calendar className="text-[#37F230]"/> Documentación
                    </h3>
                    <button 
                        onClick={() => isEditingDocs ? handleSaveDocs() : setIsEditingDocs(true)}
                        className={`text-xs font-bold px-4 py-2 rounded-full border transition-all flex items-center gap-2
                        ${isEditingDocs ? 'bg-[#37F230] text-[#05123D] border-[#37F230]' : 'bg-transparent text-slate-300 border-slate-600 hover:border-slate-400'}`}
                    >
                        {isEditingDocs ? <><Save size={14}/> Guardar Cambios</> : <><Edit2 size={14}/> Editar Fechas</>}
                    </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { type: MaintenanceType.SOAT, label: 'SOAT', key: 'soat', icon: <Shield size={24}/> }, 
                        { type: MaintenanceType.TECH_MECHANICAL, label: 'Tecno Mecánica', key: 'tech', icon: <Wrench size={24}/> },
                        { type: MaintenanceType.INSURANCE_POLICY, label: 'Póliza Seguros', key: 'insurance', icon: <FileText size={24}/> },
                        { type: MaintenanceType.TAXES, label: 'Impuestos', key: 'taxes', icon: <Landmark size={24}/> }
                    ].map(item => {
                        // Docs Status Logic: Expired (<0), Warning (<30), OK (>=30)
                        const dateValue = docDates[item.key as keyof typeof docDates];
                        let status = 'ok';
                        let message = 'Vigente';
                        
                        if (dateValue) {
                            const days = Math.ceil((new Date(dateValue).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                            if (days < 0) {
                                status = 'danger';
                                message = 'Vencido';
                            } else if (days < 30) {
                                status = 'warning';
                                message = `Vence en ${days} días`;
                            } else {
                                status = 'ok';
                                message = `Vigente (${Math.floor(days/30)} meses)`;
                            }
                        } else {
                             status = 'warning';
                             message = 'Sin fecha';
                        }
                        
                        const isPolicy = item.type === MaintenanceType.INSURANCE_POLICY;

                        return (
                            <div 
                                key={item.key} 
                                onClick={() => isPolicy && !isEditingDocs ? setIsInsuranceModalOpen(true) : null}
                                className={`bg-white rounded-2xl p-5 border border-slate-200 shadow-lg relative overflow-hidden group hover:scale-[1.02] transition-all 
                                ${isPolicy && !isEditingDocs ? 'cursor-pointer' : ''}`}
                            >
                                <div className="flex items-start justify-between relative z-10">
                                    <div className="p-3 bg-[#05123D]/5 text-[#05123D] rounded-xl mb-3 inline-block">
                                        {item.icon}
                                    </div>
                                    <div className={`px-3 py-1 rounded-lg text-xs font-bold uppercase
                                        ${status === 'ok' ? 'bg-[#37F230]/20 text-emerald-800' : status === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                                        {message}
                                    </div>
                                </div>
                                
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center">
                                    {item.label}
                                    {isPolicy && <ExternalLink size={12} className="ml-1 opacity-50"/>}
                                </h4>
                                
                                {isEditingDocs ? (
                                    <input 
                                        type="date" 
                                        value={dateValue}
                                        onChange={(e) => setDocDates({...docDates, [item.key]: e.target.value})}
                                        className="w-full mt-1 p-2 border border-[#37F230] rounded-lg text-lg font-bold text-[#05123D] focus:outline-none focus:ring-2 focus:ring-[#37F230] bg-slate-50"
                                    />
                                ) : (
                                    <div className="text-xl font-black text-[#05123D] tracking-tight font-['Nunito']">
                                        {dateValue || 'Sin fecha'}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* SECTION: MAINTENANCE ACCORDION */}
            <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4 font-['Nunito']">
                    <Truck className="text-[#37F230]"/> Mecánica Preventiva
                </h3>

                <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                    {/* STANDARD RULES */}
                    {vehicle.maintenanceRules.filter(r => 
                        ![MaintenanceType.SOAT, MaintenanceType.TECH_MECHANICAL, MaintenanceType.INSURANCE_POLICY, MaintenanceType.TAXES].includes(r.type) &&
                        // Remove requested items from UI even if they exist in DB
                        r.type !== MaintenanceType.SUSPENSION &&
                        r.type !== MaintenanceType.SPARK_PLUGS
                    ).map((rule, idx) => {
                         const status = getMaintenanceStatus(rule);
                         const isExpanded = expandedRule === rule.type;
                         const isEditingThis = editingRule === rule.type;

                         return (
                            <div key={idx} className="border-b border-slate-100 last:border-0 group">
                                <div 
                                    className={`p-5 flex flex-col lg:flex-row lg:items-center cursor-pointer transition-colors ${isExpanded ? 'bg-[#37F230]/10' : 'hover:bg-slate-50'}`}
                                >
                                    {/* Left: Icon & Name & Recommendation */}
                                    <div className="flex items-start gap-4 flex-1 mb-4 lg:mb-0" onClick={() => setExpandedRule(isExpanded ? null : rule.type)}>
                                        <div className={`p-3 rounded-xl transition-colors mt-1 ${status.status === 'danger' ? 'bg-rose-100 text-rose-600' : status.status === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-[#05123D]'}`}>
                                            {getIconForMaintenance(rule.type)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-[#05123D] text-lg font-['Nunito']">{rule.type}</div>
                                            <div className="text-xs text-slate-500 font-medium mt-1">
                                                <span className="bg-slate-100 px-2 py-1 rounded-md text-slate-600 border border-slate-200">
                                                   RECOMENDACIÓN: Cada {rule.intervalKm ? `${rule.intervalKm.toLocaleString()} km` : ''} 
                                                   {rule.intervalKm && rule.intervalMonths ? ' o ' : ''}
                                                   {rule.intervalMonths ? `${rule.intervalMonths} meses` : ''}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Actual Data (Last Date/Km) & Status */}
                                    <div className="flex items-center justify-between lg:justify-end gap-6 w-full lg:w-auto pl-12 lg:pl-0">
                                        
                                        {/* Column 1: LAST TIME (Primary Info) */}
                                        <div className="text-left lg:text-right min-w-[120px]" onClick={() => setExpandedRule(isExpanded ? null : rule.type)}>
                                            <div className="text-xs font-bold text-slate-400 uppercase mb-0.5 tracking-wider">Última Vez</div>
                                            <div className="text-sm font-bold text-slate-700">
                                                {status.lastDate || '—'}
                                            </div>
                                            <div className="text-xs text-slate-500 font-semibold">
                                                {status.lastKm ? `${status.lastKm.toLocaleString()} km` : ''}
                                            </div>
                                        </div>

                                        {/* Column 2: STATUS (Remaining) */}
                                        <div className="text-left lg:text-right min-w-[100px]" onClick={() => setExpandedRule(isExpanded ? null : rule.type)}>
                                            <div className="text-xs font-bold text-slate-400 uppercase mb-0.5 tracking-wider">Estado</div>
                                            <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase ${status.status === 'ok' ? 'bg-[#37F230]/20 text-emerald-800' : status.status === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                                                {status.type === 'km' && (
                                                    <span>{status.kmRemaining !== undefined ? (status.kmRemaining > 0 ? `Quedan ${status.kmRemaining.toLocaleString()}` : `Vencido ${Math.abs(status.kmRemaining).toLocaleString()}`) : status.message} km</span>
                                                )}
                                                {status.type === 'time' && (
                                                    <span>{status.diffDays !== undefined ? (status.diffDays > 0 ? `Quedan ${status.diffDays} días` : `Vencido`) : status.message}</span>
                                                )}
                                                {status.type === 'doc' && <span>{status.message}</span>}
                                            </div>
                                        </div>
                                        
                                        {/* Actions */}
                                        <div className="flex items-center gap-1">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setEditingRule(rule.type); }}
                                                className="p-2 hover:bg-[#37F230]/20 rounded-full text-slate-400 hover:text-[#05123D] transition-colors"
                                                title="Corregir fecha manual (si no hay transacción)"
                                            >
                                                <Edit2 size={16}/>
                                            </button>
                                            <div className="text-slate-400 group-hover:text-[#05123D] transition-colors" onClick={() => setExpandedRule(isExpanded ? null : rule.type)}>
                                                {isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Manual Edit Form */}
                                {isEditingThis && (
                                    <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-wrap items-center gap-3 animate-fade-in shadow-inner">
                                        <span className="text-sm font-bold text-[#05123D]">Actualizar registro de "Última Vez":</span>
                                        <input 
                                            type="date" 
                                            className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-[#37F230] outline-none"
                                            onChange={(e) => setManualDate(e.target.value)}
                                        />
                                        <input 
                                            type="number" 
                                            placeholder="Km en ese momento"
                                            className="px-3 py-2 rounded-lg border border-slate-300 text-sm w-40 focus:border-[#37F230] outline-none"
                                            onChange={(e) => setManualKm(e.target.value)}
                                        />
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleManualMaintenanceUpdate(rule.type)}
                                                className="px-4 py-2 bg-[#37F230] text-[#05123D] text-sm rounded-lg font-bold hover:bg-[#32d62b]"
                                            >
                                                Guardar
                                            </button>
                                            <button 
                                                onClick={() => setEditingRule(null)}
                                                className="px-4 py-2 text-slate-500 hover:bg-slate-200 rounded-lg text-sm font-bold"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="bg-slate-50 p-4 sm:p-6 border-t border-slate-100 animate-slide-down">
                                        <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4">
                                            <h5 className="font-bold text-slate-700 text-sm flex items-center gap-2 uppercase tracking-wide">
                                                <History size={16}/> Historial Financiero
                                            </h5>
                                            <div className="flex items-center gap-3">
                                                 <div className="bg-[#05123D] text-white px-4 py-2 rounded-xl shadow-md text-sm font-bold">
                                                    Inversión Total: <span className="text-[#37F230] ml-1">{formatCurrency(status.totalSpent)}</span>
                                                </div>
                                                <button 
                                                    onClick={() => onAddTransaction(TransactionType.EXPENSE, rule.type)}
                                                    className="bg-[#37F230] text-[#05123D] px-4 py-2 rounded-xl shadow-md text-sm font-bold hover:bg-[#32d62b] flex items-center gap-2 border border-green-400"
                                                >
                                                    <Plus size={16} strokeWidth={3}/> Registrar Mantenimiento
                                                </button>
                                            </div>
                                        </div>

                                        {status.transactions.length > 0 ? (
                                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                                <table className="w-full text-sm text-left">
                                                    <thead>
                                                        <tr className="bg-slate-100 text-slate-500 text-xs uppercase font-bold border-b border-slate-200">
                                                            <th className="px-4 py-3">Fecha</th>
                                                            <th className="px-4 py-3">Odómetro</th>
                                                            <th className="px-4 py-3">Nota</th>
                                                            <th className="px-4 py-3 text-right">Costo</th>
                                                            <th className="px-4 py-3 w-10"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {status.transactions.map(t => (
                                                            <tr key={t.id} className="hover:bg-slate-50">
                                                                <td className="px-4 py-3 text-[#05123D] font-medium">{t.date}</td>
                                                                <td className="px-4 py-3 text-slate-600">
                                                                    {t.odometerSnapshot ? `${t.odometerSnapshot.toLocaleString()} km` : '-'}
                                                                </td>
                                                                <td className="px-4 py-3 text-slate-500 italic truncate max-w-[200px]">{t.description || '-'}</td>
                                                                <td className="px-4 py-3 text-right font-bold text-slate-800">{formatCurrency(t.amount)}</td>
                                                                <td className="px-4 py-3 text-center">
                                                                    <button 
                                                                        onClick={() => setEditingTransaction(t)}
                                                                        className="text-slate-400 hover:text-[#05123D]"
                                                                    >
                                                                        <Edit2 size={14}/>
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 bg-white rounded-xl border border-dashed border-slate-300">
                                                <p className="text-slate-400 text-sm font-medium">No se han registrado transacciones financieras.</p>
                                                <button 
                                                    onClick={() => onAddTransaction(TransactionType.EXPENSE, rule.type)}
                                                    className="mt-3 text-[#05123D] bg-[#37F230] px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#32d62b]"
                                                >
                                                    Registrar gasto ahora
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                         )
                    })}

                    {/* "OTHER / VARIOS" BLOCK (Always at bottom) */}
                    <div className="border-t border-slate-100 group">
                        {(() => {
                             const othersTransactions = sortedTransactions.filter(t => 
                                t.type === TransactionType.EXPENSE && 
                                (t.category === MaintenanceType.OTHER || !vehicle.maintenanceRules.some(r => r.type === t.category))
                             );
                             const totalOthers = othersTransactions.reduce((acc, t) => acc + t.amount, 0);
                             const isExpanded = expandedRule === 'others';

                             return (
                                <>
                                    <div 
                                        className={`p-5 flex flex-col lg:flex-row lg:items-center cursor-pointer transition-colors ${isExpanded ? 'bg-[#37F230]/10' : 'hover:bg-slate-50'}`}
                                        onClick={() => setExpandedRule(isExpanded ? null : 'others')}
                                    >
                                        <div className="flex items-start gap-4 flex-1">
                                            <div className="p-3 rounded-xl bg-slate-100 text-slate-500">
                                                <DollarSign size={18} />
                                            </div>
                                            <div>
                                                <div className="font-bold text-[#05123D] text-lg font-['Nunito']">Otros / Varios</div>
                                                <div className="text-xs text-slate-500 font-medium mt-1">
                                                    Reporte contable de gastos no categorizados
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-end gap-6 mt-3 lg:mt-0">
                                             <div className="text-right">
                                                <div className="text-sm font-bold text-slate-700">
                                                    Total: {formatCurrency(totalOthers)}
                                                </div>
                                             </div>
                                             <div className="text-slate-400 group-hover:text-[#05123D] transition-colors">
                                                {isExpanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                                            </div>
                                        </div>
                                    </div>
                                    {isExpanded && (
                                        <div className="bg-slate-50 p-4 sm:p-6 border-t border-slate-100 animate-slide-down">
                                            <div className="flex items-center justify-between mb-4">
                                                <h5 className="font-bold text-slate-700 text-sm flex items-center gap-2 uppercase tracking-wide">
                                                    <History size={16}/> Historial de Varios
                                                </h5>
                                                <button 
                                                    onClick={() => onAddTransaction(TransactionType.EXPENSE, MaintenanceType.OTHER)}
                                                    className="bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg shadow-sm text-xs font-bold hover:bg-slate-300 flex items-center gap-2"
                                                >
                                                    <Plus size={14} /> Agregar Otro
                                                </button>
                                            </div>
                                            {othersTransactions.length > 0 ? (
                                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                                    <table className="w-full text-sm text-left">
                                                        <thead>
                                                            <tr className="bg-slate-100 text-slate-500 text-xs uppercase font-bold border-b border-slate-200">
                                                                <th className="px-4 py-3">Fecha</th>
                                                                <th className="px-4 py-3">Categoría</th>
                                                                <th className="px-4 py-3">Nota</th>
                                                                <th className="px-4 py-3 text-right">Costo</th>
                                                                <th className="px-4 py-3 w-10"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {othersTransactions.map(t => (
                                                                <tr key={t.id} className="hover:bg-slate-50">
                                                                    <td className="px-4 py-3 text-[#05123D] font-medium">{t.date}</td>
                                                                    <td className="px-4 py-3 text-slate-600">{t.category}</td>
                                                                    <td className="px-4 py-3 text-slate-500 italic truncate max-w-[200px]">{t.description || '-'}</td>
                                                                    <td className="px-4 py-3 text-right font-bold text-slate-800">{formatCurrency(t.amount)}</td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        <button 
                                                                            onClick={() => setEditingTransaction(t)}
                                                                            className="text-slate-400 hover:text-[#05123D]"
                                                                        >
                                                                            <Edit2 size={14}/>
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : <p className="text-slate-400 text-sm italic">Sin registros.</p>}
                                        </div>
                                    )}
                                </>
                             )
                        })()}
                    </div>
                </div>
            </div>

        </div>
      )}

      {activeTab === 'ai' && (
          <div className="space-y-6 animate-fade-in">
              <div className="bg-gradient-to-r from-[#05123D] to-indigo-950 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl border border-white/10">
                  <div className="relative z-10 max-w-2xl">
                      <h2 className="text-3xl font-black mb-2 flex items-center gap-3 font-['Nunito']"><Brain className="text-[#37F230]" /> Consultor de Flota IA</h2>
                      <p className="text-slate-300 mb-6 font-medium text-lg">
                          Analizo el modelo de tu vehículo, su desgaste actual y el historial de mantenimiento para sugerirte mejoras estratégicas.
                      </p>
                      <button 
                        onClick={handleGenerateAdvice}
                        disabled={isGeneratingAdvice}
                        className="bg-[#37F230] text-[#05123D] px-8 py-4 rounded-xl font-black shadow-[0_0_20px_rgba(55,242,48,0.3)] hover:bg-[#32d62b] transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-lg hover:scale-105"
                      >
                          {isGeneratingAdvice ? <><span className="animate-spin">⏳</span> Analizando...</> : <><Sparkles size={20}/> Generar Diagnóstico</>}
                      </button>
                  </div>
                  <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-[#37F230]/10 to-transparent"></div>
              </div>

              {aiAdvice.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {aiAdvice.map((item, idx) => (
                          <div key={idx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md hover:shadow-xl transition-all border-l-8"
                               style={{ borderLeftColor: item.priority === 'Alta' ? '#ef4444' : item.priority === 'Media' ? '#f59e0b' : '#37F230' }}>
                              <div className="flex justify-between items-start mb-3">
                                  <h3 className="font-bold text-[#05123D] text-lg font-['Nunito']">{item.title}</h3>
                                  <span className={`text-xs px-2 py-1 rounded font-bold uppercase
                                      ${item.priority === 'Alta' ? 'bg-red-100 text-red-700' : item.priority === 'Media' ? 'bg-amber-100 text-amber-700' : 'bg-[#37F230]/20 text-emerald-800'}`}>
                                      {item.priority}
                                  </span>
                              </div>
                              <p className="text-slate-600 text-sm leading-relaxed font-medium">{item.content}</p>
                              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                  <Lightbulb size={14} className="text-[#37F230]" /> {item.category}
                              </div>
                          </div>
                      ))}
                  </div>
              )}
              
              {!isGeneratingAdvice && aiAdvice.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                      <p className="text-lg">Presiona el botón para generar un plan de acción.</p>
                  </div>
              )}
          </div>
      )}

      {activeTab === 'income' && (
          <div className="space-y-6 animate-fade-in">
              {/* Income Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#37F230] text-[#05123D] p-6 rounded-3xl shadow-xl shadow-green-500/20 relative overflow-hidden">
                      <div className="relative z-10">
                          <p className="text-emerald-900 font-bold uppercase tracking-wider mb-1">Total Ingresos Recaudados</p>
                          <h3 className="text-4xl font-black font-['Nunito']">{formatCurrency(income)}</h3>
                      </div>
                      <div className="absolute right-0 bottom-0 p-4 opacity-20">
                          <TrendingUp size={80} />
                      </div>
                  </div>
                  <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-200">
                      <p className="text-slate-500 font-bold uppercase tracking-wider mb-1">Promedio por Transacción</p>
                      <h3 className="text-4xl font-black text-[#05123D] font-['Nunito']">
                          {transactions.filter(t => t.type === TransactionType.INCOME).length > 0 
                            ? formatCurrency(income / transactions.filter(t => t.type === TransactionType.INCOME).length)
                            : '$0'}
                      </h3>
                  </div>
              </div>

              <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-[#05123D] flex items-center gap-2 font-['Nunito']">
                        <DollarSign className="text-[#37F230]" size={24}/> Historial de Ingresos
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Fecha</th>
                                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Categoría</th>
                                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Descripción</th>
                                <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs text-right">Monto</th>
                                <th className="px-6 py-4 w-10"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedTransactions.filter(t => t.type === TransactionType.INCOME).map(t => (
                                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 text-[#05123D] font-bold whitespace-nowrap">{t.date}</td>
                                    <td className="px-6 py-4 text-slate-700 font-medium">{t.category}</td>
                                    <td className="px-6 py-4 text-slate-500 max-w-xs truncate">{t.description}</td>
                                    <td className="px-6 py-4 text-right font-black text-[#37F230] text-base drop-shadow-sm" style={{textShadow: '0 1px 1px rgba(0,0,0,0.1)'}}>
                                        + {formatCurrency(t.amount)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button 
                                            onClick={() => setEditingTransaction(t)}
                                            className="text-slate-400 hover:text-[#05123D]"
                                        >
                                            <Edit2 size={16}/>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {sortedTransactions.filter(t => t.type === TransactionType.INCOME).length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-12 text-slate-400 font-medium">No hay ingresos registrados.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
             </div>
          </div>
      )}

      {activeTab === 'history' && (
         <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h3 className="text-xl font-bold text-[#05123D] font-['Nunito']">Todas las Transacciones</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-white text-slate-500 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Fecha</th>
                            <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Tipo</th>
                            <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Categoría</th>
                            <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Descripción</th>
                            <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs text-right">Monto</th>
                            <th className="px-6 py-4 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {sortedTransactions.map(t => (
                            <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-[#05123D] font-bold whitespace-nowrap">{t.date}</td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider ${t.type === TransactionType.INCOME ? 'bg-[#37F230]/20 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                        {t.type === TransactionType.INCOME ? 'Ingreso' : 'Gasto'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-700 font-medium">{t.category}</td>
                                <td className="px-6 py-4 text-slate-500 max-w-xs truncate">{t.description}</td>
                                <td className={`px-6 py-4 text-right font-black text-base ${t.type === TransactionType.INCOME ? 'text-[#37F230]' : 'text-rose-600'}`} style={{textShadow: t.type === TransactionType.INCOME ? '0 1px 1px rgba(0,0,0,0.1)' : 'none'}}>
                                    {t.type === TransactionType.EXPENSE && '- '}{formatCurrency(t.amount)}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button 
                                        onClick={() => setEditingTransaction(t)}
                                        className="text-slate-400 hover:text-[#05123D]"
                                    >
                                        <Edit2 size={16}/>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
         </div>
      )}

      {/* --- DRIVER MODAL --- */}
      {isDriverModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl animate-scale-up relative overflow-hidden">
                <button 
                    onClick={() => setIsDriverModalOpen(false)}
                    className="absolute top-3 right-3 p-2 bg-black/10 hover:bg-black/20 rounded-full text-white z-20"
                >
                    <X size={20} />
                </button>
                
                <div className="h-32 bg-[#05123D] relative">
                     <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
                </div>
                
                <div className="px-6 pb-6 text-center relative">
                    <div className="w-24 h-24 rounded-full border-4 border-white shadow-xl mx-auto -mt-12 overflow-hidden bg-slate-200">
                        {vehicle.driverPhotoUrl ? (
                            <img src={vehicle.driverPhotoUrl} alt="Driver" className="w-full h-full object-cover" />
                        ) : (
                            <User size={48} className="w-full h-full p-4 text-slate-400" />
                        )}
                    </div>
                    
                    <h2 className="text-xl font-black text-[#05123D] mt-3 font-['Nunito']">{vehicle.driverName}</h2>
                    <p className="text-slate-500 text-sm mb-6 font-bold uppercase tracking-wide">Conductor Autorizado</p>
                    
                    <div className="space-y-4 text-left">
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="bg-white p-2 rounded-xl shadow-sm text-[#05123D]"><Hash size={18} /></div>
                            <div>
                                <p className="text-xs text-slate-400 uppercase font-bold">Cédula</p>
                                <p className="text-slate-700 font-bold">{vehicle.driverId}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="bg-white p-2 rounded-xl shadow-sm text-[#37F230]"><Phone size={18} /></div>
                            <div>
                                <p className="text-xs text-slate-400 uppercase font-bold">Contacto</p>
                                <p className="text-slate-700 font-bold">{vehicle.driverPhone}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="bg-white p-2 rounded-xl shadow-sm text-rose-500"><MapPin size={18} /></div>
                            <div>
                                <p className="text-xs text-slate-400 uppercase font-bold">Dirección</p>
                                <p className="text-slate-700 font-medium text-sm">{vehicle.driverAddress || 'No registrada'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- INSURANCE MODAL --- */}
      {isInsuranceModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl animate-scale-up relative p-6">
                <button 
                    onClick={() => setIsInsuranceModalOpen(false)}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                >
                    <X size={24} />
                </button>
                
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-[#05123D]/5 text-[#05123D] rounded-2xl">
                        <FileText size={28} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-[#05123D] font-['Nunito']">Póliza Todo Riesgo</h2>
                        <p className="text-xs text-slate-500 font-bold uppercase">Detalles de aseguradora</p>
                    </div>
                </div>
                
                <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Número de Póliza</label>
                        <div className="text-xl font-mono text-[#05123D] font-black tracking-wide select-all">
                            {vehicle.policyNumber || 'No registrado'}
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Vencimiento</label>
                        <div className="text-lg text-[#05123D] font-bold">
                            {vehicle.insuranceExpiry}
                        </div>
                    </div>
                    
                    {vehicle.policyPaymentLink && (
                        <a 
                            href={vehicle.policyPaymentLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block w-full py-4 bg-[#05123D] hover:bg-black text-white text-center rounded-xl font-black shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                        >
                            Ir a Pagar <ExternalLink size={16}/>
                        </a>
                    )}
                </div>
             </div>
        </div>
      )}

      {/* --- EDIT TRANSACTION MODAL --- */}
      {editingTransaction && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6">
                  <h3 className="text-xl font-black mb-4 text-[#05123D] font-['Nunito']">Editar Transacción</h3>
                  <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      const updated = {
                          ...editingTransaction,
                          amount: parseFloat(formData.get('amount') as string),
                          date: formData.get('date') as string,
                          description: formData.get('description') as string,
                          odometerSnapshot: formData.get('odometer') ? parseInt(formData.get('odometer') as string) : editingTransaction.odometerSnapshot
                      };
                      onEditTransaction(updated);
                      setEditingTransaction(null);
                  }} className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Fecha</label>
                          <input name="date" type="date" defaultValue={editingTransaction.date} className="w-full border p-3 rounded-xl focus:border-[#37F230] outline-none font-bold text-[#05123D]" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Monto</label>
                          <input name="amount" type="number" defaultValue={editingTransaction.amount} className="w-full border p-3 rounded-xl focus:border-[#37F230] outline-none font-bold text-[#05123D]" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Descripción</label>
                          <input name="description" defaultValue={editingTransaction.description} className="w-full border p-3 rounded-xl focus:border-[#37F230] outline-none font-bold text-[#05123D]" />
                      </div>
                       <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Kilometraje (Referencia)</label>
                          <input name="odometer" type="number" defaultValue={editingTransaction.odometerSnapshot} className="w-full border p-3 rounded-xl focus:border-[#37F230] outline-none font-bold text-[#05123D]" />
                      </div>
                      <div className="flex gap-2 pt-2">
                          <button type="button" onClick={() => setEditingTransaction(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 font-bold">Cancelar</button>
                          <button type="submit" className="flex-1 py-3 bg-[#37F230] hover:bg-[#32d62b] text-[#05123D] rounded-xl font-black">Guardar</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

    </div>
  );
};