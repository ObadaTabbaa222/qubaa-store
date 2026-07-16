'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { markDelivered } from './actions';

export function DeliverButton({ orderId }: { orderId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function onClick() {
    if (!confirm('تأكيد أن الطالب استلم طلبه؟')) return;
    start(async () => {
      const res = await markDelivered(orderId);
      if (res?.error) alert(res.error);
      else router.refresh();
    });
  }

  return (
    <button onClick={onClick} disabled={pending} className="btn-ghost !px-2.5 !py-1 shrink-0 text-xs">
      {pending ? '...' : 'تم التسليم'}
    </button>
  );
}

export function ReportActions({ rows }: { rows: any[] }) {
  function exportCsv() {
    const header = ['الحلقة', 'الطالب', 'المنتج', 'الكمية', 'سعر الوحدة', 'الإجمالي', 'الرصيد المتبقي'];
    const lines = rows.map((r) =>
      [r.halaqah_name, r.student_name, r.product_name, r.quantity, r.unit_price_points, r.line_total, r.student_balance].join(',')
    );
    const csv = String.fromCharCode(0xfeff) + [header.join(','), ...lines].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'orders.csv'; a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="flex gap-2">
      <button onClick={() => window.print()} className="btn-ghost !px-3 !py-2 text-xs">طباعة</button>
      <button onClick={exportCsv} className="btn-ghost !px-3 !py-2 text-xs">تصدير CSV</button>
    </div>
  );
}
