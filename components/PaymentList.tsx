import React, { useMemo } from 'react';
import { Trash2, Wallet, CalendarDays } from 'lucide-react';
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
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
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
          title: monthName.charAt(0).toUpperCase() + monthName.slice(1),
          total: monthlyTotal,
          payments: groupPayments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        };
      });
  }, [payments]);

  if (payments.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Wallet className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-500">Nenhum pagamento registrado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 mb-2 px-1">
         <Wallet className="w-5 h-5 text-gray-600" />
         <h3 className="font-bold text-gray-800 text-sm uppercase">Histórico de Pagamentos</h3>
      </div>

      {groupedPayments.map((group) => (
        <div key={group.monthKey} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header aligned with SalesList style */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-bold text-gray-900 capitalize">{group.title}</h3>
            </div>
            <div className="text-sm">
              <span className="text-gray-500 mr-2">Total Pago:</span>
              <span className="font-bold text-green-700 text-lg">{formatCurrency(group.total)}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white border-b-2 border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-black uppercase tracking-wider">Data</th>
                  <th className="px-6 py-4 text-xs font-bold text-black uppercase tracking-wider">Para</th>
                  <th className="px-6 py-4 text-xs font-bold text-black uppercase tracking-wider text-right">Valor</th>
                  <th className="px-6 py-4 text-xs font-bold text-black uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {group.payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">{formatDate(payment.date)}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide ${payment.person === 'Bruno' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-purple-50 text-purple-600 border border-purple-100'}`}>
                        {payment.person}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-green-600 font-bold text-right">{formatCurrency(payment.value)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onDelete(payment.id)}
                        className="text-gray-300 hover:text-red-600 transition-colors p-2 rounded-full hover:bg-red-50"
                        title="Excluir Pagamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};