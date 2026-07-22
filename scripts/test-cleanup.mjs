// ============================================================
//  تنظيف بيانات الاختبار — متجر نقاط معهد قباء
//  يحذف كل ما أنشأه test-seed.mjs (حلقة + طلاب + منتجات + طلباتهم)
//  التشغيل من مجلد المشروع:
//     node test-cleanup.mjs
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, unlinkSync } from 'node:fs';

try {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {
  console.error('لم أجد ملف .env — شغّل السكربت من داخل مجلد المشروع.');
  process.exit(1);
}

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const TAG = 'LOADTEST';
console.log('\n=== تنظيف بيانات الاختبار ===\n');

// 1) إيجاد طلاب الاختبار
const { data: students } = await supa
  .from('students').select('id, full_name').like('full_name', `${TAG}%`);

const studentIds = (students || []).map((s) => s.id);
console.log(`وجدت ${studentIds.length} طالب اختبار`);

// 2) حذف طلباتهم (order_items ثم orders)
if (studentIds.length) {
  const { data: orders } = await supa
    .from('orders').select('id').in('student_id', studentIds);
  const orderIds = (orders || []).map((o) => o.id);

  if (orderIds.length) {
    await supa.from('order_items').delete().in('order_id', orderIds);
    await supa.from('orders').delete().in('id', orderIds);
    console.log(`✓ حُذف ${orderIds.length} طلب اختبار`);
  } else {
    console.log('✓ لا توجد طلبات اختبار');
  }

  // 3) حذف الطلاب
  await supa.from('students').delete().in('id', studentIds);
  console.log(`✓ حُذف ${studentIds.length} طالب اختبار`);
}

// 4) حذف حلقة الاختبار
const { data: halaqat } = await supa
  .from('halaqat').select('id, name').like('name', `${TAG}%`);
if (halaqat && halaqat.length) {
  await supa.from('halaqat').delete().in('id', halaqat.map((h) => h.id));
  console.log(`✓ حُذفت ${halaqat.length} حلقة اختبار`);
}

// 5) حذف منتجات الاختبار
const { data: products } = await supa
  .from('products').select('id, name').like('name', `${TAG}%`);
if (products && products.length) {
  const pIds = products.map((p) => p.id);
  // احذف أي بنود طلبات مرتبطة بها أولاً (احتياطاً)
  await supa.from('order_items').delete().in('product_id', pIds);
  await supa.from('products').delete().in('id', pIds);
  console.log(`✓ حُذف ${products.length} منتج اختبار`);
}

// 6) حذف ملف المراجع
if (existsSync('test-refs.json')) {
  unlinkSync('test-refs.json');
  console.log('✓ حُذف ملف test-refs.json');
}

console.log('\n✓ تم التنظيف. تحقّق من لوحة التحكم للتأكد.\n');
