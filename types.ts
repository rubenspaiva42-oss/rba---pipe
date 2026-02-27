export type LeadSource = 'indicacao' | 'redes_sociais' | 'lista_fria';

export type ProductType = 'investimentos' | 'seguros' | 'consorcio' | 'previdencia' | 'cambio' | 'credito' | 'outros';

export interface ProductItem {
  id: string;
  type: ProductType;
  customName?: string; // Usado se type for 'outros'
  investmentType?: string; // NOVO: Usado se type for 'investimentos' (Ex: CDB, Ações, Fundo)
  value: number;
  details?: string; // NOVO: Detalhes da operação (Ex: Prêmio Anual/Mensal, Prazo, Taxa)
  isSold?: boolean; // Usado no fechamento
}

export interface ClosedData {
  finalValue: number;
  products: ProductItem[]; // Produtos efetivamente vendidos
  closedAt: string; // ISO Date String
}

export interface Lead {
  id: string;
  createdAt: string; // Data de entrada no pipeline (cumulativo)
  name: string;
  phone?: string; // NOVO: Telefone de contato
  email?: string; // NOVO: Email de contato
  value: number; // Valor total (soma dos produtos)
  status: 'lead' | 'ligacao' | 'reuniao1' | 'reuniao2' | 'fechamento';
  source: LeadSource;
  lastActivity: string;
  products: ProductItem[]; // Produtos prospectados/em negociação
  closedData?: ClosedData; // Dados preenchidos apenas no fechamento
  notes?: string; // NOVO: Campo para detalhar o que houve na etapa (motivo de não avanço)
  scheduledFor?: string; // NOVO: Data e hora do agendamento (ISO Date String)
  isQualifiedOpening?: boolean; // NOVO: Se houve abertura de conta >= 300k
}

export type ActivityType = 'call' | 'meeting1' | 'meeting2';

export interface AdvisorGoals {
  monthlyInvestment: number;
  weeklyCalls: number;
  weeklyMeeting1: number;
  weeklyMeeting2: number;
  monthlyQualifiedOpenings: number;
}

export interface Activity {
  id: string;
  type: ActivityType;
  timestamp: string; // ISO Date String
  leadId?: string;
}

export interface Advisor {
  id: string;
  name: string;
  photoUrl: string;
  role: string;
  leads: Lead[];
  activities: Activity[]; // Histórico completo de atividades
  goals?: AdvisorGoals; // NOVO: Metas individuais
}

export interface Metric {
  label: string;
  current: number;
  target: number;
  unit: string;
}

export enum AppView {
  LANDING = 'LANDING',
  DASHBOARD = 'DASHBOARD'
}