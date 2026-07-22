// ============================================================
//  اختبار ضغط للقراءة — متجر نقاط معهد قباء
//  يقيس تحمّل الموقع لفتح الصفحات (بدون تسجيل دخول أو شراء)
//  التشغيل:  k6 run k6-read-test.js
//  لتغيير عدد المستخدمين:  k6 run -e VUS=50 k6-read-test.js
// ============================================================

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// ---- عدّل هذا الرابط ليطابق موقعك ----
const BASE = __ENV.BASE_URL || 'https://qubaa-store.vercel.app';

// الحد الأقصى للمستخدمين المتزامنين (افتراضي 20)
const PEAK = Number(__ENV.VUS || 20);

// مقاييس مخصّصة
const loginPageTime = new Trend('page_login_ms');
const homeRedirect = new Rate('home_redirect_ok');

export const options = {
  stages: [
    { duration: '30s', target: Math.ceil(PEAK / 2) }, // تدرّج
    { duration: '1m',  target: PEAK },                // الذروة
    { duration: '30s', target: PEAK },                // ثبات على الذروة
    { duration: '20s', target: 0 },                   // تهدئة
  ],
  thresholds: {
    // 95% من الطلبات يجب أن تكون أسرع من ثانية ونصف
    http_req_duration: ['p(95)<1500'],
    // نسبة الفشل أقل من 1%
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  // 1) صفحة تسجيل الدخول (أكثر صفحة سيفتحها الطلاب أول شيء)
  const res = http.get(`${BASE}/login`, { tags: { page: 'login' } });
  loginPageTime.add(res.timings.duration);
  check(res, {
    'login: status 200': (r) => r.status === 200,
    'login: فيها محتوى': (r) => r.body && r.body.length > 500,
  });

  sleep(1);

  // 2) الجذر — يجب أن يعيد التوجيه لصفحة الدخول (يختبر عمل الـ middleware)
  const root = http.get(`${BASE}/`, {
    redirects: 0,
    tags: { page: 'root' },
  });
  const ok = root.status === 307 || root.status === 302 || root.status === 200;
  homeRedirect.add(ok);
  check(root, { 'root: إعادة توجيه سليمة': () => ok });

  sleep(1);
}

export function handleSummary(data) {
  const m = data.metrics;
  const p95 = m.http_req_duration ? m.http_req_duration.values['p(95)'] : 0;
  const avg = m.http_req_duration ? m.http_req_duration.values.avg : 0;
  const failRate = m.http_req_failed ? m.http_req_failed.values.rate * 100 : 0;
  const reqs = m.http_reqs ? m.http_reqs.values.count : 0;
  const rps = m.http_reqs ? m.http_reqs.values.rate : 0;

  const line = (s) => s + '\n';
  let out = '';
  out += line('');
  out += line('=========== ملخّص اختبار الضغط (قراءة) ===========');
  out += line(`المستخدمون المتزامنون (ذروة): ${PEAK}`);
  out += line(`إجمالي الطلبات:               ${reqs}`);
  out += line(`طلبات في الثانية (RPS):        ${rps.toFixed(2)}`);
  out += line(`متوسط زمن الاستجابة:           ${avg.toFixed(0)} ms`);
  out += line(`p95 (95% من المستخدمين أسرع من): ${p95.toFixed(0)} ms`);
  out += line(`نسبة الفشل:                    ${failRate.toFixed(2)}%`);
  out += line('');
  out += line('التقييم:');
  out += line(`  p95 < 1000ms  = ممتاز | 1000-2500 = مقبول | > 2500 = بطيء`);
  out += line(`  نسبة الفشل يجب أن تكون قريبة من 0%`);
  out += line('==================================================');
  out += line('');

  return { stdout: out };
}
