import React from 'react';
import { Trash2, Wallet } from 'lucide-react';
import { Payment } from '../types';

interface PaymentListProps {
  payments: Payment[];
  onDelete: (id: string) => void;
}

export const PaymentList: React.FC<PaymentListProps> = ({ payments, onDelete }) => {
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  if (payments.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-6 text-center">
        <p className="text-gray-400 text-xs">Nenhum pagamento registrado.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
          <Wallet className="w-4 h-4 text-gray-400" />
          Histórico
        </h3>
        <span className="text-xs text-gray-400 font-medium">{payments.length} reg.</span>
      </div>
      <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
        <table className="w-full text-left">
          <thead className="bg-white border-b border-gray-100 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Data</th>
              <th className="px-2 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Para</th>
              <th className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Valor</th>
              <th className="px-2 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {payments.map((payment) => (
              <tr key={payment.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-4 py-2 text-xs text-gray-600">
                  {formatDate(payment.date)}
                </td>
                <td className="px-2 py-2 text-xs text-gray-900 font-medium">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${payment.person === 'Bruno' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                    {payment.person.substring(0, 3)}
                  </span>
                </td>
                <td className="px-4 py-2 text-xs text-green-600 font-bold text-right">
                  {formatCurrency(payment.value)}
                </td>
                <td className="px-2 py-2 text-right">
                  <button
                    onClick={() => onDelete(payment.id)}
                    className="text-gray-300 hover:text-red-600 transition-colors p-1 opacity-0 group-hover:opacity-100"
                    title="Excluir"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};