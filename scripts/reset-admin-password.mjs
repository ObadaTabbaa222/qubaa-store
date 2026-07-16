// تحديث كلمة سر حساب أدمن موجود.
// الاستخدام: node scripts/reset-admin-password.mjs username new-password
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { readFileSync } from 'node:fs';

// تحميل .env يدوياً (بدون حزم إضافية)
try {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch {}

const [username, password] = process.argv.slice(2);
if (!username || !password) {
  console.error('الاستخدام: node scripts/reset-admin-password.mjs username new-password');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('املأ .env أولاً'); process.exit(1); }

const supa = createClient(url, key, { auth: { persistSession: false } });
const password_hash = await bcrypt.hash(password, 10);
const { data, error } = await supa
  .from('admins')
  .update({ password_hash })
  .eq('username', username)
  .select('id, username');

if (error) { console.error('خطأ:', error.message); process.exit(1); }
if (!data || data.length === 0) { console.error(`لا يوجد حساب أدمن باسم المستخدم: ${username}`); process.exit(1); }
console.log(`✓ تم تحديث كلمة سر حساب الأدمن: ${username}`);
