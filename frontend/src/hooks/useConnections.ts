import { useCallback, useEffect, useState } from 'react';
import { connectionService, type Connection } from '@/services/connectionService';

interface UseConnectionsOptions {
  status?: string;
  direction?: 'all' | 'sent' | 'received';
}

export function useConnections(options: UseConnectionsOptions = {}) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await connectionService.list(options.status, options.direction ?? 'all');
      setConnections(result.content ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load connections');
    } finally {
      setLoading(false);
    }
  }, [options.direction, options.status]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { connections, loading, error, refetch: fetch };
}
