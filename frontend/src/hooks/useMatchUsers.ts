
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';

/** Matches backend MatchUserDto */
export interface MatchUser {
  id: string;
  name: string;
  avatar: string | null;
  university: string | null;
  level: string;
  skillexScore: number;
  rating: number;
  isOnline: boolean;
  sessionsCompleted: number;
  compatibilityScore: number;
  semanticSimilarity: number;
  strategyUsed: string;
  /** Skill names they can teach you (from backend teachesYou list) */
  teachesYou: string[];
  /** Skill names they want to learn from you (from backend wantsToLearnFromYou list) */
  wantsToLearnFromYou: string[];
  /** Short explainable reasons for the AI-driven match */
  matchReasons: string[];
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
      const list = await api.get<MatchUser[]>(`/match/users${qs ? `?${qs}` : ''}`);
      setUsers(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  }, [options.search, options.limit]);

  useEffect(() => { fetch(); }, [fetch]);

  return { users, loading, error, refetch: fetch };
}
