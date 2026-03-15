import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import type { ScoredCycleDto } from '@/features/match/components/ExchangeChainCard';

interface UseTopCyclesOptions {
  limit?: number;
}

export function useTopCycles({ limit = 20 }: UseTopCyclesOptions = {}) {
  const [cycles, setCycles] = useState<ScoredCycleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.get<ScoredCycleDto[]>(`/match/top-cycles?limit=${limit}`);
      setCycles(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exchange chains');
      setCycles([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => { fetch(); }, [fetch]);

  return { cycles, loading, error, refetch: fetch };
}
