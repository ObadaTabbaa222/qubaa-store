'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/supabase';
import { verifyPassword, signSession, SESSION_COOKIE } from '@/lib/auth';

export async function login(_prev: any, formData: FormData) {
  const username = String(formData.get('username') || '').trim();
  const password = String(formData.get('password') || '');
  if (!username || !password) return { error: 'أدخل اسم المستخدم وكلمة السر' };

  const supa = db();

  // جرّب الأدمن أولاً
  const { data: admin } = await supa
    .from('admins')
    .select('id, name, username, password_hash, is_active')
    .eq('username', username)
    .maybeSingle();

  if (admin && admin.is_active && (await verifyPassword(password, admin.password_hash))) {
    await setSession(admin.id, 'admin', admin.username, admin.name);
    redirect('/admin');
  }

  // ثم الطالب
  const { data: student } = await supa
    .from('students')
    .select('id, full_name, username, password_hash, is_active')
    .eq('username', username)
    .maybeSingle();

  if (student && student.is_active && (await verifyPassword(password, student.password_hash))) {
    await setSession(student.id, 'student', student.username, student.full_name);
    redirect('/store');
  }

  return { error: 'اسم المستخدم أو كلمة السر غير صحيحة' };
}

async function setSession(id: string, role: 'admin' | 'student', username: string, name: string) {
  const token = await signSession({ sub: id, role, username, name });
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}
