import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const s = await getSession();
  if (!s) redirect('/login');
  redirect(s.role === 'admin' ? '/admin' : '/store');
}
