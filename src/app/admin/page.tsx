import Link from 'next/link';
import { db } from '@/lib/supabase';
import { getStoreOpen } from '@/lib/settings';

export const dynamic = 'force-dynamic';

async function counts() {
  const supa = db();
  const [students, products, orders] = await Promise.all([
    supa.from('students').select('id', { count: 'exact', head: true }),
    supa.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supa.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);
  return {
    students: students.count ?? 0,
    products: products.count ?? 0,
    pending: orders.count ?? 0,
  };
}

export default async function AdminHome() {
  const [c, storeOpen] = await Promise.all([counts(), getStoreOpen()]);
  const cards = [
    { label: 'الطلاب', value: c.students, href: '/admin/halaqat' },
    { label: 'منتجات فعّالة', value: c.products, href: '/admin/products' },
    { label: 'طلبات قيد الانتظار', value: c.pending, href: '/admin/orders' },
  ];
  return (
    <div>
      <h1 className="mb-5 text-2xl font-bold lg:mb-6 lg:text-3xl">أهلاً بك 👋</h1>

      <div className={`card mb-6 ${storeOpen ? 'bg-green-50' : 'bg-brand-red/5'}`}>
        <p className="text-sm text-brand-taupe">حالة المتجر</p>
        <p className={`mt-1 text-xl font-bold lg:text-2xl ${storeOpen ? 'text-green-700' : 'text-brand-red'}`}>
          {storeOpen ? 'مفتوح — الطلاب يمكنهم الطلب الآن' : 'مغلق — لا يمكن للطلاب الطلب'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:gap-6">
        {cards.map((k) => (
          <Link key={k.label} href={k.href} className="card transition hover:shadow-md">
            <p className="text-sm text-brand-taupe">{k.label}</p>
            <p className="mt-2 text-3xl font-bold text-brand-red lg:text-4xl">{k.value}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:gap-6">
        <Link href="/admin/halaqat" className="card hover:shadow-md">
          <h2 className="font-semibold lg:text-lg">إدارة الحسابات</h2>
          <p className="mt-1 text-sm text-brand-taupe">أضف حلقات وطلاباً، وعدّل رصيد كل طالب يدوياً.</p>
        </Link>
        <Link href="/admin/orders" className="card hover:shadow-md">
          <h2 className="font-semibold lg:text-lg">تقرير الطلبات</h2>
          <p className="mt-1 text-sm text-brand-taupe">اعرض واطبع طلبات كل حلقة مع اسم صاحب كل قطعة.</p>
        </Link>
      </div>
    </div>
  );
}
