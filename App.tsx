import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, Wallet, LayoutDashboard, FileText, Calendar, LogOut, Bike, MapPin, CheckCircle2, Clock, X, Download, User, ChevronDown, ChevronRight, ArrowLeftRight } from 'lucide-react';
import { SalesForm } from './components/SalesForm';
import { SalesList } from './components/SalesList';
import { PaymentForm } from './components/PaymentForm';
import { PaymentList } from './components/PaymentList';
import { StatCard } from './components/StatCard';
import { LoginScreen } from './components/LoginScreen';
import { DriverDashboard } from './components/DriverDashboard';
import { Sale, SummaryStats, Payment, UserRole, Delivery } from './types';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';

// Declaration for jsPDF
declare global {
  interface Window { jspdf: any; }
}

function App() {
  // --- STATE MANAGEMENT ---
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Data states from Supabase
  const [sales, setSales] = useState<Sale[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  
  // UI states
  const [notification, setNotification] = useState<{message: string, show: boolean}>({ message: '', show: false });
  const [selectedPeriod, setSelectedPeriod] = useState<'current' | 'previous'>('current');
  
  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportMonth, setExportMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // State for Delivery Accordion
  const [expandedDeliveryDates, setExpandedDeliveryDates] = useState<string[]>([]);

  // --- HELPER TO RESOLVE ROLE ---
  const resolveUserRole = (session: Session | null): UserRole | null => {
    if (!session?.user) return null;
    const email = session.user.email;
    
    // Força a role 'driver' para emails conhecidos de entregadores
    // Isso corrige casos onde o metadata do usuário pode estar incorreto ou ausente
    if (email === 'everton@bellaflor.com.br' || email === 'driver@bellaflor.com') {
        return 'driver';
    }
    
    return (session.user.user_metadata?.role as UserRole) || null;
  };

  const resolveDriverName = (email?: string) => {
    if (!email) return 'Motorista';
    if (email === 'everton@bellaflor.com.br') return 'Everton';
    if (email === 'driver@bellaflor.com') return 'Entregador Padrão';
    return email.split('@')[0]; // Fallback para parte do email
  };

  // --- AUTHENTICATION & DATA FETCHING ---
  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUserRole(resolveUserRole(session));
      setIsLoading(false);
    });

    // 2. Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUserRole(resolveUserRole(session));
      if (_event === 'SIGNED_OUT') {
          // Clear all data on sign out logic handled in handleLogout as well
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  // 3. Fetch data when user is authenticated
  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  // 4. Set up real-time subscriptions for deliveries with OPTIMISTIC UPDATES
  useEffect(() => {
    if (!session) return;
    
    const deliveriesChannel = supabase
      .channel('public:deliveries')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, (payload) => {
        
        // Handle State Updates Locally for Instant Feedback
        if (payload.eventType === 'INSERT') {
            const newDelivery = payload.new as Delivery;
            setDeliveries(prev => {
                // REMOVE OPTIMISTIC (TEMPORARY) ITEM:
                // Remove any item with a negative ID (optimistic) that matches the order_id of the real item coming from DB
                // This prevents duplicates on screen
                const cleanPrev = prev.filter(d => d.id > 0 || d.order_id !== newDelivery.order_id);
                
                // Avoid duplicates if the real item is already there (rare race condition)
                if (cleanPrev.some(d => d.id === newDelivery.id)) return cleanPrev;

                return [newDelivery, ...cleanPrev];
            });
        } 
        else if (payload.eventType === 'UPDATE') {
            const updatedDelivery = payload.new as Delivery;
            setDeliveries(prev => prev.map(d => d.id === updatedDelivery.id ? updatedDelivery : d));
            
            // Notification logic for Admin
            if (userRole === 'admin' && updatedDelivery.status === 'delivered') {
                const driverName = resolveDriverName(updatedDelivery.driver_email);
                showNotification(`Pedido #${updatedDelivery.order_id} entregue por ${driverName}!`);
            }
        } 
        else if (payload.eventType === 'DELETE') {
            setDeliveries(prev => prev.filter(d => d.id !== payload.old.id));
            if (userRole === 'admin') {
               showNotification(`Uma entrega foi removida da rota.`);
            }
        }
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(deliveriesChannel);
    };
  }, [session, userRole]);


  const fetchData = async () => {
    fetchSales();
    fetchPayments();
    fetchDeliveries();
  };
  
  const handleDbError = (error: any) => {
    if (error.message && error.message.includes("Could not find the table")) {
        alert("⚠️ Configuração Necessária!\n\nAs tabelas do banco de dados ainda não foram criadas no Supabase.\n\nPor favor, copie o código do arquivo 'database.sql' e execute-o no 'SQL Editor' do painel do Supabase.");
    } else {
        console.error("Database error:", error);
    }
  };
  
  const fetchSales = async () => {
      const { data, error } = await supabase.from('sales').select('*').order('date', { ascending: false });
      if (error) handleDbError(error);
      else setSales(data || []);
  };
  
  const fetchPayments = async () => {
      const { data, error } = await supabase.from('payments').select('*').order('date', { ascending: false });
      if (error) handleDbError(error);
      else setPayments(data || []);
  };
  
  const fetchDeliveries = async () => {
      const { data, error } = await supabase.from('deliveries').select('*').order('created_at', { ascending: false });
      if (error) handleDbError(error);
      else setDeliveries(data || []);
  };

  // --- HANDLER FUNCTIONS (CRUD) ---
  const handleLogout = async () => {
    // Force clear state immediately for better UX
    setSession(null);
    setUserRole(null);
    setSales([]);
    setPayments([]);
    setDeliveries([]);
    await supabase.auth.signOut();
  };

  const handleAddSale = async (newSaleData: Omit<Sale, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('sales').insert([newSaleData]).select();
    if (error) {
      if (error.message.includes("Could not find the table")) {
         alert("⚠️ Tabela 'sales' não encontrada!\nExecute o script 'database.sql' no Supabase.");
      } else {
         alert("Erro ao adicionar venda: " + error.message);
      }
    } else if (data) {
      setSales(prev => [data[0], ...prev]);
    }
  };

  const handleUpdateSale = async (id: number, newValue: number, newDeliveryFee: number, justification: string, newOrderId: string) => {
    const { data, error } = await supabase
      .from('sales')
      .update({ 
        value: newValue, 
        delivery_fee: newDeliveryFee, 
        justification,
        order_id: newOrderId 
      })
      .eq('id', id)
      .select();
      
    if (error) {
      alert("Erro ao atualizar venda: " + error.message);
    } else if (data) {
      setSales(prev => prev.map(sale => (sale.id === id ? data[0] : sale)));
    }
  };

  const handleDeleteSale = async (id: number) => {
    const { error } = await supabase.from('sales').delete().eq('id', id);
    if (error) {
      alert("Erro ao excluir venda: " + error.message);
    } else {
      setSales(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleAddPayment = async (newPaymentData: Omit<Payment, 'id' | 'created_at'>) => {
    const { data, error } = await supabase.from('payments').insert([newPaymentData]).select();
    if (error) {
       if (error.message.includes("Could not find the table")) {
         alert("⚠️ Tabela 'payments' não encontrada!\nExecute o script 'database.sql' no Supabase.");
       } else {
         alert("Erro ao adicionar pagamento: " + error.message);
       }
    } else if (data) {
       setPayments(prev => [data[0], ...prev]);
    }
  };

  const handleDeletePayment = async (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir este pagamento?")) {
      const { error } = await supabase.from('payments').delete().eq('id', id);
      if (error) {
          alert("Erro ao excluir pagamento: " + error.message);
      } else {
          setPayments(prev => prev.filter(p => p.id !== id));
      }
    }
  };

  const handleStartDelivery = async (orderId: string, address: string, deliveryFee: number) => {
    // 1. Create a Temporary Delivery Object for Optimistic UI
    // Use a negative ID to avoid collision with real DB IDs
    const tempId = -1 * Date.now(); 
    
    const newDelivery: Delivery = {
      id: tempId, // Temporary ID
      order_id: orderId,
      address,
      status: 'in_route',
      start_time: new Date().toISOString(),
      created_at: new Date().toISOString(),
      delivered_at: null,
      driver_email: session?.user?.email,
      delivery_fee: deliveryFee 
    };

    // 2. Update UI Immediately (Optimistic Update)
    setDeliveries(prev => [newDelivery, ...prev]);

    // 3. Send to Database in Background
    const { error } = await supabase.from('deliveries').insert([{
        order_id: orderId,
        address,
        status: 'in_route',
        start_time: new Date().toISOString(),
        driver_email: session?.user?.email,
        delivery_fee: deliveryFee
    }]);
    
    // 4. Handle Errors
    if (error) {
        // Remove the temporary item if the request failed
        setDeliveries(prev => prev.filter(d => d.id !== tempId));

        if (error.message.includes("Could not find the table")) {
            alert("⚠️ Tabela 'deliveries' não encontrada!\nExecute o script 'database.sql' no Supabase.");
        } else if (error.message.includes("driver_email")) {
            alert("⚠️ Erro de Banco de Dados!\n\nVocê precisa adicionar a coluna 'driver_email' na tabela 'deliveries'.\n\nVá no SQL Editor do Supabase e rode:\nALTER TABLE deliveries ADD COLUMN driver_email text;");
        } else if (error.message.includes("delivery_fee")) {
            alert("⚠️ Erro de Banco de Dados!\n\nVocê precisa adicionar a coluna 'delivery_fee' na tabela 'deliveries'.\n\nVá no SQL Editor do Supabase e rode:\nALTER TABLE deliveries ADD COLUMN delivery_fee numeric;");
        } else {
            alert("Erro ao iniciar entrega: " + error.message);
        }
    }
    // Note: If success, the Realtime Subscription will pick up the 'INSERT' event.
    // The subscription logic has been updated to replace the temp item with the real item.
  };

  const handleConfirmDelivery = async (deliveryId: number) => {
     // Optimistic update handled by realtime subscription
     const { error } = await supabase
        .from('deliveries')
        .update({ status: 'delivered', delivered_at: new Date().toISOString() })
        .eq('id', deliveryId);

     if (error) {
       alert("Erro ao confirmar entrega: " + error.message);
     }
  };

  const handleCancelDelivery = async (deliveryId: number) => {
    const { error } = await supabase.from('deliveries').delete().eq('id', deliveryId);
    if (error) {
      alert("Erro ao cancelar entrega: " + error.message);
    }
    // Realtime subscription handles the DELETE event and UI update
  };

  // --- MEMOIZED CALCULATIONS ---
  
  // Calculate Target Date Logic based on Selector
  const targetPeriodInfo = useMemo(() => {
      const now = new Date();
      let targetDate = new Date(now.getFullYear(), now.getMonth(), 1);

      if (selectedPeriod === 'previous') {
          targetDate.setMonth(targetDate.getMonth() - 1);
      }

      const monthName = targetDate.toLocaleString('pt-BR', { month: 'long' });
      const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      const key = targetDate.toISOString().slice(0, 7); // YYYY-MM

      return { key, label: capitalizedMonth };
  }, [selectedPeriod]);

  const stats: SummaryStats = useMemo(() => {
    const targetKey = targetPeriodInfo.key;

    const periodSales = sales.filter(s => s.date.startsWith(targetKey));
    const periodPayments = payments.filter(p => p.date.startsWith(targetKey));

    const totalSales = periodSales.reduce((acc, curr) => acc + curr.value, 0);
    const commissionPerPerson = totalSales * 0.075;
    
    const paidBruno = periodPayments.filter(p => p.person === 'Bruno').reduce((acc, curr) => acc + curr.value, 0);
    const paidDaniele = periodPayments.filter(p => p.person === 'Daniele').reduce((acc, curr) => acc + curr.value, 0);
    
    return {
      totalSales,
      totalCommission: totalSales * 0.15,
      commissionPerPerson,
      salesCount: periodSales.length,
      paidBruno,
      paidDaniele,
      balanceBruno: commissionPerPerson - paidBruno,
      balanceDaniele: commissionPerPerson - paidDaniele
    };
  }, [sales, payments, targetPeriodInfo]);

  const monthlyComparison = useMemo(() => {
    const grouped: Record<string, number> = {};
    sales.forEach(sale => {
      const monthKey = sale.date.substring(0, 7);
      grouped[monthKey] = (grouped[monthKey] || 0) + sale.value;
    });
    return Object.entries(grouped).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 3).map(([key, value]) => {
      const [year, month] = key.split('-');
      const label = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('pt-BR', { month: 'long', year: '2-digit' });
      return { label, value };
    });
  }, [sales]);
  
  // Filter deliveries based on user role
  const filteredDeliveries = useMemo(() => {
      if (userRole === 'driver' && session?.user?.email) {
          return deliveries.filter(d => {
              if (d.driver_email) {
                  return d.driver_email === session.user.email;
              }
              if (session.user.email === 'driver@bellaflor.com') {
                  return true;
              }
              return false;
          });
      }
      return deliveries; // Admin vê tudo
  }, [deliveries, userRole, session]);

  const activeDeliveries = useMemo(() => filteredDeliveries.filter(d => d.status === 'in_route'), [filteredDeliveries]);
  const finishedDeliveries = useMemo(() => filteredDeliveries.filter(d => d.status === 'delivered'), [filteredDeliveries]);

  // Group finished deliveries by date
  const groupedDeliveries = useMemo(() => {
    // Filtrar apenas para os 3 últimos dias
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Data limite: 3 dias atrás (para incluir hoje, ontem e anteontem)
    const limitDate = new Date(today);
    limitDate.setDate(limitDate.getDate() - 3);

    const groups: Record<string, Delivery[]> = {};
    finishedDeliveries.forEach(d => {
        if (!d.delivered_at) return;
        const dateObj = new Date(d.delivered_at);
        
        // Se a entrega for mais antiga que a data limite, ignorar
        if (dateObj < limitDate) return;

        const localKey = dateObj.getFullYear() + '-' + String(dateObj.getMonth() + 1).padStart(2, '0') + '-' + String(dateObj.getDate()).padStart(2, '0');
        
        if (!groups[localKey]) groups[localKey] = [];
        groups[localKey].push(d);
    });

    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [finishedDeliveries]);

  // Expand latest delivery date by default
  useEffect(() => {
    if (groupedDeliveries.length > 0 && expandedDeliveryDates.length === 0) {
        setExpandedDeliveryDates([groupedDeliveries[0][0]]);
    }
  }, [groupedDeliveries.length]);

  const toggleDeliveryDate = (dateKey: string) => {
    setExpandedDeliveryDates(prev => 
        prev.includes(dateKey) ? prev.filter(d => d !== dateKey) : [...prev, dateKey]
    );
  };

  // Determine driver name for UI
  const getDriverName = () => {
      return resolveDriverName(session?.user?.email);
  };

  // --- HELPER FUNCTIONS ---
  const showNotification = (msg: string) => {
    setNotification({ message: msg, show: true });
    setTimeout(() => setNotification({ message: '', show: false }), 4000);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s atrás`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m atrás`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h atrás`;
  };

  const formatDateHeader = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    // Check if is today or yesterday
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return 'Hoje';
    if (date.toDateString() === yesterday.toDateString()) return 'Ontem';
    
    return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'long' });
  };

  const generateMonthlyReport = () => {
    const [year, month] = exportMonth.split('-');
    
    // Filter sales for the selected month
    const filteredSales = sales.filter(s => s.date.startsWith(exportMonth)).sort((a, b) => a.date.localeCompare(b.date));
    
    if (filteredSales.length === 0) {
        alert("Não há vendas registradas neste mês para gerar o relatório.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(219, 39, 119); // brand-600
    doc.text("BellaFlor", 105, 20, { align: "center" });
    
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text(`Relatório de Vendas - ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`, 105, 30, { align: "center" });

    // Summary
    const totalSales = filteredSales.reduce((acc, curr) => acc + curr.value, 0);
    const totalDeliveryFees = filteredSales.reduce((acc, curr) => acc + (curr.delivery_fee || 0), 0);
    const totalCommission = totalSales * 0.15;

    doc.setFontSize(10);
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 250, 250);
    doc.rect(14, 38, 182, 20, 'FD');
    
    doc.text(`Vendas Totais: ${formatCurrency(totalSales)}`, 20, 50);
    doc.text(`Comissão (15%): ${formatCurrency(totalCommission)}`, 85, 50);
    doc.text(`Taxas de Entrega: ${formatCurrency(totalDeliveryFees)}`, 150, 50);

    // Table
    const tableColumns = ["Data", "Pedido", "Valor Venda", "Comissão (15%)", "Taxa Entrega"];
    const tableRows = filteredSales.map(s => [
        new Date(s.date).toLocaleDateString('pt-BR'),
        s.order_id || '-',
        formatCurrency(s.value),
        formatCurrency(s.value * 0.15),
        s.delivery_fee ? formatCurrency(s.delivery_fee) : '-'
    ]);

    (doc as any).autoTable({
        startY: 65,
        head: [tableColumns],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [219, 39, 119] }, // brand-600
        foot: [['TOTAIS', '', formatCurrency(totalSales), formatCurrency(totalCommission), formatCurrency(totalDeliveryFees)]],
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    doc.setFontSize(8);
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, doc.internal.pageSize.height - 10);
        doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
    }

    doc.save(`relatorio-bellaflor-${exportMonth}.pdf`);
    setIsExportModalOpen(false);
  };


  // --- RENDER LOGIC ---
  if (isLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div></div>;
  }

  if (!session) {
    return <LoginScreen />;
  }

  if (userRole === 'driver') {
    return (
      <DriverDashboard 
        onLogout={handleLogout} 
        onConfirmDelivery={handleConfirmDelivery}
        onStartDelivery={handleStartDelivery}
        deliveries={finishedDeliveries}
        activeDeliveries={activeDeliveries}
        onCancelDelivery={handleCancelDelivery}
        driverName={getDriverName()}
      />
    );
  }

  // Admin Dashboard
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

      {/* Export Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div className="bg-brand-600 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        <FileText className="w-5 h-5" /> Relatório Mensal
                    </h3>
                    <button onClick={() => setIsExportModalOpen(false)} className="text-white/80 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Selecione o Mês</label>
                    <input 
                        type="month" 
                        value={exportMonth}
                        onChange={(e) => setExportMonth(e.target.value)}
                        style={{ colorScheme: 'light' }}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none mb-6"
                    />
                    <button 
                        onClick={generateMonthlyReport}
                        className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Baixar PDF
                    </button>
                </div>
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
              onClick={() => setIsExportModalOpen(true)}
              className="text-gray-500 hover:text-brand-600 transition-colors flex items-center gap-1 text-sm font-medium"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar Relatório</span>
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
        
        {/* Period Selector & Stats Grid */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
               Resumo: <span className="text-brand-600">{targetPeriodInfo.label}</span>
            </h3>
            <div className="flex bg-gray-100 p-1 rounded-lg">
               <button 
                 onClick={() => setSelectedPeriod('previous')}
                 className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${selectedPeriod === 'previous' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
               >
                 Mês Anterior
               </button>
               <button 
                 onClick={() => setSelectedPeriod('current')}
                 className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${selectedPeriod === 'current' ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
               >
                 Mês Atual
               </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
              title={`Vendas (${targetPeriodInfo.label})`}
              value={formatCurrency(stats.totalSales)} 
              icon={DollarSign}
              colorClass="text-emerald-600 bg-emerald-100"
              subValue={`${stats.salesCount} pedidos`}
            />
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex flex-col justify-center hover:shadow-md transition-all">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 rounded-lg bg-gray-200 text-black">
                  <Calendar className="w-5 h-5 text-black" />
                </div>
                <p className="text-sm font-medium text-gray-500">Últimos 3 Meses</p>
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
              title="Bruno (Saldo)" 
              value={formatCurrency(stats.balanceBruno)} 
              icon={Wallet}
              colorClass="text-blue-600 bg-blue-100"
              subValue={`Pago: ${formatCurrency(stats.paidBruno)}`}
            />
            <StatCard 
              title="Daniele (Saldo)" 
              value={formatCurrency(stats.balanceDaniele)} 
              icon={Wallet}
              colorClass="text-purple-600 bg-purple-100"
              subValue={`Pago: ${formatCurrency(stats.paidDaniele)}`}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-4 px-1">Vendas</h2>
              <SalesForm onAddSale={handleAddSale} />
              <SalesList sales={sales} onDelete={handleDeleteSale} onUpdate={handleUpdateSale} />
            </section>
          </div>
          <div className="space-y-6">
            <PaymentForm onAddPayment={handleAddPayment} />
            <PaymentList payments={payments} onDelete={handleDeletePayment} />
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
                    </div>
                ) : (
                    <div className="space-y-3">
                        {activeDeliveries.map((delivery) => (
                            <div key={delivery.id} className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                <div className="bg-white p-2 rounded-full shadow-sm shrink-0">
                                    <Bike className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-0.5">
                                        <h4 className="text-sm font-bold text-gray-900">Pedido #{delivery.order_id}</h4>
                                        <div className="flex items-center gap-1 text-[10px] bg-white px-1.5 py-0.5 rounded border border-blue-100 text-blue-700 font-semibold">
                                            <User className="w-3 h-3" />
                                            {resolveDriverName(delivery.driver_email)}
                                        </div>
                                    </div>
                                    
                                    <p className="text-xs text-gray-700 mt-1 leading-snug break-words">
                                        {delivery.address}
                                    </p>
                                    
                                    <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-400">
                                        <Clock className="w-3 h-3" />
                                        Iniciado {formatTimeAgo(delivery.start_time)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
              </div>
              <div className="bg-gray-50 px-5 py-3 border-t border-gray-100">
                  <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Últimas Entregas (3 Dias)</h4>
                  {groupedDeliveries.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Histórico vazio.</p>
                  ) : (
                      <div className="space-y-1">
                          {groupedDeliveries.map(([dateKey, groupDeliveries]) => {
                              const isExpanded = expandedDeliveryDates.includes(dateKey);
                              return (
                                  <div key={dateKey} className="border-b border-gray-100 last:border-0">
                                      <div 
                                          onClick={() => toggleDeliveryDate(dateKey)}
                                          className="flex items-center justify-between py-2 cursor-pointer hover:bg-gray-100/50 -mx-2 px-2 rounded-md transition-colors"
                                      >
                                          <div className="flex items-center gap-2">
                                              {isExpanded ? <ChevronDown className="w-3 h-3 text-gray-500" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
                                              <span className="text-xs font-bold text-gray-600 capitalize">{formatDateHeader(dateKey)}</span>
                                          </div>
                                          <span className="text-[10px] font-medium bg-white border px-1.5 rounded-full text-gray-500">{groupDeliveries.length}</span>
                                      </div>
                                      
                                      {isExpanded && (
                                          <ul className="space-y-2 pb-3 pl-2">
                                              {groupDeliveries.map(del => (
                                                  <li key={del.id} className="text-xs flex flex-col gap-1 border-l-2 border-green-200 pl-3 py-1">
                                                      <div className="flex justify-between items-center">
                                                          <span className="font-bold text-gray-700">#{del.order_id}</span>
                                                          <span className="text-green-600 font-bold flex items-center gap-1 text-[10px]">
                                                              <CheckCircle2 className="w-3 h-3" />
                                                              {new Date(del.delivered_at!).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                                                          </span>
                                                      </div>
                                                      <div className="text-gray-600 break-words leading-tight text-[11px]">{del.address}</div>
                                                      <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                                                          <User className="w-3 h-3" />
                                                          {resolveDriverName(del.driver_email)}
                                                      </div>
                                                  </li>
                                              ))}
                                          </ul>
                                      )}
                                  </div>
                              );
                          })}
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