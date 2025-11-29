import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, CheckCircle2, Package, LogOut, Clock, RotateCcw, Search, Home, X } from 'lucide-react';
import { DeliveryLog } from '../types';

interface DriverDashboardProps {
  onLogout: () => void;
  onAddDelivery: (orderId: string, address: string) => void;
  deliveries: DeliveryLog[];
}

interface AddressSuggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    state?: string;
    postcode?: string;
  };
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ onLogout, onAddDelivery, deliveries }) => {
  const [orderId, setOrderId] = useState('');
  
  // Address States
  const [addressQuery, setAddressQuery] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lon: number} | null>(null);
  
  const [step, setStep] = useState<'input' | 'navigating'>('input');
  
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const numberInputRef = useRef<HTMLInputElement>(null);

  // Get User Location on Mount for localized search
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        (error) => {
          console.log("GPS não disponível, usando fallback (Sorocaba/SP)", error);
          // Fallback location (Sorocaba center approx) if GPS denied
          setUserLocation({ lat: -23.5015, lon: -47.4521 }); 
        }
      );
    }
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  // Fetch suggestions from OpenStreetMap (Nominatim)
  const fetchSuggestions = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      // Calculate Bounding Box (~20km radius)
      // 1 degree lat ~= 111km. 20km ~= 0.18 degrees.
      let viewboxParam = '';
      if (userLocation) {
        const delta = 0.2; 
        const left = userLocation.lon - delta;
        const top = userLocation.lat + delta;
        const right = userLocation.lon + delta;
        const bottom = userLocation.lat - delta;
        viewboxParam = `&viewbox=${left},${top},${right},${bottom}&bounded=1`;
      }

      // Removido cabeçalho User-Agent para evitar erro de CORS no navegador
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=br${viewboxParam}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Erro ao buscar endereços:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAddressQuery(val);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 400); 
  };

  const clearAddress = () => {
    setAddressQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const selectAddress = (suggestion: AddressSuggestion) => {
    // Construct a cleaner address string
    let mainText = '';
    
    if (suggestion.address.road) {
        mainText = suggestion.address.road;
    } else {
        mainText = suggestion.display_name.split(',')[0];
    }
    
    // Append neighborhood if available
    if (suggestion.address.suburb) {
        mainText += `, ${suggestion.address.suburb}`;
    }

    setAddressQuery(mainText);
    setSuggestions([]);
    setShowSuggestions(false);
    
    // Auto-focus number input for speed
    setTimeout(() => {
        numberInputRef.current?.focus();
    }, 100);
  };

  const formatSuggestionDisplay = (suggestion: AddressSuggestion) => {
    const parts = suggestion.display_name.split(', ');
    const main = parts[0]; // Usually the street
    const secondary = parts.slice(1, 4).join(', '); // Neighborhood, City, State usually
    
    // Se tiver dados estruturados, usa eles para garantir
    const road = suggestion.address.road || main;
    const details = [
        suggestion.address.suburb, 
        suggestion.address.city || suggestion.address.town, 
        suggestion.address.state
    ].filter(Boolean).join(', ');

    return { main: road, secondary: details || secondary };
  };

  const handleStartNavigation = () => {
    if (!addressQuery || !orderId) {
      alert("Preencha o número do pedido e o endereço.");
      return;
    }

    // Combina Rua + Número para o GPS
    const fullDestination = streetNumber 
      ? `${addressQuery}, ${streetNumber}` 
      : addressQuery;

    const encodedAddress = encodeURIComponent(fullDestination);
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}&travelmode=driving`;
    
    window.open(mapsUrl, '_blank');
    setStep('navigating');
  };

  const handleConfirmDelivery = () => {
    const fullAddress = streetNumber ? `${addressQuery}, ${streetNumber}` : addressQuery;
    onAddDelivery(orderId, fullAddress);
    
    // Resetar
    setOrderId('');
    setAddressQuery('');
    setStreetNumber('');
    setStep('input');
    alert("Entrega confirmada com sucesso!");
  };

  const handleCancelNavigation = () => {
    setStep('input');
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-brand-600 p-1.5 rounded-lg">
              <Navigation className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">Entregas</h1>
          </div>
          <button 
            onClick={onLogout}
            className="text-gray-500 hover:text-red-600 transition-colors p-2"
            title="Sair"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        
        {/* Main Action Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-brand-600 px-6 py-4">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <Package className="w-5 h-5" />
              Nova Entrega
            </h2>
            <p className="text-brand-100 text-sm">Preencha os dados para iniciar</p>
          </div>

          <div className="p-6 space-y-5">
            {step === 'input' ? (
              <>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nº do Pedido</label>
                  <input
                    type="text"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="Ex: 123"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors text-lg"
                  />
                </div>

                <div ref={wrapperRef} className="relative">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Endereço (Rua/Avenida)</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={addressQuery}
                      onChange={handleAddressChange}
                      onFocus={() => { if(suggestions.length > 0) setShowSuggestions(true); }}
                      placeholder="Digite para buscar..."
                      className="w-full pl-11 pr-10 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors text-lg truncate"
                    />
                    <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 ${isSearching ? 'text-brand-500 animate-pulse' : 'text-gray-400'}`} />
                    
                    {addressQuery && (
                        <button 
                            onClick={clearAddress}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                        >
                            <X className="w-4 h-4 text-gray-500" />
                        </button>
                    )}
                  </div>

                  {/* Suggestions Dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto divide-y divide-gray-100">
                      <ul>
                        {suggestions.map((item) => {
                           const { main, secondary } = formatSuggestionDisplay(item);
                           return (
                            <li 
                                key={item.place_id}
                                onClick={() => selectAddress(item)}
                                className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-start gap-3 transition-colors"
                            >
                                <div className="mt-1 p-1.5 bg-gray-100 rounded-full shrink-0">
                                    <MapPin className="w-4 h-4 text-gray-600" />
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-sm font-bold text-gray-900 truncate">{main}</span>
                                    <span className="text-xs text-gray-500 truncate">{secondary}</span>
                                </div>
                            </li>
                           );
                        })}
                      </ul>
                      <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 text-[10px] text-center text-gray-400">
                        Resultados próximos a você
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Número / Complemento</label>
                  <div className="relative">
                    <input
                      ref={numberInputRef}
                      type="text"
                      value={streetNumber}
                      onChange={(e) => setStreetNumber(e.target.value)}
                      placeholder="Nº 123, Apto 4"
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors text-lg"
                    />
                    <Home className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Preencha o número para precisão do GPS.</p>
                </div>

                <button
                  onClick={handleStartNavigation}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-lg mt-2 active:scale-[0.98]"
                >
                  <Navigation className="w-5 h-5" />
                  Iniciar Rota (GPS)
                </button>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <Navigation className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Em Trânsito</h3>
                <p className="text-gray-500 mb-6">Pedido: <span className="font-bold text-gray-800">#{orderId}</span></p>
                
                <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-100 text-left">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Destino:</p>
                  <p className="text-gray-900 font-bold text-lg leading-tight">
                    {addressQuery}
                  </p>
                  {streetNumber && (
                    <p className="text-gray-600 font-medium mt-1">
                      {streetNumber}
                    </p>
                  )}
                </div>

                <div className="grid gap-3">
                  <button
                    onClick={handleConfirmDelivery}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-lg active:scale-[0.98]"
                  >
                    <CheckCircle2 className="w-6 h-6" />
                    Pedido Entregue
                  </button>
                  
                  <button
                    onClick={handleStartNavigation}
                    className="w-full bg-white border border-gray-300 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Navigation className="w-4 h-4" />
                    Reabrir GPS
                  </button>

                  <button
                    onClick={handleCancelNavigation}
                    className="w-full text-gray-400 hover:text-gray-600 font-medium py-2 text-sm flex items-center justify-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Cancelar / Corrigir
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Deliveries List */}
        <div className="space-y-3">
          <h3 className="font-bold text-gray-800 px-1">Entregas Realizadas Hoje</h3>
          {deliveries.filter(d => {
             const today = new Date().toDateString();
             const deliveryDate = new Date(d.deliveredAt).toDateString();
             return today === deliveryDate;
          }).length === 0 ? (
            <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-400 text-sm">Nenhuma entrega finalizada hoje.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deliveries
                .sort((a, b) => b.deliveredAt - a.deliveredAt)
                .slice(0, 10) // Show last 10
                .map((delivery) => (
                <div key={delivery.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-gray-900">Pedido #{delivery.orderId}</span>
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">Entregue</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate max-w-[200px]">{delivery.address}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-gray-400 text-xs font-medium">
                      <Clock className="w-3 h-3" />
                      {formatTime(delivery.deliveredAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};