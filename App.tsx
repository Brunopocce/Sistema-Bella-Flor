import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, Wallet, LayoutDashboard, Download, Calendar, LogOut } from 'lucide-react';
import { SalesForm } from './components/SalesForm';
import { SalesList } from './components/SalesList';
import { PaymentForm } from './components/PaymentForm';
import { PaymentList } from './components/PaymentList';
import { StatCard } from './components/StatCard';
import { LoginScreen } from './components/LoginScreen';
import { Sale, SummaryStats, Payment } from './types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Check login status on mount
  useEffect(() => {
    const authStatus = localStorage.getItem('bellaflor_auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
    setIsAuthChecking(false);
  }, []);

  // Initialize sales state
  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('comissao_tracker_sales');
    return saved ? JSON.parse(saved) : [];
  });

  // Initialize payments state
  const [payments, setPayments] = useState<Payment[]>(() => {
    const saved = localStorage.getItem('comissao_tracker_payments');
    return saved ? JSON.parse(saved) : [];
  });

  // Persist sales
  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('comissao_tracker_sales', JSON.stringify(sales));
    }
  }, [sales, isAuthenticated]);

  // Persist payments
  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('comissao_tracker_payments', JSON.stringify(payments));
    }
  }, [payments, isAuthenticated]);

  const handleLogin = () => {
    localStorage.setItem('bellaflor_auth', 'true');
    setIsAuthenticated(true);
    // Reload data from local storage to ensure freshness upon login
    const savedSales = localStorage.getItem('comissao_tracker_sales');
    const savedPayments = localStorage.getItem('comissao_tracker_payments');
    if (savedSales) setSales(JSON.parse(savedSales));
    if (savedPayments) setPayments(JSON.parse(savedPayments));
  };

  const handleLogout = () => {
    localStorage.removeItem('bellaflor_auth');
    setIsAuthenticated(false);
  };

  const handleAddSale = (newSaleData: Omit<Sale, 'id' | 'createdAt'>) => {
    const newSale: Sale = {
      ...newSaleData,
      id: crypto.randomUUID(),
      createdAt: Date.now()
    };
    setSales(prev => [...prev, newSale].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const handleUpdateSale = (id: string, newValue: number, newDeliveryFee: number, justification: string) => {
    setSales(prev => prev.map(sale => 
      sale.id === id 
        ? { ...sale, value: newValue, deliveryFee: newDeliveryFee, justification }
        : sale
    ));
  };

  const handleDeleteSale = (id: string) => {
    // Confirmação já é feita no componente SalesList via Modal
    setSales(prev => prev.filter(s => s.id !== id));
  };

  const handleAddPayment = (newPaymentData: Omit<Payment, 'id' | 'createdAt'>) => {
    const newPayment: Payment = {
      ...newPaymentData,
      id: crypto.randomUUID(),
      createdAt: Date.now()
    };
    setPayments(prev => [...prev, newPayment].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const handleDeletePayment = (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este pagamento?")) {
      setPayments(prev => prev.filter(p => p.id !== id));
    }
  };

  // Calculate statistics
  const stats: SummaryStats = useMemo(() => {
    // Total Sales for stats refers to the product value sum (the base for commission)
    const totalSales = sales.reduce((acc, curr) => acc + curr.value, 0);
    const totalCommission = totalSales * 0.15;
    const commissionPerPerson = totalSales * 0.075;

    const paidBruno = payments.filter(p => p.person === 'Bruno').reduce((acc, curr) => acc + curr.value, 0);
    const paidDaniele = payments.filter(p => p.person === 'Daniele').reduce((acc, curr) => acc + curr.value, 0);

    return {
      totalSales,
      totalCommission,
      commissionPerPerson,
      salesCount: sales.length,
      paidBruno,
      paidDaniele,
      balanceBruno: commissionPerPerson - paidBruno,
      balanceDaniele: commissionPerPerson - paidDaniele
    };
  }, [sales, payments]);

  // Calculate last 3 months comparison
  const monthlyComparison = useMemo(() => {
    const grouped: Record<string, number> = {};
    
    sales.forEach(sale => {
      const monthKey = sale.date.substring(0, 7);
      const value = sale.value; // Changed from commission to total sales
      grouped[monthKey] = (grouped[monthKey] || 0) + value;
    });

    return Object.entries(grouped)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 3)
      .map(([key, value]) => {
        const [year, month] = key.split('-');
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
        const label = dateObj.toLocaleString('pt-BR', { month: 'long', year: '2-digit' });
        return { label, value };
      });
  }, [sales]);

  // Chart Data Preparation
  const chartData = useMemo(() => {
    const grouped = sales.reduce((acc, sale) => {
      const [y, m, d] = sale.date.split('-');
      const key = `${d}/${m}`;
      acc[key] = (acc[key] || 0) + sale.value;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => 0) // Keep input order if simplistic, or parse date to sort real
      .slice(-7);
  }, [sales]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const exportData = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "TIPO,Data,Nome/Pedido,Valor Venda,Taxa Entrega,Justificativa\n"
      + sales.map(s => `VENDA,${s.date},${s.orderId || '-'},${s.value},${s.deliveryFee || 0},${s.justification || ''}`).join("\n")
      + "\n"
      + payments.map(p => `PAGAMENTO,${p.date},${p.person},${p.value},,`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "relatorio_completo.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isAuthChecking) {
    return null; // or a loading spinner
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-brand-600 p-2 rounded-lg">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-baseline gap-2">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Vendas</h1>
              <span className="font-logo text-3xl text-brand-600" style={{ transform: 'translateY(2px)' }}>BellaFlor</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={exportData}
              className="text-gray-500 hover:text-brand-600 transition-colors flex items-center gap-1 text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>
            <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>
            <button 
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-600 transition-colors flex items-center gap-1 text-sm font-medium"
              title="Sair do sistema"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="Vendas Totais" 
            value={formatCurrency(stats.totalSales)} 
            icon={DollarSign}
            colorClass="text-emerald-600 bg-emerald-100"
            subValue={`${stats.salesCount} pedidos registrados`}
          />
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col justify-center hover:shadow-md transition-all">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 rounded-lg bg-gray-200 text-black">
                <Calendar className="w-5 h-5 text-black" />
              </div>
              <p className="text-sm font-medium text-gray-500">Últimos 3 Meses (Vendas)</p>
            </div>
            <div className="space-y-3">
              {monthlyComparison.length > 0 ? (
                monthlyComparison.map((month, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span className="capitalize text-gray-600 font-medium">{month.label}</span>
                    <span className="font-bold text-brand-600">{formatCurrency(month.value)}</span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400">Sem dados suficientes</p>
              )}
            </div>
          </div>

          <StatCard 
            title="Bruno (A Pagar)" 
            value={formatCurrency(stats.balanceBruno)} 
            icon={Wallet}
            colorClass="text-blue-600 bg-blue-100"
            subValue={`Total: ${formatCurrency(stats.commissionPerPerson)} | Pago: ${formatCurrency(stats.paidBruno)}`}
          />
          <StatCard 
            title="Daniele (A Pagar)" 
            value={formatCurrency(stats.balanceDaniele)} 
            icon={Wallet}
            colorClass="text-purple-600 bg-purple-100"
            subValue={`Total: ${formatCurrency(stats.commissionPerPerson)} | Pago: ${formatCurrency(stats.paidDaniele)}`}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Form and List */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-4 px-1">Vendas</h2>
              <SalesForm onAddSale={handleAddSale} />
              <SalesList sales={sales} onDelete={handleDeleteSale} onUpdate={handleUpdateSale} />
            </section>
          </div>

          {/* Right Column: Chart & Insights & Payments */}
          <div className="space-y-6">
            
            <div className="space-y-6">
              <PaymentForm onAddPayment={handleAddPayment} />
              <PaymentList payments={payments} onDelete={handleDeletePayment} />
            </div>

             {/* Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-6">Vendas Recentes</h3>
              <div className="h-64 w-full">
                {sales.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#9ca3af', fontSize: 12}}
                        dy={10}
                      />
                      <YAxis 
                        hide={true} 
                      />
                      <Tooltip 
                        cursor={{fill: '#fce7f3'}}
                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                      />
                      <Bar dataKey="value" fill="#ec4899" radius={[4, 4, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                    Sem dados para o gráfico
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

export default App;