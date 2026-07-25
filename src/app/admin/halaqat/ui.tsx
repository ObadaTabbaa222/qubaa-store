'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
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
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-4">
      <form ref={formRef} action={action} className="card space-y-3">
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
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-4">
      <form ref={formRef} action={action} className="card space-y-3">
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
          <div className="flex flex-wrap gap-1.5">
            <CopyHalaqahButton halaqahName={halaqah.name} students={students} />
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

function buildHalaqahCopyText(halaqahName: string, students: Student[]) {
  const blocks = students.map(
    (s) =>
      `الطالب: ${s.full_name}\nاسم المستخدم: ${s.username}\nكلمة المرور: ${s.password_plain ?? '—'}\n————————————`
  );
  return `حلقة: ${halaqahName}\n\n${blocks.join('\n')}`;
}

async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // نتابع إلى الحل البديل
    }
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function CopyHalaqahButton({ halaqahName, students }: { halaqahName: string; students: Student[] }) {
  const [copied, setCopied] = useState(false);

  async function onClick() {
    const ok = await copyToClipboard(buildHalaqahCopyText(halaqahName, students));
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={students.length === 0}
      className="btn-ghost !px-2.5 !py-1 text-xs"
    >
      {copied ? 'تم النسخ ✓' : 'نسخ معلومات الحلقة'}
    </button>
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
  const [balanceInput, setBalanceInput] = useState(String(student.balance));
  const [balanceError, setBalanceError] = useState('');
  const [savingBalance, startBalance] = useTransition();
  const [saved, setSaved] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [editState, editAction] = useFormState(updateStudent, {} as any);

  useEffect(() => {
    if (editState?.ok) setEditing(false);
  }, [editState]);

  const dirty = balanceInput !== String(student.balance);

  function saveBalance() {
    const trimmed = balanceInput.trim();
    if (trimmed === '' || !/^\d+$/.test(trimmed)) {
      setBalanceError('أدخل رقمًا صحيحًا غير سالب');
      return;
    }
    const parsed = Number(trimmed);
    setBalanceError('');
    startBalance(async () => {
      const res = await updateStudentBalance(student.id, parsed);
      if (!res?.error) {
        setBalanceInput(String(parsed));
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      } else {
        setBalanceError(res.error);
      }
    });
  }

  function onDelete() {
    if (!confirm(`حذف الطالب "${student.full_name}" مع كل طلباته نهائياً؟ لا يمكن التراجع.`)) return;
    startDelete(() => deleteStudent(student.id));
  }

  return {
    editing, setEditing, showPassword, setShowPassword, balanceInput, setBalanceInput, balanceError,
    savingBalance, saved, deleting, editState, editAction, dirty, saveBalance, onDelete,
  };
}

function StudentRow({ student }: { student: Student }) {
  const {
    editing, setEditing, showPassword, setShowPassword, balanceInput, setBalanceInput, balanceError,
    savingBalance, saved, deleting, editState, editAction, dirty, saveBalance, onDelete,
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
            type="number" min={0} step={1} inputMode="numeric"
            value={balanceInput}
            onChange={(e) => setBalanceInput(e.target.value)}
            className={`input !w-20 !py-1 text-center ${dirty ? '!ring-brand-gold' : ''} ${balanceError ? '!ring-brand-red' : ''}`}
          />
          <button type="button" onClick={saveBalance} disabled={savingBalance || !dirty} className="btn-primary !px-2.5 !py-1 text-xs">
            {saved ? '✓' : 'حفظ'}
          </button>
        </div>
        {balanceError && <p className="mt-1 text-xs text-brand-red">{balanceError}</p>}
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
    editing, setEditing, showPassword, setShowPassword, balanceInput, setBalanceInput, balanceError,
    savingBalance, saved, deleting, editState, editAction, dirty, saveBalance, onDelete,
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
            type="number" min={0} step={1} inputMode="numeric"
            value={balanceInput}
            onChange={(e) => setBalanceInput(e.target.value)}
            className={`input !w-24 !py-1.5 text-center ${dirty ? '!ring-brand-gold' : ''} ${balanceError ? '!ring-brand-red' : ''}`}
          />
          <button type="button" onClick={saveBalance} disabled={savingBalance || !dirty} className="btn-primary !px-3 !py-1.5 text-xs">
            {saved ? '✓' : 'حفظ'}
          </button>
        </div>
        {balanceError && <p className="mt-1 text-xs text-brand-red">{balanceError}</p>}
      </div>

      <div className="mt-3 flex gap-2">
        <button onClick={() => setEditing(true)} className="btn-ghost flex-1 !py-1.5 text-xs">تعديل</button>
        <button onClick={onDelete} disabled={deleting} className="btn-danger flex-1 !py-1.5 text-xs">حذف</button>
      </div>
    </div>
  );
}
