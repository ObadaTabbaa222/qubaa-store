// ============================================================
//  تجهيز بيانات الاختبار — متجر نقاط معهد قباء
//  ينشئ حلقة اختبار + طلاب + منتجات تجريبية
//  التشغيل من مجلد المشروع:
//     node test-seed.mjs
//  خيارات:
//     node test-seed.mjs 50      (لإنشاء 50 طالب بدل 30)
// ============================================================

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { readFileSync, writeFileSync } from 'node:fs';

// ---- تحميل .env يدوياً ----
try {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {
  console.error('لم أجد ملف .env — شغّل السكربت من داخل مجلد المشروع.');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('متغيّرات Supabase مفقودة في .env');
  process.exit(1);
}

const supa = createClient(url, key, { auth: { persistSession: false } });

const COUNT = Number(process.argv[2] || 30);
const TAG = 'LOADTEST';           // وسم مميّز لكل بيانات الاختبار
const HALAQAH_NAME = `${TAG}-حلقة الاختبار`;

console.log(`\n=== تجهيز بيانات الاختبار (${COUNT} طالب) ===\n`);

// 1) إنشاء حلقة الاختبار
const { data: halaqah, error: hErr } = await supa
  .from('halaqat')
  .insert({ name: HALAQAH_NAME })
  .select()
  .single();

if (hErr) { console.error('فشل إنشاء الحلقة:', hErr.message); process.exit(1); }
console.log(`✓ أُنشئت الحلقة: ${HALAQAH_NAME}`);

// 2) إنشاء الطلاب برصيد كبير
const students = [];
for (let i = 1; i <= COUNT; i++) {
  const username = `lt${String(i).padStart(4, '0')}`;
  const password = `test${String(i).padStart(4, '0')}`;
  students.push({
    halaqah_id: halaqah.id,
    full_name: `${TAG}-طالب ${i}`,
    username,
    password_hash: await bcrypt.hash(password, 10),
    password_plain: password,
    balance: 100000,               // رصيد ضخم حتى لا ينفد أثناء الاختبار
    is_active: true,
  });
}

const { data: insertedStudents, error: sErr } = await supa
  .from('students')
  .insert(students)
  .select('id, username, password_plain, balance');

if (sErr) { console.error('فشل إنشاء الطلاب:', sErr.message); process.exit(1); }
console.log(`✓ أُنشئ ${insertedStudents.length} طالب (رصيد كل واحد 100000)`);

// 3) منتج بمخزون ضخم — لاختبار الحمل العام
const { data: bulkProduct, error: p1Err } = await supa
  .from('products')
  .insert({
    name: `${TAG}-منتج وفير`,
    description: 'منتج اختبار بمخزون كبير',
    price_points: 10,
    stock_quantity: 999999,
    is_active: true,
  })
  .select()
  .single();
if (p1Err) { console.error('فشل إنشاء المنتج الوفير:', p1Err.message); process.exit(1); }
console.log(`✓ أُنشئ منتج وفير (مخزون 999999، سعر 10)`);

// 4) منتج بقطعة واحدة — لاختبار التزاحم على آخر قطعة
const { data: scarceProduct, error: p2Err } = await supa
  .from('products')
  .insert({
    name: `${TAG}-منتج نادر`,
    description: 'قطعة واحدة فقط — لاختبار التزاحم',
    price_points: 50,
    stock_quantity: 1,
    is_active: true,
  })
  .select()
  .single();
if (p2Err) { console.error('فشل إنشاء المنتج النادر:', p2Err.message); process.exit(1); }
console.log(`✓ أُنشئ منتج نادر (مخزون 1 فقط، سعر 50)`);

// 5) حفظ المراجع لملف يستخدمه سكربت الاختبار
const refs = {
  tag: TAG,
  halaqah_id: halaqah.id,
  bulk_product_id: bulkProduct.id,
  scarce_product_id: scarceProduct.id,
  students: insertedStudents.map((s) => ({
    id: s.id, username: s.username, password: s.password_plain,
  })),
};
writeFileSync('test-refs.json', JSON.stringify(refs, null, 2));

console.log(`\n✓ حُفظت المراجع في: test-refs.json`);
console.log(`\nالخطوة التالية:  node test-race.mjs`);
console.log(`للحذف لاحقاً:     node test-cleanup.mjs\n`);
