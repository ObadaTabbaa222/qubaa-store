import Image from 'next/image';
import { db } from '@/lib/supabase';
import { requireStudent } from '@/lib/session';
import { getStoreOpen } from '@/lib/settings';
import { StoreClient } from './StoreClient';

export const dynamic = 'force-dynamic';

export default async function StorePage() {
  const student = await requireStudent();
  const supa = db();
  const storeOpen = await getStoreOpen();

  const { data: me } = await supa.from('students').select('balance').eq('id', student.sub).maybeSingle();
  const balance = me?.balance ?? 0;

  let products: any[] = [];
  if (storeOpen) {
    const { data } = await supa
      .from('products')
      .select('id, name, description, price_points, stock_quantity, image_url')
      .eq('is_active', true)
      .gt('stock_quantity', 0)
      .order('price_points');
    products = data ?? [];
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-brand-sand bg-white shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-red p-1.5">
              <Image src="/brand/White/icon.png" alt="جامع قباء" width={36} height={36} className="h-full w-full" />
            </div>
            <span className="text-sm font-semibold">المتجر</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-brand-gold/15 px-3 py-1 text-sm font-semibold text-brand-red">
              رصيدك: {balance} نقطة
            </span>
            <a href="/me" className="btn-ghost !px-3 !py-1.5 text-xs">حسابي</a>
            <a href="/logout" className="btn-ghost !px-3 !py-1.5 text-xs">خروج</a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <p className="mb-1 text-lg font-semibold">أهلاً {student.name} 🌟</p>
        {!storeOpen ? (
          <div className="card mt-4 text-center">
            <p className="text-lg font-semibold text-brand-red">المتجر مغلق حالياً</p>
            <p className="mt-1 text-sm text-brand-taupe">سيُفتح المتجر قريباً — راجع المشرف لمعرفة الموعد.</p>
          </div>
        ) : (
          <>
            <p className="mb-5 text-sm text-brand-taupe">المتجر مفتوح الآن — اختر جوائزك ثم أكّد الطلب.</p>
            <StoreClient products={products} balance={balance} />
          </>
        )}
      </main>
    </div>
  );
}
