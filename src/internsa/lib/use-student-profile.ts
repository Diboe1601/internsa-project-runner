import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchProfile } from './repository';
import { supabase } from './supabase';

export function useStudentProfile(userId?: string) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['student-profile', userId],
    queryFn: () => userId ? fetchProfile(userId) : Promise.resolve(null),
    enabled: Boolean(userId),
    refetchInterval: 15000,
    refetchOnWindowFocus: 'always',
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`student-profile-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: ['student-profile', userId] });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [userId, queryClient]);

  return query;
}