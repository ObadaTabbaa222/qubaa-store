import { db } from '@/lib/supabase';
import { ReportActions, DeliverButton } from './ui';

export const dynamic = 'force-dynamic';

type ReportRow = {
  order_id: string; status: string; created_at: string;
  product_id: string; product_name: string;
  student_id: string; student_name: string; student_balance: number;
  halaqah_id: string; halaqah_name: string;
  quantity: number; unit_price_points: number; line_total: number;
};

export default async function OrdersPage() {
  const { data } = await db().from('order_report').select('*');
  const rows: ReportRow[] = data ?? [];

  // تجميع: حلقة ← طالب ← طلب (بحالته) ← عناصر مشتراة
  const halaqat: Record<string, {
    name: string;
    students: Record<string, {
      name: string; balance: number;
      orders: Record<string, { status: string; items: Record<string, number> }>;
    }>;
  }> = {};
  const grandTotals: Record<string, number> = {};

  for (const r of rows) {
    const h = (halaqat[r.halaqah_id] ??= { name: r.halaqah_name, students: {} });
    const s = (h.students[r.student_id] ??= { name: r.student_name, balance: r.student_balance, orders: {} });
    const ord = (s.orders[r.order_id] ??= { status: r.status, items: {} });
    ord.items[r.product_name] = (ord.items[r.product_name] ?? 0) + r.quantity;
    grandTotals[r.product_name] = (grandTotals[r.product_name] ?? 0) + r.quantity;
  }

  const halaqahList = Object.values(halaqat).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  const totalPieces = rows.reduce((a, r) => a + r.quantity, 0);
  const totalPoints = rows.reduce((a, r) => a + r.line_total, 0);
  const buyerCount = new Set(rows.map((r) => r.student_id)).size;

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 lg:mb-6">
        <h1 className="text-2xl font-bold lg:text-3xl">تقرير الطلبات</h1>
        <ReportActions rows={rows} />
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-brand-taupe">لا توجد طلبات حتى الآن.</p>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:gap-6">
            <div className="card"><p className="text-sm text-brand-taupe">إجمالي القطع</p><p className="mt-1 text-2xl font-bold text-brand-red lg:text-3xl">{totalPieces}</p></div>
            <div className="card"><p className="text-sm text-brand-taupe">عدد الطلاب المشترين</p><p className="mt-1 text-2xl font-bold text-brand-red lg:text-3xl">{buyerCount}</p></div>
            <div className="card"><p className="text-sm text-brand-taupe">إجمالي النقاط</p><p className="mt-1 text-2xl font-bold text-brand-red lg:text-3xl">{totalPoints}</p></div>
          </div>

          <div className="space-y-6">
            {halaqahList.map((h) => {
              const students = Object.values(h.students).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
              return (
                <div key={h.name} className="card max-md:border-s-4 max-md:border-brand-red/70">
                  <h2 className="mb-3 text-lg font-semibold lg:text-xl">{h.name}</h2>

                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-brand-sand text-right text-brand-taupe">
                          <th className="py-2">الطالب</th><th>الطلبات</th><th>الرصيد المتبقي</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((s, i) => (
                          <tr key={i} className="border-b border-brand-sand/50 align-top">
                            <td className="py-2 whitespace-nowrap">{s.name}</td>
                            <td className="py-2">
                              <div className="space-y-2">
                                {Object.entries(s.orders).map(([orderId, ord]) => (
                                  <div key={orderId} className="flex items-start justify-between gap-3 border-b border-brand-sand/30 pb-2 last:border-0 last:pb-0">
                                    <ul className="space-y-0.5">
                                      {Object.entries(ord.items).map(([product, qty]) => (
                                        <li key={product} className="flex justify-between gap-4">
                                          <span>{product}</span>
                                          <span className="font-mono text-brand-taupe">×{qty}</span>
                                        </li>
                                      ))}
                                    </ul>
                                    {ord.status === 'delivered' ? (
                                      <span className="badge shrink-0 bg-green-100 text-green-700">تم التسليم ✓</span>
                                    ) : (
                                      <DeliverButton orderId={orderId} />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="py-2 whitespace-nowrap font-semibold text-brand-red">{s.balance} نقطة</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid gap-3 md:hidden">
                    {students.map((s, i) => (
                      <div key={i} className="rounded-xl border border-brand-sand bg-brand-cream/30 p-3.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold">{s.name}</p>
                          <span className="shrink-0 text-sm font-semibold text-brand-red">{s.balance} نقطة</span>
                        </div>
                        <div className="mt-2 space-y-2">
                          {Object.entries(s.orders).map(([orderId, ord]) => (
                            <div key={orderId} className="flex items-start justify-between gap-3 border-t border-brand-sand/40 pt-2 text-sm">
                              <ul className="space-y-0.5">
                                {Object.entries(ord.items).map(([product, qty]) => (
                                  <li key={product} className="flex justify-between gap-4">
                                    <span>{product}</span>
                                    <span className="font-mono text-brand-taupe">×{qty}</span>
                                  </li>
                                ))}
                              </ul>
                              {ord.status === 'delivered' ? (
                                <span className="badge shrink-0 bg-green-100 text-green-700">تم التسليم ✓</span>
                              ) : (
                                <DeliverButton orderId={orderId} />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card mt-6">
            <h2 className="mb-3 text-lg font-semibold lg:text-xl">الإجمالي حسب المنتج (للتحضير)</h2>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-sand text-right text-brand-taupe">
                    <th className="py-2">المنتج</th><th>الكمية الإجمالية المطلوبة</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(grandTotals)
                    .sort((a, b) => b[1] - a[1])
                    .map(([product, qty]) => (
                      <tr key={product} className="border-b border-brand-sand/50">
                        <td className="py-2">{product}</td>
                        <td className="py-2 font-semibold text-brand-red">{qty}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-2 md:hidden">
              {Object.entries(grandTotals)
                .sort((a, b) => b[1] - a[1])
                .map(([product, qty]) => (
                  <div key={product} className="flex items-center justify-between gap-3 rounded-xl border border-brand-sand bg-brand-cream/30 px-3.5 py-2.5 text-sm">
                    <span>{product}</span>
                    <span className="font-semibold text-brand-red">{qty}</span>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
