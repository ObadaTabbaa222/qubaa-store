'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/supabase';
import { requireStudent } from '@/lib/session';

export async function placeOrder(items: { product_id: string; quantity: number }[]) {
  const student = await requireStudent();
  if (!items?.length) return { error: 'السلة فارغة' };

  const { data, error } = await db().rpc('place_order', {
    p_student_id: student.sub,
    p_items: items,
    p_note: null,
  });

  if (error) return { error: error.message.replace(/^.*?:\s*/, '') };
  revalidatePath('/store');
  revalidatePath('/me');
  return { ok: true, orderId: data as string };
}
