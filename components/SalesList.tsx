import React, { useState, useMemo } from 'react';
import { Trash2, TrendingUp, Clock, Pencil, AlertCircle, Bike, CalendarDays, X, Save, AlertTriangle } from 'lucide-react';
import { Sale } from '../types';

interface SalesListProps {
  sales: Sale[];
  onDelete: (id: number) => Promise<void>;
  onUpdate: (id: number, newValue: number, newDeliveryFee: number, justification: string, newOrderId: string) => Promise<void>;
}

export const SalesList: React.FC<SalesListProps> = ({ sales, onDelete, onUpdate }) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<number | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [saleToEdit, setSaleToEdit] = useState<Sale | null>(null);
  
  // Form states for editing
  const [editRawValue, setEditRawValue] = useState('');
  const [editRawDeliveryFee, setEditRawDeliveryFee] = useState('');
  const [editJustification, setEditJustification] = useState('');
  const [editOrderId, setEditOrderId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatDate = (dateStr: string) => {
    // Handles both "YYYY-MM-DD" and ISO strings "2023-11-28T10:00:00.000Z"
    const date = new Date(dateStr);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const groupedSales = useMemo(() => {
    const groups: Record<string, Sale[]> = {};
    sales.forEach(sale => {
      const monthKey = sale.date.substring(0, 7);
      if (!groups[monthKey]) groups[monthKey] = [];
      groups[monthKey].push(sale);
    });

    return Object.entries(groups)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, groupSales]) => {
        const [year, month] = key.split('-');
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
        const monthName = dateObj.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
        const monthlyTotal = groupSales.reduce((acc, curr) => acc + curr.value, 0);

        return {
          monthKey: key,
          title: monthName.charAt(0).toUpperCase() + monthName.slice(1),
          total: monthlyTotal,
          sales: groupSales.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        };
      });
  }, [sales]);

  const confirmDelete = (id: number) => {
    setSaleToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (saleToDelete) {
      await onDelete(saleToDelete);
      setIsDeleteModalOpen(false);
      setSaleToDelete(null);
    }
  };

  const cancelDelete = () => {
    setIsDeleteModalOpen(false);
    setSaleToDelete(null);
  };

  const handleEditClick = (sale: Sale) => {
    setSaleToEdit(sale);
    const rawValue = (sale.value * 100).toFixed(0);
    const rawDelivery = sale.delivery_fee ? (sale.delivery_fee * 100).toFixed(0) : '';
    setEditRawValue(rawValue);
    setEditRawDeliveryFee(rawDelivery);
    setEditJustification(sale.justification || '');
    setEditOrderId(sale.order_id || '');
    setIsEditModalOpen(true);
  };

  const handleEditValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditRawValue(e.target.value.replace(/\D/g, ''));
  };

  const handleEditDeliveryFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditRawDeliveryFee(e.target.value.replace(/\D/g, ''));
  };
  
  const getDisplayValue = (raw: string) => {
    if (!raw) return '';
    return (parseInt(raw) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saleToEdit) {
      setIsSaving(true);
      const newValue = parseInt(editRawValue) / 100;
      const newDeliveryFee = editRawDeliveryFee ? parseInt(editRawDeliveryFee) / 100 : 0;
      
      if (isNaN(newValue) || newValue <= 0) {
        alert("Valor inválido.");
        setIsSaving(false);
        return;
      }
      
      await onUpdate(saleToEdit.id, newValue, newDeliveryFee, editJustification, editOrderId);
      setIsEditModalOpen(false);
      setSaleToEdit(null);
      setIsSaving(false);
    }
  };

  if (sales.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <TrendingUp className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Nenhuma venda registrada</h3>
        <p className="text-gray-500 mt-2">Os dados serão carregados do banco de dados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groupedSales.map((group) => (
        <div key={group.monthKey} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
                  <th className="px-6 py-4 text-xs font-bold text-black uppercase tracking-wider flex items-center gap-1"><Clock className="w-3 h-3" /> Hora</th>
                  <th className="px-6 py-4 text-xs font-bold text-black uppercase tracking-wider">Pedido</th>
                  <th className="px-6 py-4 text-xs font-bold text-black uppercase tracking-wider text-right">Valor Venda</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Taxa Entrega</th>
                  <th className="px-6 py-4 text-xs font-bold text-black uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {group.sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-black font-medium">{formatDate(sale.date)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-medium">{formatTime(sale.created_at)}</td>
                    <td className="px-6 py-4 text-sm text-black">{sale.order_id || '-'}</td>
                    <td className="px-6 py-4 text-sm text-black text-right">
                      <div className="font-bold">{formatCurrency(sale.value)}</div>
                      {sale.justification && (
                        <div className="text-xs text-amber-600 mt-1 flex items-center justify-end gap-1" title={sale.justification}><AlertCircle className="w-3 h-3" />Editado</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 text-right">
                      {sale.delivery_fee && sale.delivery_fee > 0 ? (
                        <div className="flex items-center justify-end gap-1"><Bike className="w-3 h-3 text-gray-400" />{formatCurrency(sale.delivery_fee)}</div>
                      ) : ( <span className="text-gray-300">-</span> )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => handleEditClick(sale)} className="text-gray-400 hover:text-brand-600 transition-colors p-2 rounded-full hover:bg-brand-50" title="Editar"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => confirmDelete(sale.id)} className="text-gray-400 hover:text-red-600 transition-colors p-2 rounded-full hover:bg-red-50" title="Excluir"><Trash2 className="w-4 h-4" /></button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir Venda?</h3>
              <p className="text-sm text-gray-500 mb-6">
                Essa ação não pode ser desfeita. O registro será removido permanentemente do histórico.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={cancelDelete}
                  className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="w-full bg-red-600 text-white font-bold py-2.5 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-brand-600 px-6 py-4 flex justify-between items-center">
               <h3 className="text-white font-bold text-lg flex items-center gap-2">
                 <Pencil className="w-5 h-5" /> Editar Venda
               </h3>
               <button onClick={() => setIsEditModalOpen(false)} className="text-white/80 hover:text-white">
                 <X className="w-5 h-5" />
               </button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nº do Pedido</label>
                  <input
                    type="text"
                    value={editOrderId}
                    onChange={(e) => setEditOrderId(e.target.value)}
                    placeholder="Ex: 123"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none font-medium text-lg"
                  />
               </div>

               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Valor da Venda (R$)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={getDisplayValue(editRawValue)}
                    onChange={handleEditValueChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none font-medium text-lg"
                  />
               </div>

               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Taxa de Entrega (R$)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={getDisplayValue(editRawDeliveryFee)}
                    onChange={handleEditDeliveryFeeChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none font-medium text-lg"
                  />
               </div>

               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Justificativa da Alteração</label>
                  <textarea
                    required
                    value={editJustification}
                    onChange={(e) => setEditJustification(e.target.value)}
                    placeholder="Ex: Valor digitado incorretamente..."
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none min-h-[80px]"
                  />
               </div>

               <div className="pt-2 flex gap-3">
                 <button
                   type="button"
                   onClick={() => setIsEditModalOpen(false)}
                   className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-lg hover:bg-gray-200 transition-colors"
                 >
                   Cancelar
                 </button>
                 <button
                   type="submit"
                   disabled={isSaving}
                   className="flex-1 bg-brand-600 text-white font-bold py-3 rounded-lg hover:bg-brand-700 transition-colors shadow-md flex items-center justify-center gap-2"
                 >
                   {isSaving ? 'Salvando...' : <><Save className="w-4 h-4" /> Salvar Alterações</>}
                 </button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};