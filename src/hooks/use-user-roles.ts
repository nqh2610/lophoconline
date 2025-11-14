import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

/**
 * ✅ REALTIME: Hook to fetch fresh user roles from database
 * This ensures dashboard links appear immediately after booking/registration
 * without requiring logout/login
 */
export function useUserRoles() {
  const { data: session } = useSession();
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRoles = useCallback(async () => {
    if (!session?.user) {
      setRoles([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/users/me');
      if (res.ok) {
        const data = await res.json();
        setRoles(data.roles || []);
      }
    } catch (err) {
      console.error('Failed to fetch user roles:', err);
      // Fallback to session roles
      setRoles(session.user.roles || []);
    } finally {
      setLoading(false);
    }
  }, [session?.user]);

  // Auto-fetch on mount and when session changes
  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const hasRole = useCallback((role: string) => {
    return roles.includes(role);
  }, [roles]);

  return {
    roles,
    loading,
    hasRole,
    refetch: fetchRoles, // Manual refetch
  };
}
