import React, { useState, useMemo } from 'react';
import { Trash2, TrendingUp, Clock, Pencil, AlertCircle, Bike, CalendarDays } from 'lucide-react';
import { Sale } from '../types';

interface SalesListProps {
  sales: Sale[];
  onDelete: (id: string) => void;
  onUpdate: (id: string, newValue: number, newDeliveryFee: number, justification: string) => void;
}

export const SalesList: React.FC<SalesListProps> = ({ sales, onDelete, onUpdate }) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saleToEdit, setSaleToEdit] = useState<Sale | null>(null);
  const [editRawValue, setEditRawValue] = useState('');
  const [editRawDeliveryFee, setEditRawDeliveryFee] = useState('');
  const [editJustification, setEditJustification] = useState('');

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // --- Grouping Logic ---
  const groupedSales = useMemo(() => {
    const groups: Record<string, Sale[]> = {};
    
    sales.forEach(sale => {
      // Key format: "2025-11"
      const monthKey = sale.date.substring(0, 7);
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(sale);
    });

    // Return array of objects sorted by date descending (Newest month first)
    return Object.entries(groups)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, groupSales]) => {
        const [year, month] = key.split('-');
        // Create date object correctly handling timezone via integer parsing
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
        const monthName = dateObj.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        
        // Calculate monthly total
        const monthlyTotal = groupSales.reduce((acc, curr) => acc + curr.value, 0);

        return {
          monthKey: key,
          title: monthName.charAt(0).toUpperCase() + monthName.slice(1),
          total: monthlyTotal,
          sales: groupSales.sort((a, b) => {
            // Sort inside the month by date desc, then by creation time desc
            if (b.date !== a.date) return b.date.localeCompare(a.date);
            return b.createdAt - a.createdAt;
          })
        };
      });
  }, [sales]);


  // --- Delete Logic ---
  const confirmDelete = (id: string) => {
    setSaleToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (saleToDelete) {
      onDelete(saleToDelete);
      setIsDeleteModalOpen(false);
      setSaleToDelete(null);
    }
  };

  const cancelDelete = () => {
    setIsDeleteModalOpen(false);
    setSaleToDelete(null);
  };

  // --- Edit Logic ---
  const handleEditClick = (sale: Sale) => {
    setSaleToEdit(sale);
    // Convert current numeric value (e.g., 54.90) to raw string ("5490") for input masking
    const rawValue = (sale.value * 100).toFixed(0);
    const rawDelivery = sale.deliveryFee ? (sale.deliveryFee * 100).toFixed(0) : '';
    
    setEditRawValue(rawValue);
    setEditRawDeliveryFee(rawDelivery);
    setEditJustification(sale.justification || '');
    setIsEditModalOpen(true);
  };

  const handleEditValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setEditRawValue(val);
  };

  const handleEditDeliveryFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setEditRawDeliveryFee(val);
  };

  const getDisplayValue = (raw: string) => {
    if (!raw) return '';
    const val = parseInt(raw) / 100;
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  };

  const handleSaveEdit = () => {
    if (saleToEdit) {
      const newValue = parseInt(editRawValue) / 100;
      const newDeliveryFee = editRawDeliveryFee ? parseInt(editRawDeliveryFee) / 100 : 0;

      if (isNaN(newValue) || newValue === 0) {
        alert("Valor inválido.");
        return;
      }
      onUpdate(saleToEdit.id, newValue, newDeliveryFee, editJustification);
      setIsEditModalOpen(false);
      setSaleToEdit(null);
    }
  };

  const cancelEdit = () => {
    setIsEditModalOpen(false);
    setSaleToEdit(null);
  };

  if (sales.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <TrendingUp className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Nenhuma venda registrada</h3>
        <p className="text-gray-500 mt-2">Comece adicionando uma venda acima.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groupedSales.map((group) => (
        <div key={group.monthKey} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Group Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-brand-600" />
              <h3 className="text-lg font-bold text-gray-900 capitalize">{group.title}</h3>
            </div>
            <div className="text-sm">
              <span className="text-gray-500 mr-2">Total do Mês:</span>
              <span className="font-bold text-brand-700 text-lg">{formatCurrency(group.total)}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white border-b-2 border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-black uppercase tracking-wider">Data</th>
                  <th className="px-6 py-4 text-xs font-bold text-black uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Hora
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-black uppercase tracking-wider">Pedido</th>
                  <th className="px-6 py-4 text-xs font-bold text-black uppercase tracking-wider text-right">Valor Venda</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Taxa Entrega</th>
                  <th className="px-6 py-4 text-xs font-bold text-black uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {group.sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-black font-medium">
                      {formatDate(sale.date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                      {formatTime(sale.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm text-black">
                      {sale.orderId || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-black text-right">
                      <div className="font-bold">{formatCurrency(sale.value)}</div>
                      {sale.justification && (
                        <div className="text-xs text-amber-600 mt-1 flex items-center justify-end gap-1" title={sale.justification}>
                          <AlertCircle className="w-3 h-3" />
                          Editado
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 text-right">
                      {sale.deliveryFee && sale.deliveryFee > 0 ? (
                        <div className="flex items-center justify-end gap-1">
                          <Bike className="w-3 h-3 text-gray-400" />
                          {formatCurrency(sale.deliveryFee)}
                        </div>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleEditClick(sale)}
                          className="text-gray-400 hover:text-brand-600 transition-colors p-2 rounded-full hover:bg-brand-50"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => confirmDelete(sale.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors p-2 rounded-full hover:bg-red-50"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Modal de Confirmação de Exclusão */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir Venda?</h3>
              <p className="text-gray-500 text-sm mb-6">
                Tem certeza que deseja remover este registro permanentemente?
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={cancelDelete}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
                >
                  Sim, Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {isEditModalOpen && saleToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-3 mb-6 w-full border-b pb-4">
                <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center">
                  <Pencil className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Editar Venda</h3>
                  <p className="text-xs text-gray-500">
                    Pedido: {saleToEdit.orderId || 'S/N'} • Data: {formatDate(saleToEdit.date)}
                  </p>
                </div>
              </div>

              <div className="w-full space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1">
                        Novo Valor (R$)
                    </label>
                    <input
                        type="text"
                        inputMode="numeric"
                        required
                        value={getDisplayValue(editRawValue)}
                        onChange={handleEditValueChange}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors font-medium text-lg"
                    />
                    </div>
                    <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                        Taxa Entrega (R$)
                    </label>
                    <input
                        type="text"
                        inputMode="numeric"
                        value={getDisplayValue(editRawDeliveryFee)}
                        onChange={handleEditDeliveryFeeChange}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 focus:ring-2 focus:ring-gray-400 focus:border-gray-400 outline-none transition-colors font-medium text-lg"
                    />
                    </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-1">
                    Justificativa da Alteração
                  </label>
                  <textarea
                    rows={3}
                    value={editJustification}
                    onChange={(e) => setEditJustification(e.target.value)}
                    placeholder="Ex: Valor digitado incorretamente..."
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 w-full">
                <button
                  onClick={cancelEdit}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 px-4 py-2 bg-brand-600 text-white font-semibold rounded-lg hover:bg-brand-700 transition-colors shadow-md"
                >
                  Alterar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
