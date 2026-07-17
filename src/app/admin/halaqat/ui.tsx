'use client';

import { useEffect, useState, useTransition } from 'react';
import { useFormState } from 'react-dom';
import {
  createHalaqahWithStudents,
  addStudentsToHalaqah,
  updateStudentBalance,
  updateStudent,
  deleteStudent,
  updateHalaqah,
  deleteHalaqah,
} from './actions';

type Student = { id: string; full_name: string; username: string; password_plain: string | null; balance: number };
type Credential = { full_name: string; username: string; password: string };

export function CreateHalaqahForm() {
  const [state, action] = useFormState(createHalaqahWithStudents, {} as any);
  return (
    <div className="space-y-4">
      <form action={action} className="card space-y-3">
        <div><label className="label">اسم الحلقة</label><input name="name" className="input" placeholder="مثال: حلقة الفجر" required /></div>
        <div>
          <label className="label">أسماء الطلاب (اسم في كل سطر)</label>
          <textarea name="names" className="input" rows={6} placeholder={'أحمد محمد\nخالد علي\n…'} required />
        </div>
        {state?.error && <p className="text-sm text-brand-red">{state.error}</p>}
        <button className="btn-primary w-full">إنشاء الحلقة والحسابات</button>
        <p className="text-xs text-brand-taupe">سيتم توليد اسم مستخدم وكلمة سر لكل طالب. بيانات الدخول تبقى ظاهرة دائماً في جدول الحلقة أدناه، ويمكنك طباعتها الآن أو لاحقاً.</p>
      </form>
      {state?.credentials && (
        <CredentialsTable title={`تم إنشاء حلقة "${state.halaqahName}" و${state.credentials.length} حساب ✓`} credentials={state.credentials} />
      )}
    </div>
  );
}

