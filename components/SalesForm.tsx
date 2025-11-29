import React, { useState } from 'react';
import { PlusCircle, Save } from 'lucide-react';
import { Sale } from '../types';

interface SalesFormProps {
  onAddSale: (sale: Omit<Sale, 'id' | 'created_at'>) => Promise<void>;
}

// Áudio de alerta para tocar ao adicionar venda
const successAudio = new Audio('/alert.mp3');

export const SalesForm: React.FC<SalesFormProps> = ({ onAddSale }) => {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [rawValue, setRawValue] = useState<string>(''); // Stores digits only: "5490"
  const [rawDeliveryFee, setRawDeliveryFee] = useState<string>(''); // Stores digits only: "1000"
  const [orderId, setOrderId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setRawValue(val);
  };

  const handleDeliveryFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setRawDeliveryFee(val);
  };

  const getDisplayValue = (raw: string) => {
    if (!raw) return '';
    const val = parseInt(raw) / 100;
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawValue || !date || isSubmitting) return;

    const cleanValue = parseInt(rawValue) / 100;
    const cleanDeliveryFee = rawDeliveryFee ? parseInt(rawDeliveryFee) / 100 : 0;

    if (isNaN(cleanValue) || cleanValue <= 0) {
      alert("Por favor insira um valor válido para a venda.");
      return;
    }

    setIsSubmitting(true);
    await onAddSale({
      date,
      value: cleanValue,
      delivery_fee: cleanDeliveryFee,
      order_id: orderId || undefined
    });

    // Tocar o som de alerta/sucesso
    successAudio.volume = 0.8;
    successAudio.play().catch(e => console.warn("Audio playback failed", e));

    // Reset form
    setRawValue('');
    setRawDeliveryFee('');
    setOrderId('');
    setIsSubmitting(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <PlusCircle className="w-5 h-5 text-brand-600" />
        Nova Venda
      </h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
        <div className="md:col-span-1">
          <label className="block text-sm font-bold text-gray-900 mb-1">
            Data
          </label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ colorScheme: 'light' }}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors font-medium"
          />
        </div>

        <div className="md:col-span-1">
          <label className="block text-sm font-bold text-gray-900 mb-1">
            Nº Pedido (Opcional)
          </label>
          <input
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="Ex: 123"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors"
          />
        </div>

        <div className="md:col-span-1">
          <label className="block text-sm font-bold text-gray-900 mb-1">
            Valor Venda (R$)
          </label>
          <input
            type="text"
            inputMode="numeric"
            required
            value={getDisplayValue(rawValue)}
            onChange={handleValueChange}
            placeholder="0,00"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors font-medium"
          />
        </div>

        <div className="md:col-span-1">
          <label className="block text-sm font-bold text-gray-700 mb-1">
            Taxa Entrega (R$)
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={getDisplayValue(rawDeliveryFee)}
            onChange={handleDeliveryFeeChange}
            placeholder="0,00"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 focus:ring-2 focus:ring-gray-400 focus:border-gray-400 outline-none transition-colors"
          />
        </div>

        <div className="md:col-span-1">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Salvando...' : 'Adicionar'}
          </button>
        </div>
      </form>
    </div>
  );
};