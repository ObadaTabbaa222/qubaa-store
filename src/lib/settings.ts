import { db } from '@/lib/supabase';

export async function getStoreOpen(): Promise<boolean> {
  const { data } = await db().from('settings').select('store_open').limit(1).maybeSingle();
  return data?.store_open ?? false;
}
