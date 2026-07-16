import { db } from '@/lib/supabase';
import { requireStudent } from '@/lib/session';
import { CancelOrderButton } from './ui';

export const dynamic = 'force-dynamic';

const statusLabel: Record<string, string> = {
  pending: 'قيد الانتظار', approved: 'مقبول', delivered: 'تم التسليم', cancelled: 'ملغى',
};

function fmt(d: string) { return new Date(d).toLocaleDateString('ar', { dateStyle: 'medium' }); }

export default async function MePage() {
  const student = await requireStudent();
  const supa = db();

  const { data: me } = await supa.from('students').select('balance').eq('id', student.sub).maybeSingle();
  const { data: orders } = await supa
    .from('orders')
    .select('id, status, total_points, created_at, order_items(quantity, products(name))')
    .eq('student_id', student.sub)
    .order('created_at', { ascending: false });

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-brand-sand bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <a href="/store" className="btn-ghost !px-3 !py-1.5 text-xs">→ المتجر</a>
          <span className="text-sm font-semibold">حسابي</span>
          <a href="/logout" className="btn-ghost !px-3 !py-1.5 text-xs">خروج</a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="card mb-6 text-center">
          <p className="text-sm text-brand-taupe">رصيدك الحالي</p>
          <p className="mt-1 text-4xl font-bold text-brand-red">{me?.balance ?? 0}</p>
          <p className="text-sm text-brand-taupe">نقطة</p>
        </div>

        <div className="mx-auto max-w-lg">
          <h2 className="mb-3 font-semibold">طلباتي</h2>
          <div className="space-y-2">
            {(orders ?? []).map((o: any) => (
              <div key={o.id} className="card">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-brand-taupe">{fmt(o.created_at)}</span>
                  <span className="badge bg-brand-gold/15 text-brand-red">{statusLabel[o.status] || o.status}</span>
                </div>
                <ul className="mt-2 text-sm">
                  {o.order_items.map((it: any, i: number) => (
                    <li key={i} className="flex justify-between"><span>{it.products?.name}</span><span className="text-brand-taupe">×{it.quantity}</span></li>
                  ))}
                </ul>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-brand-red">{o.total_points} نقطة</p>
                  {o.status === 'pending' && <CancelOrderButton orderId={o.id} />}
                </div>
              </div>
            ))}
            {(!orders || orders.length === 0) && <p className="text-sm text-brand-taupe">لا طلبات بعد.</p>}
          </div>
        </div>
      </main>
    </div>
  );
}
