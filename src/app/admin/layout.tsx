import Image from 'next/image';
import Link from 'next/link';
import { requireAdmin } from '@/lib/session';
import { getStoreOpen } from '@/lib/settings';
import { StoreToggle } from './ui';

export const dynamic = 'force-dynamic';

const nav = [
  { href: '/admin', label: 'لوحة التحكم' },
  { href: '/admin/products', label: 'المنتجات' },
  { href: '/admin/halaqat', label: 'إدارة الحسابات' },
  { href: '/admin/orders', label: 'الطلبات' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const storeOpen = await getStoreOpen();
  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-10 border-b border-brand-sand bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <Link href="/admin" className="flex items-center gap-2" aria-label="لوحة التحكم">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-red p-1.5">
              <Image src="/brand/White/icon.png" alt="جامع قباء" width={36} height={36} className="h-full w-full" />
            </div>
          </Link>
          <nav className="flex flex-1 flex-wrap items-center gap-1 overflow-x-auto">
            {nav.map((n) => (
              <Link key={n.href} href={n.href}
                className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-brand-ink/80 hover:bg-brand-cream hover:text-brand-red">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <StoreToggle initialOpen={storeOpen} />
            <span className="hidden text-xs text-brand-taupe md:inline">{admin.name}</span>
            <a href="/logout" className="btn-ghost !px-3 !py-1.5 text-xs">خروج</a>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8 xl:px-8">{children}</main>
    </div>
  );
}
