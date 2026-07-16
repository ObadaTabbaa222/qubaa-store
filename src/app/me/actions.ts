'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/supabase';
import { requireStudent } from '@/lib/session';

export async function cancelOrder(orderId: string) {
  const student = await requireStudent();
  const supa = db();

  const { data: order } = await supa
    .from('orders')
    .select('id, student_id, status')
    .eq('id', orderId)
    .maybeSingle();

  if (!order || order.student_id !== student.sub || order.status !== 'pending') {
    return { error: 'لا يمكن إلغاء هذا الطلب' };
  }

  const { error } = await supa.rpc('cancel_order', { p_order_id: orderId });
  if (error) return { error: error.message.replace(/^.*?:\s*/, '') };

  revalidatePath('/me');
  revalidatePath('/store');
  return { ok: true };
}
