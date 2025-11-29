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
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, colorClass, subValue, onAction, actionLabel }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 flex items-start space-x-4 transition-all hover:shadow-md relative group">
      <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${colorClass.replace('bg-', 'text-')}`} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
        {subValue && (
          <p className="text-xs text-gray-400 mt-1">{subValue}</p>
        )}
        
        {onAction && actionLabel && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onAction();
            }}
            className="mt-3 text-xs font-bold px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors flex items-center gap-1 active:scale-95"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};