export function AddStudentsForm({ halaqat }: { halaqat: { id: string; name: string }[] }) {
  const [state, action] = useFormState(addStudentsToHalaqah, {} as any);
  return (
    <div className="space-y-4">
      <form action={action} className="card space-y-3">
        <div>
          <label className="label">الحلقة</label>
          <select name="halaqah_id" className="input" required>
            <option value="">— اختر الحلقة —</option>
            {halaqat.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">أسماء الطلاب (اسم في كل سطر)</label>
          <textarea name="names" className="input" rows={5} placeholder={'أحمد محمد\nخالد علي\n…'} required />
        </div>
        {state?.error && <p className="text-sm text-brand-red">{state.error}</p>}
        <button className="btn-primary w-full">إضافة الحسابات</button>
      </form>
      {state?.credentials && (
        <CredentialsTable title={`تم إنشاء ${state.credentials.length} حساب ✓`} credentials={state.credentials} />
      )}
    </div>
  );
}

function CredentialsTable({ title, credentials }: { title: string; credentials: Credential[] }) {
  return (
    <div className="card">
      <div className="no-print mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-green-700">{title}</h3>
        <button onClick={() => window.print()} className="btn-ghost !px-3 !py-1.5 text-xs">طباعة</button>
      </div>

      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-sand text-right text-brand-taupe">
              <th className="py-2">الاسم</th><th>اسم المستخدم</th><th>كلمة السر</th>
            </tr>
          </thead>
          <tbody>
            {credentials.map((c, i) => (
              <tr key={i} className="border-b border-brand-sand/50">
                <td className="py-2">{c.full_name}</td>
                <td className="font-mono">{c.username}</td>
                <td className="font-mono">{c.password}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2.5 md:hidden">
        {credentials.map((c, i) => (
          <div key={i} className="rounded-xl border border-brand-sand bg-brand-cream/30 p-3">
            <p className="font-semibold">{c.full_name}</p>
            <dl className="mt-1.5 space-y-1 text-sm">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-brand-taupe">اسم المستخدم</dt>
                <dd className="font-mono">{c.username}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-brand-taupe">كلمة السر</dt>
                <dd className="font-mono">{c.password}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HalaqahSection({ halaqah, students }: { halaqah: { id: string; name: string }; students: Student[] }) {
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(halaqah.name);
  const [savingName, startSaveName] = useTransition();
  const [deleting, startDelete] = useTransition();

  function saveName() {
    startSaveName(async () => {
      const res = await updateHalaqah(halaqah.id, name);
      if (!res?.error) setEditingName(false);
    });
  }

  function onDelete() {
    if (!confirm(`حذف حلقة "${halaqah.name}" مع كل طلابها وطلباتهم نهائياً؟ لا يمكن التراجع.`)) return;
    startDelete(() => deleteHalaqah(halaqah.id));
  }

  return (
    <div className="card max-md:border-s-4 max-md:border-brand-red/70">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {editingName ? (
          <div className="flex flex-wrap items-center gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} className="input !w-auto !py-1.5" />
            <button onClick={saveName} disabled={savingName} className="btn-primary !px-3 !py-1.5 text-xs">حفظ</button>
            <button onClick={() => { setEditingName(false); setName(halaqah.name); }} className="btn-ghost !px-3 !py-1.5 text-xs">إلغاء</button>
          </div>
        ) : (
          <h3 className="text-lg font-semibold lg:text-xl">
            {halaqah.name} <span className="text-sm font-normal text-brand-taupe">({studentCountLabel(students.length)})</span>
          </h3>
        )}
        {!editingName && (
          <div className="flex gap-1.5">
            <button onClick={() => setEditingName(true)} className="btn-ghost !px-2.5 !py-1 text-xs">تعديل الاسم</button>
            <button onClick={onDelete} disabled={deleting} className="btn-danger !px-2.5 !py-1 text-xs">حذف الحلقة</button>
          </div>
        )}
      </div>

      {students.length === 0 ? (
        <p className="text-sm text-brand-taupe">لا يوجد طلاب في هذه الحلقة بعد.</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-sand text-right text-brand-taupe">
                  <th className="py-2">الاسم</th><th>اسم المستخدم</th><th>كلمة السر</th><th>الرصيد</th><th></th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => <StudentRow key={s.id} student={s} />)}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {students.map((s) => <StudentCard key={s.id} student={s} />)}
          </div>
        </>
      )}
    </div>
  );
}

function studentCountLabel(n: number) {
  if (n === 0) return 'لا يوجد طلاب';
  if (n === 1) return 'طالب واحد';
  if (n === 2) return 'طالبان';
  if (n <= 10) return `${n} طلاب`;
  return `${n} طالبًا`;
}

function useStudentEditor(student: Student) {
  const [editing, setEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [runningBalance, setRunningBalance] = useState(student.balance);
  const [adjustAmount, setAdjustAmount] = useState<number>(0);
  const [savingBalance, startBalance] = useTransition();
  const [saved, setSaved] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [editState, editAction] = useFormState(updateStudent, {} as any);

  useEffect(() => {
    if (editState?.ok) setEditing(false);
  }, [editState]);

  const dirty = runningBalance !== student.balance;

  function applyAdjust(sign: 1 | -1) {
    if (!adjustAmount) return;
    setRunningBalance((b) => Math.max(0, b + sign * adjustAmount));
  }

  function saveBalance() {
    startBalance(async () => {
      const res = await updateStudentBalance(student.id, runningBalance);
      if (!res?.error) { setSaved(true); setTimeout(() => setSaved(false), 1500); }
    });
  }

  function onDelete() {
    if (!confirm(`حذف الطالب "${student.full_name}" مع كل طلباته نهائياً؟ لا يمكن التراجع.`)) return;
    startDelete(() => deleteStudent(student.id));
  }

  return {
    editing, setEditing, showPassword, setShowPassword, runningBalance, adjustAmount, setAdjustAmount,
    savingBalance, saved, deleting, editState, editAction, dirty, applyAdjust, saveBalance, onDelete,
  };
}

function StudentRow({ student }: { student: Student }) {
  const {
    editing, setEditing, showPassword, setShowPassword, runningBalance, adjustAmount, setAdjustAmount,
    savingBalance, saved, deleting, editState, editAction, dirty, applyAdjust, saveBalance, onDelete,
  } = useStudentEditor(student);

  if (editing) {
    return (
      <tr className="border-b border-brand-sand/50">
        <td colSpan={5} className="py-2">
          <form action={editAction} className="flex flex-wrap items-center gap-2">
            <input type="hidden" name="id" value={student.id} />
            <input name="full_name" defaultValue={student.full_name} className="input !w-auto flex-1" required />
            <input name="username" defaultValue={student.username} className="input !w-auto flex-1 font-mono" required />
            <button className="btn-primary !px-3 !py-1.5 text-xs">حفظ</button>
            <button type="button" onClick={() => setEditing(false)} className="btn-ghost !px-3 !py-1.5 text-xs">إلغاء</button>
            {editState?.error && <p className="w-full text-xs text-brand-red">{editState.error}</p>}
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-brand-sand/50">
      <td className="py-2.5 pr-1 whitespace-nowrap">{student.full_name}</td>
      <td className="whitespace-nowrap font-mono text-brand-taupe">{student.username}</td>
      <td className="whitespace-nowrap">
        <div className="flex items-center gap-1.5 font-mono">
          <span>{showPassword ? (student.password_plain ?? '—') : '••••••'}</span>
          <button
            type="button" onClick={() => setShowPassword((v) => !v)}
            className="text-brand-taupe hover:text-brand-red" title={showPassword ? 'إخفاء كلمة السر' : 'إظهار كلمة السر'}
          >
            {showPassword ? '🙈' : '👁'}
          </button>
        </div>
      </td>
      <td>
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            type="number" min={0} value={adjustAmount || ''}
            onChange={(e) => setAdjustAmount(Math.max(0, Number(e.target.value) || 0))}
            placeholder="عدد"
            className="input !w-16 !py-1 text-center"
          />
          <button type="button" onClick={() => applyAdjust(1)} className="btn-ghost !px-2 !py-1 text-xs" title="إضافة نقاط">+</button>
          <button type="button" onClick={() => applyAdjust(-1)} className="btn-ghost !px-2 !py-1 text-xs" title="خصم نقاط">−</button>
          <span className={`min-w-[2.5rem] text-center font-semibold ${dirty ? 'text-brand-red' : ''}`}>{runningBalance}</span>
          <button type="button" onClick={saveBalance} disabled={savingBalance || !dirty} className="btn-primary !px-2.5 !py-1 text-xs">
            {saved ? '✓' : 'حفظ'}
          </button>
        </div>
      </td>
      <td className="text-left">
        <div className="flex justify-end gap-1.5 whitespace-nowrap">
          <button onClick={() => setEditing(true)} className="btn-ghost !px-2 !py-1 text-xs">تعديل</button>
          <button onClick={onDelete} disabled={deleting} className="btn-danger !px-2 !py-1 text-xs">حذف</button>
        </div>
      </td>
    </tr>
  );
}

function StudentCard({ student }: { student: Student }) {
  const {
    editing, setEditing, showPassword, setShowPassword, runningBalance, adjustAmount, setAdjustAmount,
    savingBalance, saved, deleting, editState, editAction, dirty, applyAdjust, saveBalance, onDelete,
  } = useStudentEditor(student);

  if (editing) {
    return (
      <form action={editAction} className="rounded-xl border border-brand-sand bg-brand-cream/30 p-3.5 space-y-2.5">
        <input type="hidden" name="id" value={student.id} />
        <div>
          <label className="label">الاسم الكامل</label>
          <input name="full_name" defaultValue={student.full_name} className="input" required />
        </div>
        <div>
          <label className="label">اسم المستخدم</label>
          <input name="username" defaultValue={student.username} className="input font-mono" required />
        </div>
        {editState?.error && <p className="text-xs text-brand-red">{editState.error}</p>}
        <div className="flex gap-2">
          <button className="btn-primary flex-1 !py-1.5 text-xs">حفظ</button>
          <button type="button" onClick={() => setEditing(false)} className="btn-ghost flex-1 !py-1.5 text-xs">إلغاء</button>
        </div>
      </form>
    );
  }

  return (
    <div className="rounded-xl border border-brand-sand bg-brand-cream/30 p-3.5">
      <p className="font-semibold">{student.full_name}</p>

      <dl className="mt-2 space-y-1.5 text-sm">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-brand-taupe">اسم المستخدم</dt>
          <dd className="font-mono">{student.username}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-brand-taupe">كلمة السر</dt>
          <dd className="flex items-center gap-1.5 font-mono">
            <span>{showPassword ? (student.password_plain ?? '—') : '••••••'}</span>
            <button
              type="button" onClick={() => setShowPassword((v) => !v)}
              className="text-brand-taupe hover:text-brand-red" title={showPassword ? 'إخفاء كلمة السر' : 'إظهار كلمة السر'}
            >
              {showPassword ? '🙈' : '👁'}
            </button>
          </dd>
        </div>
      </dl>

      <div className="mt-3 border-t border-brand-sand/60 pt-3">
        <p className="mb-1.5 text-xs text-brand-taupe">الرصيد</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            type="number" min={0} value={adjustAmount || ''}
            onChange={(e) => setAdjustAmount(Math.max(0, Number(e.target.value) || 0))}
            placeholder="عدد"
            className="input !w-16 !py-1.5 text-center"
          />
          <button type="button" onClick={() => applyAdjust(1)} className="btn-ghost !px-2.5 !py-1.5 text-sm" title="إضافة نقاط">+</button>
          <button type="button" onClick={() => applyAdjust(-1)} className="btn-ghost !px-2.5 !py-1.5 text-sm" title="خصم نقاط">−</button>
          <span className={`min-w-[2.5rem] text-center font-semibold ${dirty ? 'text-brand-red' : ''}`}>{runningBalance}</span>
          <button type="button" onClick={saveBalance} disabled={savingBalance || !dirty} className="btn-primary !px-3 !py-1.5 text-xs">
            {saved ? '✓' : 'حفظ'}
          </button>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button onClick={() => setEditing(true)} className="btn-ghost flex-1 !py-1.5 text-xs">تعديل</button>
        <button onClick={onDelete} disabled={deleting} className="btn-danger flex-1 !py-1.5 text-xs">حذف</button>
      </div>
    </div>
  );
}
