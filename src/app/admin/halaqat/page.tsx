import { db } from '@/lib/supabase';
import { CreateHalaqahForm, AddStudentsForm, HalaqahSection } from './ui';

export const dynamic = 'force-dynamic';

export default async function AccountsPage() {
  const supa = db();
  const [{ data: halaqat, error: halaqatError }, { data: students, error: studentsError }] = await Promise.all([
    supa.from('halaqat').select('id, name').order('name'),
    supa.from('students').select('id, full_name, username, password_plain, balance, halaqah_id').order('full_name'),
  ]);

  const dbError = halaqatError || studentsError;

  const byHalaqah: Record<string, any[]> = {};
  for (const s of students ?? []) {
    (byHalaqah[s.halaqah_id] ??= []).push(s);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <div>
        <h1 className="mb-4 text-2xl font-bold lg:mb-6 lg:text-3xl">إدارة الحسابات</h1>
        {dbError && (
          <div className="card mb-4 bg-brand-red/5 text-sm text-brand-red">
            تعذّر تحميل بيانات الحسابات: {dbError.message}
            {dbError.message.includes('password_plain') && (
              <p className="mt-1">يبدو أن قاعدة البيانات تحتاج التحديث — شغّل السطر التالي في Supabase SQL Editor:
                <code className="mx-1 rounded bg-white px-1.5 py-0.5 font-mono">alter table students add column if not exists password_plain text;</code>
              </p>
            )}
          </div>
        )}
        <div className="space-y-6">
          {(halaqat ?? []).map((h: any) => (
            <HalaqahSection key={h.id} halaqah={h} students={byHalaqah[h.id] ?? []} />
          ))}
          {(!halaqat || halaqat.length === 0) && (
            <p className="text-sm text-brand-taupe">لا توجد حلقات بعد. أنشئ أول حلقة من النموذج.</p>
          )}
        </div>
      </div>

      <div className="space-y-8 xl:max-w-[420px]">
        <div>
          <h2 className="mb-3 text-lg font-semibold lg:text-xl">إضافة حلقة جديدة</h2>
          <CreateHalaqahForm />
        </div>
        <div>
          <h2 className="mb-3 text-lg font-semibold lg:text-xl">إضافة طلاب لحلقة موجودة</h2>
          <AddStudentsForm halaqat={halaqat ?? []} />
        </div>
      </div>
    </div>
  );
}
