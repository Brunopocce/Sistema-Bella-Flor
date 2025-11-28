export interface Sale {
  id: string;
  orderId?: string;
  date: string; // ISO string YYYY-MM-DD
  value: number; // Valor do produto (base para comissão)
  deliveryFee?: number; // Taxa de entrega (não entra na comissão)
  createdAt: number;
  justification?: string; // Motivo da edição
}

export interface Payment {
  id: string;
  person: 'Bruno' | 'Daniele';
  date: string;
  value: number;
  createdAt: number;
}

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