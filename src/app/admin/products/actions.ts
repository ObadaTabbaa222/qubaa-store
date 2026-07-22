'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/supabase';
import { requireAdmin } from '@/lib/session';

export async function saveProduct(_prev: any, form: FormData) {
  await requireAdmin();
  const id = String(form.get('id') || '');
  const supa = db();

  let image_url: string | null = null;
  const file = form.get('image') as File | null;
  if (file && file.size > 0) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supa.storage
      .from('product-images')
      .upload(path, file, { contentType: file.type || 'image/jpeg' });
    if (upErr) return { error: 'فشل رفع الصورة: ' + upErr.message };
    const { data: pub } = supa.storage.from('product-images').getPublicUrl(path);
    image_url = pub.publicUrl;
  }

  const is_unlimited = form.get('is_unlimited') === 'on';
  const maxPerStudentRaw = String(form.get('max_per_student') || '').trim();
  const max_per_student = maxPerStudentRaw ? Number(maxPerStudentRaw) : null;

  const payload: Record<string, unknown> = {
    name: String(form.get('name') || '').trim(),
    description: String(form.get('description') || '').trim() || null,
    price_points: Number(form.get('price_points') || 0),
    stock_quantity: Number(form.get('stock_quantity') || 0),
    is_active: form.get('is_active') === 'on',
    is_unlimited,
    max_per_student,
  };
  if (image_url) payload.image_url = image_url;
  if (!payload.name || (payload.price_points as number) <= 0) return { error: 'الاسم والسعر مطلوبان' };
  if (max_per_student != null && max_per_student <= 0) return { error: 'الحد الأقصى لكل طالب يجب أن يكون أكبر من صفر' };

  const res = id
    ? await supa.from('products').update(payload).eq('id', id)
    : await supa.from('products').insert(payload);
  if (res.error) return { error: res.error.message };
  revalidatePath('/admin/products');
  return { ok: true };
}

export async function deleteProduct(id: string) {
  await requireAdmin();
  await db().from('products').delete().eq('id', id);
  revalidatePath('/admin/products');
}
