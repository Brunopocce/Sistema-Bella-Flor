import React, { useState } from 'react';
import { CheckCircle2, DollarSign } from 'lucide-react';
import { Payment } from '../types';

interface PaymentFormProps {
  onAddPayment: (payment: Omit<Payment, 'id' | 'created_at'>) => Promise<void>;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({ onAddPayment }) => {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [person, setPerson] = useState<'Bruno' | 'Daniele'>('Bruno');
  const [rawValue, setRawValue] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setRawValue(val);
  };

  const getDisplayValue = () => {
    if (!rawValue) return '';
    return (parseInt(rawValue) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawValue || !date || isSubmitting) return;

    const cleanValue = parseInt(rawValue) / 100;

    if (isNaN(cleanValue) || cleanValue <= 0) {
      alert("Por favor insira um valor válido.");
      return;
    }

    setIsSubmitting(true);
    await onAddPayment({
      date,
      person,
      value: cleanValue,
    });

    setRawValue('');
    setIsSubmitting(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-green-600" />
        Registrar Pagamento
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="w-full">
          <label className="block text-xs font-bold text-gray-600 mb-1">
            Data do Pagamento
          </label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ colorScheme: 'light' }}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors font-medium text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">
              Recebedor
            </label>
            <select
              value={person}
              onChange={(e) => setPerson(e.target.value as 'Bruno' | 'Daniele')}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors font-medium text-sm"
            >
              <option value="Bruno">Bruno</option>
              <option value="Daniele">Daniele</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">
              Valor (R$)
            </label>
            <input
              type="text"
              inputMode="numeric"
              required
              value={getDisplayValue()}
              onChange={handleValueChange}
              placeholder="0,00"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors font-medium text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm hover:shadow-md text-sm disabled:opacity-50"
        >
          <CheckCircle2 className="w-4 h-4" />
          {isSubmitting ? 'Confirmando...' : 'Confirmar Pagto'}
        </button>
      </form>
    </div>
  );
};
