import { supabaseAuth } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

let cachedAccessToken: string | null = null;
let sessionPromise: Promise<string | null> | null = null;

async function getAccessToken(): Promise<string | null> {
  if (cachedAccessToken) return cachedAccessToken;
  if (!sessionPromise) {
    sessionPromise = supabaseAuth.auth.getSession().then(({ data: { session } }) => {
      cachedAccessToken = session?.access_token ?? null;
      sessionPromise = null;
      return cachedAccessToken;
    });
  }
  return sessionPromise;
}

supabaseAuth.auth.onAuthStateChange((_event, session) => {
  cachedAccessToken = session?.access_token ?? null;
});

export async function hrApi<T = unknown>(
  action: string,
  params?: Record<string, unknown>,
): Promise<T> {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error('Not authenticated');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/hr-api`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...params }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'HR API error');
  return data;
}
