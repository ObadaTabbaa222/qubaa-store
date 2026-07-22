'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { placeOrder } from './actions';

type Product = {
  id: string;
  name: string;
  description?: string;
  price_points: number;
  stock_quantity: number;
  image_url?: string;
  is_unlimited: boolean;
  max_per_student: number | null;
};

export function StoreClient({
  products,
  balance,
  alreadyOrdered,
}: {
  products: Product[];
  balance: number;
  alreadyOrdered: Record<string, number>;
}) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const total = useMemo(
    () => products.reduce((sum, p) => sum + (cart[p.id] || 0) * p.price_points, 0),
    [cart, products]
  );
  const count = useMemo(() => Object.values(cart).reduce((a, b) => a + b, 0), [cart]);

  function maxAddable(p: Product) {
    const remainingByLimit =
      p.max_per_student != null ? Math.max(0, p.max_per_student - (alreadyOrdered[p.id] || 0)) : Infinity;
    return p.is_unlimited ? remainingByLimit : Math.min(p.stock_quantity, remainingByLimit);
  }

  function setQty(p: Product, qty: number) {
    const q = Math.max(0, Math.min(qty, maxAddable(p)));
    setCart((c) => ({ ...c, [p.id]: q }));
  }

  function checkout() {
    setMsg(null);
    const items = Object.entries(cart)
      .filter(([, q]) => q > 0)
      .map(([product_id, quantity]) => ({ product_id, quantity }));
    if (!items.length) { setMsg({ text: 'اختر جائزة واحدة على الأقل' }); return; }
    start(async () => {
      const res = await placeOrder(items);
      if (res.error) setMsg({ text: res.error });
      else {
        setMsg({ ok: true, text: 'تم تأكيد طلبك بنجاح ✓' });
        setCart({});
        router.refresh();
      }
    });
  }

  const overBudget = total > balance;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="grid gap-3 sm:grid-cols-2">
        {products.map((p) => {
          const qty = cart[p.id] || 0;
          const cap = maxAddable(p);
          const limitReached = p.max_per_student != null && cap <= 0;
          return (
            <div key={p.id} className="card flex gap-3">
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt={p.name} className="h-20 w-20 rounded-lg object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-brand-cream text-2xl">🎁</div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold">{p.name}</h3>
                {p.description && <p className="line-clamp-1 text-xs text-brand-taupe">{p.description}</p>}
                <p className="mt-1 font-semibold text-brand-red">{p.price_points} نقطة</p>
                {limitReached ? (
                  <p className="mt-2 text-xs font-semibold text-brand-taupe">طلبته مسبقاً</p>
                ) : (
                  <div className="mt-2 flex items-center gap-2">
                    <button onClick={() => setQty(p, qty - 1)} className="btn-ghost !h-8 !w-8 !p-0" disabled={qty === 0}>−</button>
                    <span className="w-6 text-center font-mono">{qty}</span>
                    <button onClick={() => setQty(p, qty + 1)} className="btn-ghost !h-8 !w-8 !p-0" disabled={qty >= cap}>+</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {products.length === 0 && <p className="text-sm text-brand-taupe">لا توجد جوائز متاحة حالياً.</p>}
      </div>

      <div className="lg:sticky lg:top-20 lg:self-start">
        <div className="card">
          <h3 className="mb-3 font-semibold">سلّتك</h3>
          <div className="flex justify-between text-sm"><span className="text-brand-taupe">عدد القطع</span><span>{count}</span></div>
          <div className="mt-1 flex justify-between text-sm"><span className="text-brand-taupe">الإجمالي</span><span className="font-semibold">{total} نقطة</span></div>
          <div className="mt-1 flex justify-between text-sm"><span className="text-brand-taupe">رصيدك</span><span>{balance} نقطة</span></div>
          <div className="mt-1 flex justify-between text-sm">
            <span className="text-brand-taupe">المتبقي بعد الشراء</span>
            <span className={overBudget ? 'font-semibold text-brand-red' : 'font-semibold text-green-700'}>{balance - total}</span>
          </div>
          {overBudget && <p className="mt-2 text-xs text-brand-red">الرصيد لا يكفي.</p>}
          {msg && <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-green-100 text-green-700' : 'bg-brand-red/10 text-brand-red'}`}>{msg.text}</p>}
          <button onClick={checkout} disabled={pending || overBudget || count === 0} className="btn-primary mt-4 w-full">
            {pending ? 'جارٍ التأكيد…' : 'تأكيد الطلب'}
          </button>
        </div>
      </div>
    </div>
  );
}
