import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { Sale } from '../types';

interface AIAnalysisProps {
  sales: Sale[];
}

export const AIAnalysis: React.FC<AIAnalysisProps> = ({ sales }) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!process.env.API_KEY) {
      alert("API_KEY não encontrada no ambiente.");
      return;
    }
    
    setLoading(true);
    setAnalysis(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const salesSummary = sales.map(s => ({
        data: s.date,
        valor: s.value,
        comissao: s.value * 0.15
      }));

      const prompt = `
        Analise os seguintes dados de vendas de uma loja (formato JSON).
        O objetivo é dar insights curtos e motivacionais para a equipe (Bruno e Daniele).
        
        Dados: ${JSON.stringify(salesSummary)}

        Por favor, forneça:
        1. O dia com melhor performance.
        2. Uma breve tendência (se está subindo ou descendo).
        3. Uma mensagem curta de parabéns sobre o faturamento total.
        
        Mantenha a resposta em HTML simples (sem tags html/body, apenas p, strong, ul, li).
        Use um tom profissional mas amigável.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      setAnalysis(response.text);
    } catch (error) {
      console.error("Erro na análise IA:", error);
      setAnalysis("<p class='text-red-500'>Ocorreu um erro ao conectar com a IA. Tente novamente.</p>");
    } finally {
      setLoading(false);
    }
  };

  if (sales.length < 3) return null;

  return (
    <div className="mt-8 bg-gradient-to-r from-brand-50 to-white rounded-xl p-6 border border-brand-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-brand-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-600" />
          IA Insights
        </h3>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-md hover:bg-brand-700 transition disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gerar Análise'}
        </button>
      </div>

      {analysis && (
        <div 
          className="prose prose-sm prose-pink text-gray-700 max-w-none"
          dangerouslySetInnerHTML={{ __html: analysis }}
        />
      )}
      
      {!analysis && !loading && (
        <p className="text-sm text-gray-500 italic">
          Clique em "Gerar Análise" para ver insights sobre o desempenho de vendas usando Gemini.
        </p>
      )}
    </div>
  );
};