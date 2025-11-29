// Tipos de dados alinhados com as tabelas do Supabase

export interface Sale {
  id: number;
  order_id?: string;
  date: string; // YYYY-MM-DD
  value: number;
  delivery_fee?: number;
  created_at: string; // ISO 8601 timestamp string
  justification?: string;
}

export interface Payment {
  id: number;
  person: 'Bruno' | 'Daniele';
  date: string; // YYYY-MM-DD
  value: number;
  created_at: string; // ISO 8601 timestamp string
}

export interface Delivery {
  id: number;
  order_id: string;
  address: string;
  status: 'in_route' | 'delivered';
  start_time: string; // ISO 8601 timestamp string
  delivered_at: string | null; // ISO 8601 timestamp string, null if in route
  created_at: string;
  driver_email?: string; // Identifica qual entregador realizou a entrega
  delivery_fee?: number; // Valor da taxa que o entregador recebe
}

export type UserRole = 'admin' | 'driver';

// Tipo para os totais calculados no dashboard do admin
export interface SummaryStats {
  totalSales: number;
  totalCommission: number; // 15%
  commissionPerPerson: number; // 7.5%
  salesCount: number;
  paidBruno: number;
  paidDaniele: number;
  balanceBruno: number;
  balanceDaniele: number;
}