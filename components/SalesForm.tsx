import React, { useState } from 'react';
import { PlusCircle, Save } from 'lucide-react';
import { Sale } from '../types';

interface SalesFormProps {
  onAddSale: (sale: Omit<Sale, 'id' | 'created_at'>) => Promise<void>;
}

// Áudio da caixa registradora em Base64 para tocar ao adicionar venda
const successAudio = new Audio('data:audio/mpeg;base64,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XFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcXFxcX//3AQCPAAANgAAAAAJdXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV//3AQCPAAANgAAAAAJgYGBycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJ//3AQCPAAANgAAAAAJjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY//3AQCPAAANgAAAAAJpaWlqampqampqampqampqampqampqampqampqampqampqampqampqampqampqampqampqampqam//3AQCPAAANgAAAAAJq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq//3AQCPAAANgAAAAAJt7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7//3AQCPAAANgAAAAAJx8PDx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx//3AQCPAAANgAAAAAJ0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0dHR0d//3AQCPAAANgAAAAAJ3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d3d//3AQCPAAANgAAAAAJ7+/v9/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39//3AQCPAAANgAAAAAKAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC//3AQCPAAANgAAAAAKDg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg4ODg//3AQCPAAANgAAAAAKHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh//3AQCPAAANgAAAAAKPj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj//3AQCPAAANgAAAAAKT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT//3AQCPAAANgAAAAAKWlpaXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl//3AQCPAAANgAAAAAKcnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJ//3AQCPAAANgAAAAAKh4eHi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi//3AQCPAAANgAAAAAKjY2Njo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo6Ojo//3AQCPAAANgAAAAAKmpqampqampqampqampqampqampqampqampqampqampqampqampqampqampqampqampqampqampqampqam//3AQCPAAANgAAAAAKrq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6ur//3AQCPAAANgAAAAAKu7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u//3AQCPAAANgAAAAAKxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbG//3AQCPAAANgAAAAAKz8/P09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09//3AQCPAAANgAAAAAK29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb//3AQCPAAANgAAAAAK4+Pj5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5//3AQCPAAANgAAAAAK9vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb//3AQCPAAANgAAAAAK/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7//3AQCPAAANgAAAAALAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMD//3AQCPAAANgAAAAALExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTExMTEx//3AQCPAAANgAAAAALJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJycnJy//3AQCPAAANgAAAAALOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O//3AQCPAAANgAAAAALU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NTU1NT//3AQCPAAANgAAAAALX19fYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWF//3AQCPAAANgAAAAALb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29vb29v//3AQCPAAANgAAAAALe3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e3t7e//3AQCPAAANgAAAAALg4ODi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi4uLi//3AQCPAAANgAAAAALn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn//3AQCPAAANgAAAAALs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs//3AQCPAAANgAAAAALu7u7v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7//3AQCPAAANgAAAAALz8/P09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09//3AQCPAAANgAAAAAL39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39//3AQCPAAANgAAAAAMB//+AgIA=');

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

    // Tocar o som de sucesso
    successAudio.play();

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
