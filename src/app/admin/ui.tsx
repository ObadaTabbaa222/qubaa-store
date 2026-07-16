'use client';

import { useState, useTransition } from 'react';
import { setStoreOpen } from './settings-actions';

export function StoreToggle({ initialOpen }: { initialOpen: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const [pending, start] = useTransition();

  function toggle() {
    if (open && !confirm('هل تريد إغلاق المتجر؟ لن يتمكن الطلاب من الطلب حتى تفتحه مجدداً.')) return;
    start(async () => {
      await setStoreOpen(!open);
      setOpen(!open);
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`btn !px-3 !py-1.5 text-xs ${
        open ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-brand-red/10 text-brand-red hover:bg-brand-red/20'
      }`}
    >
      {pending ? '...' : open ? 'المتجر مفتوح ✓' : 'المتجر مغلق ⛔'}
    </button>
  );
}
