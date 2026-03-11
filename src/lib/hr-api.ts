import { supabaseAuth } from '@/integrations/supabase/client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export async function hrApi<T = any>(action: string, params?: Record<string, any>): Promise<T> {
  const { data: { session } } = await supabaseAuth.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(`${SUPABASE_URL}/functions/v1/hr-api`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, ...params }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'HR API error');
  return data;
}
