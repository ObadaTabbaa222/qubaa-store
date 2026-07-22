'use client';

import { useEffect, useState } from 'react';
import { useFormState } from 'react-dom';
import { ImageDropzone } from '@/components/ImageDropzone';
import { saveProduct, deleteProduct } from './actions';

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price_points: number;
  stock_quantity: number;
  image_url: string | null;
  is_active: boolean;
  is_unlimited: boolean;
  max_per_student: number | null;
};

export function ProductsClient({ products }: { products: Product[] }) {
  const [editing, setEditing] = useState<Product | null>(null);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <div>
        <h1 className="mb-4 text-2xl font-bold lg:mb-6 lg:text-3xl">المنتجات</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="card flex gap-3">
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt={p.name} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-brand-cream text-brand-taupe">🎁</div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate font-semibold">{p.name}</h3>
                  {!p.is_active && <span className="badge bg-brand-taupe/20 text-brand-taupe">مخفي</span>}
                </div>
                <p className="mt-0.5 text-sm text-brand-red">{p.price_points} نقطة</p>
                <p className={`text-xs ${p.is_unlimited || p.stock_quantity > 0 ? 'text-brand-taupe' : 'text-brand-red'}`}>
                  المخزون: {p.is_unlimited ? 'غير محدود' : p.stock_quantity}
                </p>
                {p.max_per_student != null && (
                  <p className="text-xs text-brand-taupe">الحد لكل طالب: {p.max_per_student}</p>
                )}
                <div className="mt-2 flex gap-2">
                  <button onClick={() => setEditing(p)} className="btn-ghost !px-3 !py-1 text-xs">تعديل</button>
                  <DeleteButton id={p.id} />
                </div>
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <p className="text-sm text-brand-taupe">لا توجد منتجات بعد. أضف أول جائزة من النموذج.</p>
          )}
        </div>
      </div>
      <div className="xl:max-w-[420px]">
        <h2 className="mb-4 text-lg font-semibold lg:text-xl">{editing ? 'تعديل المنتج' : 'إضافة منتج'}</h2>
        <ProductForm key={editing?.id ?? 'new'} product={editing} onDone={() => setEditing(null)} />
      </div>
    </div>
  );
}

export function ProductForm({ product, onDone }: { product?: Product | null; onDone?: () => void }) {
  const [state, action] = useFormState(saveProduct, {} as any);
  const [isUnlimited, setIsUnlimited] = useState(product?.is_unlimited ?? false);

  useEffect(() => {
    if (state?.ok) onDone?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.ok]);

  return (
    <form action={action} className="card space-y-3">
      {product && <input type="hidden" name="id" value={product.id} />}
      <div><label className="label">اسم الجائزة</label><input name="name" defaultValue={product?.name} className="input" required /></div>
      <div><label className="label">الوصف (اختياري)</label><textarea name="description" defaultValue={product?.description ?? ''} className="input" rows={2} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">السعر (نقاط)</label><input name="price_points" type="number" min={1} defaultValue={product?.price_points} className="input" required /></div>
        <div>
          <label className="label">الكمية</label>
          <input
            name="stock_quantity"
            type="number"
            min={0}
            defaultValue={product?.stock_quantity ?? 0}
            className="input"
            disabled={isUnlimited}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="is_unlimited"
          checked={isUnlimited}
          onChange={(e) => setIsUnlimited(e.target.checked)}
          className="h-4 w-4 accent-brand-red"
        /> كمية غير محدودة
      </label>
      <div>
        <label className="label">الحد الأقصى لكل طالب (اتركه فارغاً لغير محدود)</label>
        <input name="max_per_student" type="number" min={1} defaultValue={product?.max_per_student ?? ''} className="input" />
      </div>
      <div>
        <label className="label">صورة المنتج (اختياري)</label>
        <ImageDropzone name="image" defaultUrl={product?.image_url} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_active" defaultChecked={product ? product.is_active : true} className="h-4 w-4 accent-brand-red" /> ظاهر في المتجر
      </label>
      {state?.error && <p className="text-sm text-brand-red">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-700">تم الحفظ ✓</p>}
      <div className="flex gap-2">
        <button className="btn-primary flex-1">{product ? 'حفظ التعديلات' : 'حفظ المنتج'}</button>
        {product && (
          <button type="button" onClick={onDone} className="btn-ghost">إلغاء</button>
        )}
      </div>
    </form>
  );
}

export function DeleteButton({ id }: { id: string }) {
  return (
    <button
      onClick={() => { if (confirm('حذف هذا المنتج؟')) deleteProduct(id); }}
      className="btn-danger !px-3 !py-1 text-xs"
    >
      حذف
    </button>
  );
}
