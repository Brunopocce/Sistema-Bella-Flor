import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapPin, Navigation, CheckCircle2, Package, LogOut, Clock, RotateCcw, Search, Home, X, ChevronDown, ChevronUp, Plus, Download, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Delivery } from '../types';

declare global {
  interface Window { jspdf: any; }
}

interface DriverDashboardProps {
  onLogout: () => void;
  onConfirmDelivery: (deliveryId: number) => Promise<void>;
  onStartDelivery: (orderId: string, address: string) => Promise<void>;
  deliveries: Delivery[]; // Finished deliveries
  activeDeliveries: Delivery[]; // In-route deliveries
  onCancelDelivery: (deliveryId: number) => Promise<void>;
  driverName?: string; // Nome do entregador para exibição
}

interface AddressSuggestion {
  place_id: string | number;
  display_name: string;
  source: 'osm' | 'viacep';
  address: { road?: string; suburb?: string; city?: string; town?: string; municipality?: string; village?: string; county?: string; state?: string; postcode?: string; };
}

// Custom hook to get previous value of a prop or state
function usePrevious<T>(value: T) {
  // FIX: `useRef<T>()` requires an initial value when a generic type is provided. Initializing with `undefined` and adjusting the ref's type to `T | undefined` to solve the error.
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ 
  onLogout, 
  onConfirmDelivery, 
  onStartDelivery, 
  deliveries,
  activeDeliveries,
  onCancelDelivery,
  driverName = 'Entregador'
}) => {
  const [orderId, setOrderId] = useState('');
  const [addressQuery, setAddressQuery] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(true);

  // Cancel Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [deliveryToCancel, setDeliveryToCancel] = useState<Delivery | null>(null);

  // Focus Mode State (Overlay after opening GPS)
  const [focusedDeliveryId, setFocusedDeliveryId] = useState<number | null>(null);
  const focusedDelivery = useMemo(() => activeDeliveries.find(d => d.id === focusedDeliveryId), [activeDeliveries, focusedDeliveryId]);
  
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const numberInputRef = useRef<HTMLInputElement>(null);

  const alertAudioRef = useRef<HTMLAudioElement | null>(null);
  const prevActiveDeliveries = usePrevious(activeDeliveries);

  const ALLOWED_CITIES = ['sorocaba', 'votorantim', 'araçoiaba da serra', 'salto de pirapora'];

  useEffect(() => {
    // Initialize audio on component mount
    alertAudioRef.current = new Audio('/alert.mp3');
    alertAudioRef.current.volume = 0.8;
  }, []);

  useEffect(() => {
    if (prevActiveDeliveries && activeDeliveries.length > prevActiveDeliveries.length) {
      // New delivery detected, play sound
      alertAudioRef.current?.play().catch(error => {
        console.warn("Audio playback failed, likely due to browser autoplay policies.", error);
      });
      // Scroll to top to show the new delivery
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeDeliveries, prevActiveDeliveries]);

  useEffect(() => {
    setIsFormOpen(activeDeliveries.length === 0);
  }, [activeDeliveries.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  // Se a entrega focada sair da lista (foi concluída ou cancelada), fecha o modo foco
  useEffect(() => {
    if (focusedDeliveryId && !activeDeliveries.find(d => d.id === focusedDeliveryId)) {
        setFocusedDeliveryId(null);
    }
  }, [activeDeliveries, focusedDeliveryId]);

  const isCityAllowed = (cityName?: string) => cityName ? ALLOWED_CITIES.some(allowed => cityName.toLowerCase().includes(allowed)) : false;

  const fetchViaCEP = async (cep: string) => {
    setIsSearching(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep.replace(/\D/g, '')}/json/`);
      const data = await res.json();
      if (data.erro || !isCityAllowed(data.localidade)) {
        setSuggestions([]);
      } else {
        // Correção aplicada: usar 'logradouro' em vez de 'logouro'
        const displayNameParts = [data.logradouro, data.bairro, data.localidade, data.uf].filter(Boolean);
        const suggestion: AddressSuggestion = {
          place_id: data.cep,
          display_name: displayNameParts.join(', '),
          source: 'viacep',
          address: { road: data.logradouro, suburb: data.bairro, city: data.localidade, state: data.uf, postcode: data.cep }
        };
        setSuggestions([suggestion]);
        setShowSuggestions(true);
      }
    } catch (error) { console.error("Erro ao buscar CEP:", error); setSuggestions([]); }
    finally { setIsSearching(false); }
  };

  const fetchNominatim = async (query: string) => {
    setIsSearching(true);
    try {
      const viewbox = "-47.60,-23.35,-47.30,-23.65";
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=20&countrycodes=br&viewbox=${viewbox}&bounded=1`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data: any[] = await res.json();
      const filtered = data
        .map(item => ({...item, source: 'osm' as const}))
        .filter(item => {
          const cityIds = [item.address.city, item.address.town, item.address.municipality, item.address.village, item.address.county].filter(Boolean).map(s => s?.toLowerCase());
          return cityIds.some(id => ALLOWED_CITIES.some(allowed => id?.includes(allowed)));
        });
      setSuggestions(filtered.slice(0, 5));
      setShowSuggestions(true);
    } catch (error) { console.error("Erro ao buscar endereços:", error); }
    finally { setIsSearching(false); }
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAddressQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const isCep = val.replace(/\D/g, '').length === 8;
    debounceRef.current = setTimeout(() => isCep ? fetchViaCEP(val) : fetchNominatim(val), 400);
  };

  const selectAddress = (suggestion: AddressSuggestion) => {
    let text = `${suggestion.address.road || suggestion.address.suburb} - ${suggestion.address.suburb}, ${suggestion.address.city}`;
    setAddressQuery(text);
    setShowSuggestions(false);
    setTimeout(() => numberInputRef.current?.focus(), 100);
  };

  const formatSuggestionDisplay = (suggestion: AddressSuggestion) => {
    if (suggestion.source === 'viacep') {
        const { road, suburb, city, postcode } = suggestion.address;
        const mainText = road || suburb;
        let secondaryText = '';

        if (mainText === road && suburb) { // Main text is street, so show suburb and city in secondary
            secondaryText = `${suburb}, ${city} (CEP: ${postcode})`;
        } else { // Main text is suburb, so just show city in secondary
            secondaryText = `${city} (CEP: ${postcode})`;
        }
        
        return { 
            main: mainText || 'Endereço Identificado', 
            secondary: secondaryText
        };
    }
    const { road, suburb, city, town, municipality, state } = suggestion.address;
    const main = road || suggestion.display_name.split(',')[0];
    const secondary = [suburb, city || town || municipality, state].filter(Boolean).join(', ');
    return { main, secondary };
  };

  const handleAddToRoute = async () => {
    if (!addressQuery || !orderId) return alert("Preencha o número do pedido e o endereço.");
    const fullDestination = streetNumber ? `${addressQuery}, ${streetNumber}` : addressQuery;
    await onStartDelivery(orderId, fullDestination);
    setOrderId(''); setAddressQuery(''); setStreetNumber(''); setIsFormOpen(false);
  };

  const openCancelModal = (delivery: Delivery) => {
    setDeliveryToCancel(delivery);
    setIsCancelModalOpen(true);
  };

  const closeCancelModal = () => {
    setDeliveryToCancel(null);
    setIsCancelModalOpen(false);
  };

  const handleConfirmCancel = async () => {
    if (deliveryToCancel) {
      await onCancelDelivery(deliveryToCancel.id);
      closeCancelModal();
    }
  };

  const handleOpenGPS = (delivery: Delivery) => {
    // 1. Abre o Google Maps
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(delivery.address)}&travelmode=driving`, '_blank');
    
    // 2. Ativa o "Modo Foco" no app para quando o usuário voltar
    setFocusedDeliveryId(delivery.id);
  };

  const formatTime = (isoString: string | null) => isoString ? new Date(isoString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-';

  const todaysDeliveries = useMemo(() => deliveries.filter(d => new Date().toDateString() === new Date(d.delivered_at || '').toDateString()), [deliveries]);

  const generatePDF = () => {
    if (todaysDeliveries.length === 0) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const tableColumns = ["Nº Pedido", "Endereço", "Início da Rota", "Entrega"];
    const tableRows = todaysDeliveries.map(d => [`#${d.order_id}`, d.address, formatTime(d.start_time), formatTime(d.delivered_at)]);
    const date = new Date().toLocaleDateString('pt-BR');
    doc.text(`Relatório de Entregas - ${date} - ${driverName}`, 14, 20);
    (doc as any).autoTable({ startY: 30, head: [tableColumns], body: tableRows, theme: 'grid' });
    doc.save(`relatorio-entregas-${driverName}-${date.replace(/\//g, '-')}.pdf`);
  };

  const handleConfirmFocusedDelivery = async () => {
      if (focusedDeliveryId) {
          await onConfirmDelivery(focusedDeliveryId);
          setFocusedDeliveryId(null);
      }
  };

  // --- RENDER ---

  // 1. MODO FOCO (Overlay de Tela Cheia)
  if (focusedDelivery) {
      return (
          <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in fade-in duration-300">
              <div className="flex-1 flex flex-col p-6 items-center justify-center text-center space-y-6">
                  
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
                      <MapPin className="w-10 h-10 text-green-600" />
                  </div>

                  <div className="space-y-2">
                      <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Aguardando Retorno</h2>
                      <h1 className="text-2xl font-black text-gray-900 leading-tight">{focusedDelivery.address}</h1>
                      <p className="text-lg font-medium text-brand-600">Pedido #{focusedDelivery.order_id}</p>
                  </div>

                  <div className="w-full max-w-xs pt-8">
                      <button 
                          onClick={handleConfirmFocusedDelivery}
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-black text-xl py-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3"
                      >
                          <CheckCircle2 className="w-8 h-8" />
                          CONFIRMAR ENTREGA
                      </button>
                      <p className="text-xs text-gray-400 mt-4">
                          Toque acima quando chegar ao destino
                      </p>
                  </div>
              </div>

              <div className="p-6">
                  <button 
                      onClick={() => setFocusedDeliveryId(null)}
                      className="w-full border border-gray-200 text-gray-500 font-bold py-4 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                      <ArrowLeft className="w-5 h-5" />
                      Voltar para lista
                  </button>
              </div>
          </div>
      );
  }

  // 2. DASHBOARD PADRÃO
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
              <div className="bg-brand-600 p-1.5 rounded-lg">
                  <Navigation className="w-5 h-5 text-white" />
              </div>
              <div>
                  <h1 className="text-lg font-bold text-gray-900 leading-tight">Entregas</h1>
                  <p className="text-xs text-brand-600 font-medium leading-none">Olá, {driverName}</p>
              </div>
          </div>
          <button onClick={onLogout} className="text-gray-500 hover:text-red-600 transition-colors p-2" title="Sair"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        {activeDeliveries.length > 0 && (
          <div className="space-y-4">
             <div className="flex items-center justify-between px-1"><h3 className="font-bold text-gray-800 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>Em Rota ({activeDeliveries.length})</h3></div>
             <div className="grid gap-4">
                {activeDeliveries.map((delivery) => (
                  <div key={delivery.id} className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden relative">
                     <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                     <div className="p-4">
                        <div className="flex justify-between items-start mb-2"><span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded-md">Pedido #{delivery.order_id}</span><span className="text-xs text-gray-400 font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> {formatTime(delivery.start_time)}</span></div>
                        <p className="text-gray-900 font-bold text-lg leading-tight mb-1">{delivery.address}</p>
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <button onClick={() => handleOpenGPS(delivery)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"><Navigation className="w-4 h-4" />Abrir GPS</button>
                            <button onClick={() => onConfirmDelivery(delivery.id)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"><CheckCircle2 className="w-4 h-4" />Entregue</button>
                        </div>
                        <div className="border-t border-gray-100 mt-3 pt-3">
                            <button 
                                onClick={() => openCancelModal(delivery)}
                                className="w-full text-center text-sm font-semibold text-red-500 hover:text-red-700 py-2 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5"
                            >
                                <X className="w-4 h-4" />
                                Cancelar Entrega
                            </button>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300">
          <div onClick={() => setIsFormOpen(!isFormOpen)} className={`px-6 py-4 flex items-center justify-between cursor-pointer ${isFormOpen ? 'bg-brand-600' : 'bg-white hover:bg-gray-50'}`}>
            <div className="flex items-center gap-2">
                {isFormOpen ? <Package className="w-5 h-5 text-white" /> : <div className="bg-brand-100 p-1.5 rounded-full"><Plus className="w-4 h-4 text-brand-600" /></div>}
                <h2 className={`font-bold text-lg ${isFormOpen ? 'text-white' : 'text-gray-800'}`}>Nova Entrega</h2>
            </div>
            {isFormOpen ? <ChevronUp className="w-5 h-5 text-white" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </div>
          {isFormOpen && (
            <div className="p-6 space-y-5 animate-in slide-in-from-top-2 duration-200">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nº do Pedido</label>
                  <input type="text" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="Ex: 123" className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors text-lg" />
                </div>
                <div ref={wrapperRef} className="relative">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Endereço (Rua ou CEP)</label>
                  <div className="relative">
                    <input type="text" value={addressQuery} onChange={handleAddressChange} onFocus={() => { if(suggestions.length > 0) setShowSuggestions(true); }} placeholder="Digite rua ou CEP..." className="w-full pl-11 pr-10 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors text-lg truncate" />
                    <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 ${isSearching ? 'text-brand-500 animate-pulse' : 'text-gray-400'}`} />
                    {addressQuery && (<button onClick={() => setAddressQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><X className="w-4 h-4 text-gray-500" /></button>)}
                  </div>
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto divide-y divide-gray-100">
                      <ul>{suggestions.map((item, index) => { const { main, secondary } = formatSuggestionDisplay(item); return (<li key={`${item.place_id}-${index}`} onClick={() => selectAddress(item)} className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-start gap-3 transition-colors"><div className={`mt-1 p-1.5 rounded-full shrink-0 ${item.source === 'viacep' ? 'bg-green-100' : 'bg-gray-100'}`}><MapPin className={`w-4 h-4 ${item.source === 'viacep' ? 'text-green-600' : 'text-gray-600'}`} /></div><div className="flex flex-col overflow-hidden"><span className="text-sm font-bold text-gray-900 truncate">{main}</span><span className="text-xs text-gray-500 truncate">{secondary}</span></div></li>);})}</ul>
                      <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 text-[10px] text-center text-gray-400">{suggestions[0]?.source === 'viacep' ? 'Resultado exato por CEP' : 'Resultados de Sorocaba e Votorantim'}</div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Número / Complemento</label>
                  <div className="relative">
                    <input ref={numberInputRef} type="text" value={streetNumber} onChange={(e) => setStreetNumber(e.target.value)} placeholder="Nº 123, Apto 4" className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors text-lg" />
                    <Home className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  </div>
                </div>
                <button onClick={handleAddToRoute} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-lg mt-2 active:scale-[0.98]"><Plus className="w-6 h-6" />Adicionar à Rota</button>
            </div>
          )}
        </div>

        <div className="space-y-3 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-bold text-gray-400 text-sm uppercase">Finalizadas Hoje</h3>
            {todaysDeliveries.length > 0 && (<button onClick={generatePDF} className="text-xs font-bold bg-white text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors border border-gray-200 flex items-center gap-1.5"><Download className="w-3.5 h-3.5" />Baixar Relatório</button>)}
          </div>
          {todaysDeliveries.length === 0 ? (<div className="text-center py-6 bg-transparent"><p className="text-gray-400 text-xs">Nenhuma entrega finalizada hoje.</p></div>) : (<div className="space-y-3">{todaysDeliveries.slice(0, 5).map((delivery) => (<div key={delivery.id} className="bg-white p-3 rounded-lg border border-gray-100 flex justify-between items-center"><div><div className="flex items-center gap-2 mb-1"><span className="font-bold text-gray-700 text-sm">#{delivery.order_id}</span><CheckCircle2 className="w-3 h-3 text-green-500" /></div><p className="text-[10px] text-gray-400 truncate max-w-[200px]">{delivery.address}</p></div><div className="text-right"><span className="text-[10px] text-gray-400 font-mono">{formatTime(delivery.delivered_at)}</span></div></div>))}</div>)}
        </div>

        {/* Cancel Confirmation Modal */}
        {isCancelModalOpen && deliveryToCancel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Cancelar Entrega?</h3>
                <p className="text-sm text-gray-500 mb-6">
                  O pedido <strong>#{deliveryToCancel.order_id}</strong> será removido da sua rota. Tem certeza?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={closeCancelModal}
                    className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Manter
                  </button>
                  <button
                    onClick={handleConfirmCancel}
                    className="w-full bg-red-600 text-white font-bold py-2.5 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                  >
                    Sim, Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};