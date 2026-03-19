
import { useState, useEffect, useCallback } from 'react';
import { exchangeService, type Exchange } from '@/services/exchangeService';

interface UseExchangesOptions {
  status?: string;
}

export function useExchanges(options: UseExchangesOptions = {}) {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await exchangeService.list(options.status);
      setExchanges(result.content ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exchanges');
    } finally {
      setLoading(false);
    }
  }, [options.status]);

  useEffect(() => { fetch(); }, [fetch]);

  return { exchanges, loading, error, refetch: fetch };
}
