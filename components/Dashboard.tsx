import React from 'react';
import { Vehicle, Transaction, TransactionType } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { FileDown, Plus, Car, DollarSign, Wallet, ArrowRight, Truck, Cherry } from 'lucide-react';

interface DashboardProps {
  vehicles: Vehicle[];
  transactions: Transaction[];
  onSelectVehicle: (v: Vehicle) => void;
  onAddVehicle: () => void;
  onExport: () => void;
}

const COLORS = ['#37F230', '#ef4444']; // Brand Green for income, Red for expense

export const Dashboard: React.FC<DashboardProps> = ({ vehicles, transactions, onSelectVehicle, onAddVehicle, onExport }) => {
  
  // Calculate Global Stats
  const totalIncome = transactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  // Chart Data: Last 6 months (simplified grouping)
  const chartData = vehicles.map(v => {
    const vTrans = transactions.filter(t => t.vehicleId === v.id);
    const inc = vTrans.filter(t => t.type === TransactionType.INCOME).reduce((s, t) => s + t.amount, 0);
    const exp = vTrans.filter(t => t.type === TransactionType.EXPENSE).reduce((s, t) => s + t.amount, 0);
    return {
      name: v.plate,
      Ingresos: inc,
      Gastos: exp
    };
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-[#37F230]/20 rounded-full text-[#05123D]">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Ingresos Totales</p>
            <h3 className="text-2xl font-black text-[#05123D] font-['Nunito']">{formatCurrency(totalIncome)}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-rose-100 rounded-full text-rose-600">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Egresos Totales</p>
            <h3 className="text-2xl font-black text-[#05123D] font-['Nunito']">{formatCurrency(totalExpense)}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 flex items-center space-x-4">
          <div className={`p-3 rounded-full ${balance >= 0 ? 'bg-blue-100 text-[#05123D]' : 'bg-orange-100 text-orange-600'}`}>
            <Car size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Balance Neto</p>
            <h3 className={`text-2xl font-black font-['Nunito'] ${balance >= 0 ? 'text-[#05123D]' : 'text-orange-600'}`}>
              {formatCurrency(balance)}
            </h3>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart Section */}
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-[#05123D] font-['Nunito']">Rendimiento por Vehículo</h3>
            <button onClick={onExport} className="flex items-center text-sm font-semibold text-slate-500 hover:text-[#05123D] transition-colors">
              <FileDown size={16} className="mr-1" /> Exportar Global
            </button>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" tick={{fontSize: 12, fontWeight: 600}} />
                <YAxis stroke="#64748b" tickFormatter={(val) => `$${val/1000}k`} tick={{fontSize: 12}} />
                <RechartsTooltip 
                  cursor={{fill: '#f1f5f9'}}
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontFamily: 'Source Sans 3' }}
                />
                <Legend iconType="circle" />
                <Bar dataKey="Ingresos" fill="#37F230" radius={[6, 6, 0, 0]} barSize={30} />
                <Bar dataKey="Gastos" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vehicle List - Grid of Cards */}
        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 lg:bg-transparent lg:border-none lg:p-0">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white font-['Nunito']">Tu Flota ({vehicles.length})</h3>
            <button 
              onClick={onAddVehicle}
              className="bg-[#37F230] hover:bg-[#32d62b] text-[#05123D] px-3 py-1.5 rounded-xl transition-all shadow-md shadow-green-200/50 hover:scale-105 flex items-center text-sm font-bold"
            >
              <Plus size={16} strokeWidth={3} className="mr-1" /> Nuevo
            </button>
          </div>
          
          <div className="space-y-4">
            {vehicles.map(v => {
                const isCoqueta = v.aka?.toLowerCase().includes('coqueta');
                const Icon = isCoqueta ? Cherry : Truck;
                
                return (
                  <div 
                    key={v.id} 
                    onClick={() => onSelectVehicle(v)}
                    className="group bg-white rounded-2xl p-5 shadow-lg hover:shadow-2xl hover:scale-105 transition-all cursor-pointer relative overflow-hidden border border-slate-100"
                  >
                    {/* Background Icon Watermark */}
                    <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:rotate-12">
                       <Icon size={120} color="#05123D" />
                    </div>

                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-2">
                            {/* License Plate Style Badge */}
                            <div className="bg-[#fbbf24] text-[#05123D] font-black font-mono px-2 py-1 rounded-md border-2 border-[#05123D] shadow-sm transform -rotate-2 text-sm">
                                {v.plate}
                            </div>
                            <div className={`p-2 rounded-full ${isCoqueta ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                <Icon size={20} />
                            </div>
                        </div>

                        <h4 className="font-black text-[#05123D] text-xl font-['Nunito'] mb-1">
                            {v.aka || v.model}
                        </h4>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">
                            {v.brand} • {v.year}
                        </p>

                        <div className="flex items-center justify-between mt-2">
                             <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
                                    {v.driverPhotoUrl ? (
                                        <img src={v.driverPhotoUrl} className="w-full h-full object-cover"/> 
                                    ) : <div className="bg-slate-300 w-full h-full"></div>}
                                </div>
                                <span className="text-xs font-bold text-slate-600 truncate max-w-[100px]">{v.driverName.split(' ')[0]}</span>
                             </div>

                             <button className="bg-[#05123D] text-[#37F230] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center group-hover:bg-[#37F230] group-hover:text-[#05123D] transition-colors">
                                Administrar <ArrowRight size={12} className="ml-1" />
                             </button>
                        </div>
                    </div>
                  </div>
                );
            })}
            
            {vehicles.length === 0 && (
              <div className="text-center py-10 text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                <p>No hay vehículos.</p>
                <p className="text-sm">¡Comienza tu imperio!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};