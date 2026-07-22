// ============================================================
//  اختبار الضغط والتزاحم على منطق الشراء — متجر نقاط معهد قباء
//  يختبر دالة place_order تحت طلبات متزامنة حقيقية
//  التشغيل من مجلد المشروع (بعد test-seed.mjs):
//     node test-race.mjs
//  خيارات:
//     node test-race.mjs 50     (50 طلب متزامن بدل 20)
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

// ---- تحميل .env ----
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

let refs;
try {
  refs = JSON.parse(readFileSync('test-refs.json', 'utf8'));
} catch {
  console.error('لم أجد test-refs.json — شغّل أولاً:  node test-seed.mjs');
  process.exit(1);
}

const N = Number(process.argv[2] || 20);

// ---------- أدوات مساعدة ----------
const pct = (arr, p) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};
const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

async function callPlaceOrder(studentId, productId, qty) {
  const t0 = Date.now();
  const { data, error } = await supa.rpc('place_order', {
    p_student_id: studentId,
    p_items: [{ product_id: productId, quantity: qty }],
    p_note: 'LOADTEST',
  });
  return { ms: Date.now() - t0, ok: !error, error: error?.message, orderId: data };
}

// ---------- التحقّق من أن المتجر مفتوح ----------
console.log('\n=== اختبار الضغط على منطق الشراء ===\n');
const { data: settings } = await supa.from('settings').select('*').limit(1).maybeSingle();
if (settings && settings.store_open === false) {
  console.error('⚠️  المتجر مغلق حالياً — افتحه من لوحة التحكم ثم أعد التشغيل.');
  process.exit(1);
}
console.log('✓ المتجر مفتوح\n');

// ============================================================
//  الاختبار (١): ضغط عام — طلبات متزامنة على منتج وفير
// ============================================================
console.log(`--- الاختبار ١: ${N} طلب متزامن على منتج وفير ---`);

const before1 = await supa
  .from('products').select('stock_quantity').eq('id', refs.bulk_product_id).single();

const pool = refs.students.slice(0, N);
if (pool.length < N) {
  console.log(`ملاحظة: يوجد ${pool.length} طالب فقط، سيُعاد استخدام بعضهم.`);
}

const tasks1 = [];
for (let i = 0; i < N; i++) {
  const st = refs.students[i % refs.students.length];
  tasks1.push(callPlaceOrder(st.id, refs.bulk_product_id, 1));
}

const t1Start = Date.now();
const results1 = await Promise.all(tasks1);
const t1Total = Date.now() - t1Start;

const ok1 = results1.filter((r) => r.ok);
const fail1 = results1.filter((r) => !r.ok);
const times1 = results1.map((r) => r.ms);

const after1 = await supa
  .from('products').select('stock_quantity').eq('id', refs.bulk_product_id).single();

console.log(`  نجح:            ${ok1.length} / ${N}`);
console.log(`  فشل:            ${fail1.length}`);
console.log(`  الزمن الكلي:     ${t1Total} ms`);
console.log(`  متوسط الطلب:     ${avg(times1).toFixed(0)} ms`);
console.log(`  p95:            ${pct(times1, 95)} ms`);
console.log(`  أبطأ طلب:        ${Math.max(...times1)} ms`);
console.log(`  المخزون قبل/بعد: ${before1.data.stock_quantity} → ${after1.data.stock_quantity}`);

const expectedStock = before1.data.stock_quantity - ok1.length;
if (after1.data.stock_quantity === expectedStock) {
  console.log(`  ✓ المخزون متطابق تماماً مع عدد الطلبات الناجحة`);
} else {
  console.log(`  ✗ خلل! المتوقع ${expectedStock} والفعلي ${after1.data.stock_quantity}`);
}
if (fail1.length) {
  const sample = [...new Set(fail1.map((f) => f.error))].slice(0, 3);
  console.log(`  أسباب الفشل (عيّنة): ${sample.join(' | ')}`);
}

// ============================================================
//  الاختبار (٢): التزاحم على آخر قطعة — الأهم
// ============================================================
console.log(`\n--- الاختبار ٢: ${N} طالب يتزاحمون على قطعة واحدة ---`);

// إعادة ضبط المخزون إلى 1
await supa.from('products').update({ stock_quantity: 1 }).eq('id', refs.scarce_product_id);

const tasks2 = [];
for (let i = 0; i < N; i++) {
  const st = refs.students[i % refs.students.length];
  tasks2.push(callPlaceOrder(st.id, refs.scarce_product_id, 1));
}

const results2 = await Promise.all(tasks2);
const ok2 = results2.filter((r) => r.ok);
const fail2 = results2.filter((r) => !r.ok);

const after2 = await supa
  .from('products').select('stock_quantity').eq('id', refs.scarce_product_id).single();

console.log(`  نجح:      ${ok2.length}  (المتوقع: 1 بالضبط)`);
console.log(`  رُفض:     ${fail2.length}`);
console.log(`  المخزون بعد: ${after2.data.stock_quantity}  (المتوقع: 0)`);

const racePassed = ok2.length === 1 && after2.data.stock_quantity === 0;
console.log(racePassed
  ? `  ✓✓ ممتاز — المنطق الذرّي صامد: طالب واحد فقط نجح، ولا بيع زائد`
  : `  ✗✗ تحذير — حدث بيع زائد! نجح ${ok2.length} بدل 1`);

// ============================================================
//  الاختبار (٣): سلامة الأرصدة — لا رصيد سالب
// ============================================================
console.log(`\n--- الاختبار ٣: التحقّق من الأرصدة ---`);
const { data: negatives } = await supa
  .from('students').select('id, full_name, balance').lt('balance', 0);

if (!negatives || negatives.length === 0) {
  console.log(`  ✓ لا يوجد أي رصيد سالب`);
} else {
  console.log(`  ✗ يوجد ${negatives.length} طالب برصيد سالب!`);
  negatives.slice(0, 5).forEach((s) => console.log(`     - ${s.full_name}: ${s.balance}`));
}

// ============================================================
//  الخلاصة
// ============================================================
console.log('\n========== الخلاصة ==========');
console.log(`الطلبات المتزامنة المختبَرة: ${N}`);
console.log(`متوسط زمن عملية الشراء:      ${avg(times1).toFixed(0)} ms`);
console.log(`p95 لعملية الشراء:           ${pct(times1, 95)} ms`);
console.log(`سلامة المخزون:               ${after1.data.stock_quantity === expectedStock ? 'سليم ✓' : 'خلل ✗'}`);
console.log(`اختبار التزاحم:              ${racePassed ? 'نجح ✓' : 'فشل ✗'}`);
console.log(`الأرصدة السالبة:             ${(!negatives || !negatives.length) ? 'لا يوجد ✓' : 'يوجد ✗'}`);
console.log('=============================');
console.log('\nالتقييم: متوسط أقل من 500ms ممتاز | 500-1500 مقبول | أكثر من 2000 يحتاج انتباه');
console.log('لا تنسَ التنظيف بعد الانتهاء:  node test-cleanup.mjs\n');
