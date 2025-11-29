import React, { useMemo } from 'react';
import { Trash2, Wallet, CalendarDays, ArrowRight } from 'lucide-react';
import { Payment } from '../types';

interface PaymentListProps {
  payments: Payment[];
  onDelete: (id: number) => Promise<void>;
}

export const PaymentList: React.FC<PaymentListProps> = ({ payments, onDelete }) => {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '');
    return { day, month };
  };

  const groupedPayments = useMemo(() => {
    const groups: Record<string, Payment[]> = {};
    payments.forEach(payment => {
      const monthKey = payment.date.substring(0, 7);
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(payment);
    });

    return Object.entries(groups)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, groupPayments]) => {
        const [year, month] = key.split('-');
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
        const monthName = dateObj.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        const monthlyTotal = groupPayments.reduce((acc, curr) => acc + curr.value, 0);

        return {
          monthKey: key,
          title: monthName,
          total: monthlyTotal,
          payments: groupPayments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        };
      });
  }, [payments]);

  if (payments.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center mt-6">
        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
          <Wallet className="w-5 h-5 text-gray-300" />
        </div>
        <p className="text-sm text-gray-400 font-medium">Histórico vazio.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 mt-6">
      <div className="flex items-center justify-between px-1">
         <h3 className="font-bold text-gray-900 text-sm tracking-wide uppercase flex items-center gap-2">
            Histórico
         </h3>
      </div>

      {groupedPayments.map((group) => (
        <div key={group.monthKey} className="space-y-3">
          {/* Cabeçalho do Mês Minimalista */}
          <div className="flex items-end justify-between px-2 pb-1">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{group.title}</span>
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              Total: {formatCurrency(group.total)}
            </span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-50">
              {group.payments.map((payment) => {
                const { day, month } = formatDate(payment.date);
                const isBruno = payment.person === 'Bruno';
                
                return (
                  <div key={payment.id} className="group flex items-center justify-between p-4 hover:bg-gray-50/80 transition-all duration-200">
                    <div className="flex items-center gap-4">
                      {/* Data Estilizada */}
                      <div className="flex flex-col items-center justify-center w-10 h-10 bg-gray-50 rounded-xl border border-gray-100 shrink-0">
                        <span className="text-sm font-bold text-gray-700 leading-none">{day}</span>
                        <span className="text-[9px] font-medium text-gray-400 uppercase leading-none mt-0.5">{month}</span>
                      </div>
                      
                      {/* Info Pessoa */}
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${isBruno ? 'bg-blue-500 shadow-blue-200' : 'bg-purple-500 shadow-purple-200'} shadow-sm`}></span>
                            <span className="text-sm font-medium text-gray-600">{payment.person}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium">Pagamento realizado</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-base font-bold text-gray-900 tracking-tight">
                        {formatCurrency(payment.value)}
                      </span>
                      
                      <button
                        onClick={() => onDelete(payment.id)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all duration-200 transform translate-x-2 group-hover:translate-x-0"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};