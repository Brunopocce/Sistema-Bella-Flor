import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, Wallet, LayoutDashboard, Download, Calendar, LogOut, MapPin, Bike, Bell } from 'lucide-react';
import { SalesForm } from './components/SalesForm';
import { SalesList } from './components/SalesList';
import { PaymentForm } from './components/PaymentForm';
import { PaymentList } from './components/PaymentList';
import { StatCard } from './components/StatCard';
import { LoginScreen } from './components/LoginScreen';
import { DriverDashboard } from './components/DriverDashboard';
import { Sale, SummaryStats, Payment, UserRole, DeliveryLog, ActiveDelivery } from './types';

function App() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userRole, setUserRole] = useState<UserRole>('admin'); // Default, will be set on login
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Notifications State
  const [notification, setNotification] = useState<{message: string, show: boolean}>({ message: '', show: false });

  // Check login status on mount
  useEffect(() => {
    const authStatus = localStorage.getItem('bellaflor_auth');
    const role = localStorage.getItem('bellaflor_role') as UserRole;
    
    if (authStatus === 'true') {
      setIsAuthenticated(true);
      if (role) setUserRole(role);
    }
    setIsAuthChecking(false);
  }, []);

  // Initialize sales state
  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('comissao_tracker_sales_v2'); // Usando v2 para o seed
    return saved ? JSON.parse(saved) : [];
  });

  // Initialize payments state
  const [payments, setPayments] = useState<Payment[]>(() => {
    const saved = localStorage.getItem('comissao_tracker_payments');
    return saved ? JSON.parse(saved) : [];
  });

  // Initialize deliveries state
  const [deliveries, setDeliveries] = useState<DeliveryLog[]>(() => {
    const saved = localStorage.getItem('comissao_tracker_deliveries');
    return saved ? JSON.parse(saved) : [];
  });

  // Initialize ACTIVE deliveries state (In Route)
  const [activeDeliveries, setActiveDeliveries] = useState<ActiveDelivery[]>(() => {
    const saved = localStorage.getItem('comissao_tracker_active_deliveries');
    return saved ? JSON.parse(saved) : [];
  });

  // Persist sales
  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('comissao_tracker_sales_v2', JSON.stringify(sales));
    }
  }, [sales, isAuthenticated]);

  // Persist payments
  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('comissao_tracker_payments', JSON.stringify(payments));
    }
  }, [payments, isAuthenticated]);

  // Persist deliveries
  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('comissao_tracker_deliveries', JSON.stringify(deliveries));
    }
  }, [deliveries, isAuthenticated]);

  // Persist ACTIVE deliveries
  useEffect(() => {
    if (isAuthenticated) {
      localStorage.setItem('comissao_tracker_active_deliveries', JSON.stringify(activeDeliveries));
    }
  }, [activeDeliveries, isAuthenticated]);

  // Listen for storage changes (to sync tabs roughly)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'comissao_tracker_active_deliveries' && e.newValue) {
        setActiveDeliveries(JSON.parse(e.newValue));
      }
      if (e.key === 'comissao_tracker_deliveries' && e.newValue) {
        setDeliveries(JSON.parse(e.newValue));
        // Simple notification if new delivery added
        showNotification("Atualização nas entregas recebida!");
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const showNotification = (msg: string) => {
    setNotification({ message: msg, show: true });
    setTimeout(() => setNotification({ message: '', show: false }), 4000);
  };

  const handleLogin = (role: UserRole) => {
    localStorage.setItem('bellaflor_auth', 'true');
    localStorage.setItem('bellaflor_role', role);
    setUserRole(role);
    setIsAuthenticated(true);
    
    // Reload data
    const savedSales = localStorage.getItem('comissao_tracker_sales_v2');
    const savedPayments = localStorage.getItem('comissao_tracker_payments');
    const savedDeliveries = localStorage.getItem('comissao_tracker_deliveries');
    const savedActiveDeliveries = localStorage.getItem('comissao_tracker_active_deliveries');
    
    if (savedSales) setSales(JSON.parse(savedSales));
    if (savedPayments) setPayments(JSON.parse(savedPayments));
    if (savedDeliveries) setDeliveries(JSON.parse(savedDeliveries));
    if (savedActiveDeliveries) setActiveDeliveries(JSON.parse(savedActiveDeliveries));
  };

  const handleLogout = () => {
    localStorage.removeItem('bellaflor_auth');
    localStorage.removeItem('bellaflor_role');
    setIsAuthenticated(false);
    setUserRole('admin'); // Reset to default
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

  const handleStartDelivery = (orderId: string, address: string) => {
    const newActive: ActiveDelivery = {
      orderId,
      address,
      startTime: Date.now(),
      driverName: 'Entregador'
    };
    setActiveDeliveries(prev => [...prev, newActive]);
  };

  const handleAddDelivery = (orderId: string, address: string) => {
    const newDelivery: DeliveryLog = {
      id: crypto.randomUUID(),
      orderId,
      address,
      deliveredAt: Date.now()
    };
    
    // Remove from active list
    setActiveDeliveries(prev => prev.filter(d => d.orderId !== orderId));
    
    // Add to history
    setDeliveries(prev => [...prev, newDelivery]);
    
    // Show Notification if user is on Admin view
    if (userRole === 'admin') {
      showNotification(`Pedido #${orderId} Entregue com Sucesso!`);
    }
  };

  // Calculate statistics
  const stats: SummaryStats = useMemo(() => {
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
      const value = sale.value;
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

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const exportData = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "TIPO,Data,Nome/Pedido,Valor Venda,Taxa Entrega,Justificativa\n"
      + sales.map(s => `VENDA,${s.date},${s.orderId || '-'},${s.value},${s.deliveryFee || 0},${s.justification || ''}`).join("\n")
      + "\n"
      + payments.map(p => `PAGAMENTO,${p.date},${p.person},${p.value},,`).join("\n")
      + "\n"
      + deliveries.map(d => `ENTREGA,${new Date(d.deliveredAt).toLocaleString()},${d.orderId},,,"${d.address}"`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "relatorio_completo_bellaflor.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s atrás`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m atrás`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h atrás`;
  };

  if (isAuthChecking) {
    return null;
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // --- RENDER DRIVER DASHBOARD ---
  if (userRole === 'driver') {
    return (
      <DriverDashboard 
        onLogout={handleLogout} 
        onAddDelivery={handleAddDelivery} 
        onStartDelivery={handleStartDelivery}
        deliveries={deliveries}
      />
    );
  }

  // --- RENDER ADMIN DASHBOARD ---
  return (
    <div className="min-h-screen bg-gray-50 pb-20 relative">
      {/* Toast Notification */}
      {notification.show && (
        <div className="fixed top-20 right-4 z-50 bg-white border border-green-200 shadow-xl rounded-xl p-4 flex items-center gap-3 animate-in slide-in-from-right duration-300">
            <div className="bg-green-100 p-2 rounded-full">
                <Bike className="w-5 h-5 text-green-600" />
            </div>
            <div>
                <h4 className="text-sm font-bold text-gray-900">Atualização de Entrega</h4>
                <p className="text-xs text-gray-600">{notification.message}</p>
            </div>
        </div>
      )}

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

             {/* Live Delivery Status */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                        </span>
                        <Bike className="w-5 h-5 text-gray-700" />
                    </div>
                    <h3 className="font-bold text-gray-800">Monitoramento de Entregas</h3>
                </div>
                <span className="text-xs font-medium px-2 py-1 bg-white border rounded text-gray-500">
                    Tempo Real
                </span>
              </div>
              
              <div className="p-5">
                {activeDeliveries.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <MapPin className="w-6 h-6 text-gray-300" />
                        </div>
                        <p className="text-gray-400 text-sm font-medium">Nenhum pedido em rota no momento.</p>
                        <p className="text-gray-300 text-xs mt-1">Os pedidos aparecerão aqui quando o motorista iniciar o GPS.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {activeDeliveries.map((delivery, index) => (
                            <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                <div className="bg-white p-2 rounded-full shadow-sm shrink-0">
                                    <Bike className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h4 className="text-sm font-bold text-gray-900">Pedido #{delivery.orderId}</h4>
                                        <span className="text-[10px] font-bold text-blue-600 bg-white px-1.5 py-0.5 rounded shadow-sm animate-pulse">
                                            EM ROTA
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-0.5 truncate">{delivery.address}</p>
                                    <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-400">
                                        <Clock className="w-3 h-3" />
                                        Iniciado {formatTimeAgo(delivery.startTime)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
              </div>
              
              <div className="bg-gray-50 px-5 py-3 border-t border-gray-100">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Últimas Entregas</h4>
                  {deliveries.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Histórico vazio.</p>
                  ) : (
                      <ul className="space-y-2">
                          {deliveries.slice(-3).reverse().map(del => (
                              <li key={del.id} className="text-xs flex justify-between items-center">
                                  <span className="text-gray-600 truncate max-w-[150px]">#{del.orderId} - {del.address}</span>
                                  <span className="text-green-600 font-bold flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" />
                                      {new Date(del.deliveredAt).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                                  </span>
                              </li>
                          ))}
                      </ul>
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
// Added missing imports for CheckCircle2 and Clock which were used in the new component section
import { CheckCircle2, Clock } from 'lucide-react';