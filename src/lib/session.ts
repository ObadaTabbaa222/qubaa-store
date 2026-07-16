import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySession, SESSION_COOKIE, SessionUser } from './auth';

export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function requireAdmin(): Promise<SessionUser> {
  const s = await getSession();
  if (!s || s.role !== 'admin') redirect('/login');
  return s;
}

export async function requireStudent(): Promise<SessionUser> {
  const s = await getSession();
  if (!s || s.role !== 'student') redirect('/login');
  return s;
}
