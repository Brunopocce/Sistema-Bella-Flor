import React, { useState } from 'react';
import { Lock, Truck, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

export const LoginScreen: React.FC = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let email;
    // Mapeamento de senhas para usuários
    // Admin: 236616
    // Driver Padrão: 123456
    // Everton: 996408466
    // Thiago: 988020221
    if (password === '236616') {
      email = 'admin@bellaflor.com';
    } else if (password === '123456') {
      email = 'driver@bellaflor.com';
    } else if (password === '996408466') {
      email = 'everton@bellaflor.com.br';
    } else if (password === '988020221') {
      email = 'thiago@bellaflor.com.br';
    } else {
      setError('Senha incorreta.');
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      // Auto-Sign Up logic for first time use or database reset
      if (signInError.message.includes('Invalid login credentials')) {
         console.log("Tentando auto-cadastro...");
         
         let name = 'Administrador';
         if (email.includes('everton')) name = 'Everton';
         else if (email.includes('thiago')) name = 'Thiago';
         else if (email.includes('driver')) name = 'Entregador';

         const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    role: email.includes('admin') ? 'admin' : 'driver',
                    name: name
                }
            }
         });
         
         if (signUpError) {
             setError('Erro ao criar usuário: ' + signUpError.message);
         } else {
             // Auto login after sign up often requires email confirmation disabled in Supabase, 
             // but if session is created, App.tsx will catch it.
         }
      } else {
         setError('Ocorreu um erro ao tentar fazer login.');
      }
      console.error("Supabase sign-in error:", signInError);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-brand-600 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
          
          <h1 className="text-white text-4xl font-logo mb-1 relative z-10">BellaFlor</h1>
          <p className="text-brand-100 text-sm relative z-10">Acesso Restrito</p>
        </div>
        
        <div className="p-8 pt-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Senha de Acesso</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ colorScheme: 'light' }}
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-4 focus:ring-brand-100 focus:border-brand-500 outline-none transition-all font-medium text-lg placeholder:text-gray-400"
                  placeholder="Digite sua senha"
                  disabled={loading}
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  {/* Ícone muda baseado na senha digitada */}
                  {(password === '123456' || password === '996408466' || password === '988020221') ? <Truck className="w-5 h-5 text-brand-500" /> : <Lock className="w-5 h-5" />}
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                <Lock className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-brand-200 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 text-lg disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Entrar'}
            </button>
          </form>
        </div>
        <div className="bg-gray-50 px-8 py-4 text-center border-t border-gray-100">
          <p className="text-xs text-gray-400 font-medium">© 2025 BellaFlor Sistemas (Supabase)</p>
        </div>
      </div>
    </div>
  );
};