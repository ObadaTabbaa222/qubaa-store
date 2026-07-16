'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cancelOrder } from './actions';

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function onCancel() {
    if (!confirm('هل تريد إلغاء هذا الطلب؟ سيُعاد رصيدك والمخزون فوراً.')) return;
    start(async () => {
      const res = await cancelOrder(orderId);
      if (res?.error) alert(res.error);
      else router.refresh();
    });
  }

  return (
    <button onClick={onCancel} disabled={pending} className="btn-danger !px-3 !py-1 text-xs">
      {pending ? '...' : 'إلغاء الطلب'}
    </button>
  );
}
