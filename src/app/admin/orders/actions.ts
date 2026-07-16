'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/supabase';
import { requireAdmin } from '@/lib/session';

export async function markDelivered(orderId: string) {
  await requireAdmin();
  const { error } = await db()
    .from('orders')
    .update({ status: 'delivered' })
    .eq('id', orderId)
    .eq('status', 'pending');
  if (error) return { error: error.message };
  revalidatePath('/admin/orders');
  revalidatePath('/me');
  return { ok: true };
}
