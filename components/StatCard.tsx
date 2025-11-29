import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  colorClass: string;
  subValue?: string;
  onAction?: () => void;
  actionLabel?: string;
  layout?: 'row' | 'col';
}

export const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  colorClass, 
  subValue, 
  onAction, 
  actionLabel,
  layout = 'row' // Padrão horizontal
}) => {
  const isCol = layout === 'col';

  return (
    <div className={`bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex ${isCol ? 'flex-col items-center justify-center text-center' : 'items-start space-x-4'} transition-all hover:shadow-md relative group h-full`}>
      <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10 ${isCol ? 'mb-3 rounded-full' : ''}`}>
        <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
      </div>
      <div className={isCol ? 'w-full' : 'flex-1'}>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <h3 className={`font-bold text-gray-900 mt-1 ${isCol ? 'text-3xl' : 'text-2xl'}`}>{value}</h3>
        {subValue && (
          <p className="text-xs text-gray-400 mt-1">{subValue}</p>
        )}
        
        {onAction && actionLabel && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onAction();
            }}
            className={`mt-3 text-xs font-bold px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors flex items-center gap-1 active:scale-95 ${isCol ? 'mx-auto' : ''}`}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};