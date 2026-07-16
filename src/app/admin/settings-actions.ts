'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/supabase';
import { requireAdmin } from '@/lib/session';

export async function setStoreOpen(open: boolean) {
  await requireAdmin();
  await db().from('settings').update({ store_open: open }).eq('id', true);
  revalidatePath('/', 'layout');
}
