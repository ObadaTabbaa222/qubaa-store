'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/supabase';
import { requireAdmin } from '@/lib/session';
import { hashPassword } from '@/lib/auth';

function rand(len: number, chars: string) {
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

// يتحقق من عدم تكرار الاسم داخل نفس الحلقة (سواء ضمن الدفعة نفسها أو مع طلاب موجودين)
function findDuplicateNames(names: string[], existingNames: string[]): string[] {
  const seen = new Map<string, string>(); // normalized -> original casing (first occurrence)
  const existingNormalized = new Set(existingNames.map(normalizeName));
  const duplicates = new Set<string>();

  for (const raw of names) {
    const norm = normalizeName(raw);
    if (existingNormalized.has(norm) || seen.has(norm)) {
      duplicates.add(seen.get(norm) ?? raw);
    } else {
      seen.set(norm, raw);
    }
  }
  return [...duplicates];
}

async function generateStudentRows(halaqah_id: string, names: string[]) {
  const used = new Set<string>();
  const supa = db();
  const { data: existing } = await supa.from('students').select('username');
  for (const e of existing ?? []) used.add(e.username);

  const rows: any[] = [];
  const creds: { full_name: string; username: string; password: string }[] = [];
  for (const full_name of names) {
    let username = '';
    do { username = 'qb' + rand(4, '0123456789'); } while (used.has(username));
    used.add(username);
    const password = rand(6, 'abcdefghjkmnpqrstuvwxyz23456789'); // بدون أحرف ملتبسة
    rows.push({
      halaqah_id, full_name, username,
      password_hash: await hashPassword(password),
      password_plain: password,
    });
    creds.push({ full_name, username, password });
  }
  return { rows, creds };
}

// إنشاء حلقة جديدة + حسابات طلابها دفعة واحدة
export async function createHalaqahWithStudents(_prev: any, form: FormData) {
  await requireAdmin();
  const name = String(form.get('name') || '').trim();
  const raw = String(form.get('names') || '');
  const names = raw.split('\n').map((n) => n.trim()).filter(Boolean);
  if (!name) return { error: 'أدخل اسم الحلقة' };
  if (names.length === 0) return { error: 'أدخل أسماء الطلاب (اسم في كل سطر)' };

  const duplicates = findDuplicateNames(names, []);
  if (duplicates.length > 0) {
    return { error: `أسماء مكررة في القائمة: ${duplicates.join('، ')}. عدّل الأسماء المكررة وأعد المحاولة.` };
  }

  const supa = db();
  const { data: halaqah, error: hErr } = await supa.from('halaqat').insert({ name }).select('id, name').single();
  if (hErr || !halaqah) return { error: hErr?.message || 'تعذّر إنشاء الحلقة' };

  const { rows, creds } = await generateStudentRows(halaqah.id, names);
  const { error: sErr } = await supa.from('students').insert(rows);
  if (sErr) return { error: 'أُنشئت الحلقة لكن فشل إنشاء الطلاب: ' + sErr.message };

  revalidatePath('/admin/halaqat');
  return { ok: true, halaqahName: halaqah.name, credentials: creds };
}

// إضافة طلاب إلى حلقة موجودة
export async function addStudentsToHalaqah(_prev: any, form: FormData) {
  await requireAdmin();
  const halaqah_id = String(form.get('halaqah_id') || '');
  const raw = String(form.get('names') || '');
  const names = raw.split('\n').map((n) => n.trim()).filter(Boolean);
  if (!halaqah_id) return { error: 'اختر الحلقة' };
  if (names.length === 0) return { error: 'أدخل أسماء الطلاب (اسم في كل سطر)' };

  const supa = db();
  const { data: existingStudents } = await supa.from('students').select('full_name').eq('halaqah_id', halaqah_id);
  const duplicates = findDuplicateNames(names, (existingStudents ?? []).map((s) => s.full_name));
  if (duplicates.length > 0) {
    return { error: `أسماء مكررة في هذه الحلقة: ${duplicates.join('، ')}. عدّل الأسماء المكررة وأعد المحاولة.` };
  }

  const { rows, creds } = await generateStudentRows(halaqah_id, names);
  const { error } = await supa.from('students').insert(rows);
  if (error) return { error: 'خطأ (قد يكون اسم مستخدم مكرر، أعد المحاولة): ' + error.message };
  revalidatePath('/admin/halaqat');
  return { ok: true, credentials: creds };
}

export async function updateStudentBalance(id: string, balance: number) {
  await requireAdmin();
  if (!Number.isFinite(balance) || balance < 0) return { error: 'رصيد غير صالح' };
  const { error } = await db().from('students').update({ balance }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/halaqat');
  return { ok: true };
}

export async function updateStudent(_prev: any, form: FormData) {
  await requireAdmin();
  const id = String(form.get('id') || '');
  const full_name = String(form.get('full_name') || '').trim();
  const username = String(form.get('username') || '').trim();
  if (!id || !full_name || !username) return { error: 'كل الحقول مطلوبة' };
  const { error } = await db().from('students').update({ full_name, username }).eq('id', id);
  if (error) return { error: 'تعذّر الحفظ (قد يكون اسم المستخدم مستخدَماً): ' + error.message };
  revalidatePath('/admin/halaqat');
  return { ok: true };
}

export async function deleteStudent(id: string) {
  await requireAdmin();
  await db().from('students').delete().eq('id', id);
  revalidatePath('/admin/halaqat');
}

export async function updateHalaqah(id: string, name: string) {
  await requireAdmin();
  if (!name.trim()) return { error: 'أدخل اسم الحلقة' };
  const { error } = await db().from('halaqat').update({ name: name.trim() }).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/halaqat');
  return { ok: true };
}

export async function deleteHalaqah(id: string) {
  await requireAdmin();
  await db().from('halaqat').delete().eq('id', id);
  revalidatePath('/admin/halaqat');
}
