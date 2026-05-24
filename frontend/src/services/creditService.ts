import { api } from './api';
import type { PagedResponse } from './communityService';

export interface CreditWallet {
  userId: string;
  balance: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
}

export interface CreditTransaction {
  id: string;
  transactionType: string;
  type?: string;
  amount: number;
  counterpartyUserId?: string | null;
  counterpartyName?: string | null;
  exchangeId?: string | null;
  balanceAfter?: number;
  reason: string;
  description?: string;
  createdAt: string;
}

export const creditService = {
  wallet: (): Promise<CreditWallet> => api.get<CreditWallet>('/credits/wallet'),
  transactions: (page = 0, size = 20): Promise<PagedResponse<CreditTransaction>> =>
    api.get<PagedResponse<CreditTransaction>>(`/credits/transactions?page=${page}&size=${size}`),
};
