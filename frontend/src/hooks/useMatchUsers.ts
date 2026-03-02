
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import type { User, Skill } from '@/types';

export interface MatchUser extends User {
  compatibilityScore: number;
  iOffer: Skill | null;   // skill I can teach them
  theyOffer: Skill | null; // skill they can teach me
}

interface UseMatchUsersOptions {
  search?: string;
  limit?: number;
}

export function useMatchUsers(options: UseMatchUsersOptions = {}) {
  const [users, setUsers] = useState<MatchUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (options.search) params.set('q', options.search);
      if (options.limit)  params.set('limit', String(options.limit));
      const qs = params.toString();
      const { data } = await api.get<{ data: MatchUser[] }>(`/users/matches${qs ? `?${qs}` : ''}`);
      setUsers(data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  }, [options.search, options.limit]);

  useEffect(() => { fetch(); }, [fetch]);

  return { users, loading, error, refetch: fetch };
}
