'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useFormState, useFormStatus } from 'react-dom';
import { login } from './actions';

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? 'جارٍ الدخول…' : 'تسجيل الدخول'}
    </button>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.86 21.86 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 7 11 7a21.82 21.82 0 0 1-3.22 4.44M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <path d="M1 1l22 22" />
    </svg>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(login, { error: '' } as any);
  const [showPassword, setShowPassword] = useState(false);
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-red p-3">
            <Image src="/brand/White/icon.png" alt="جامع قباء" width={64} height={64} className="h-full w-full" priority />
          </div>
          <h1 className="text-xl font-bold text-brand-ink">متجر نقاط معهد قباء</h1>
          <p className="mt-1 text-sm text-brand-taupe">اهلاً بأهل القرآن</p>
        </div>
        <form action={formAction} className="card space-y-4">
          <div>
            <label className="label" htmlFor="username">اسم المستخدم</label>
            <input id="username" name="username" className="input" autoComplete="username" required />
          </div>
          <div>
            <label className="label" htmlFor="password">كلمة السر</label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                className="input pe-10"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 end-0 flex items-center pe-3 text-brand-taupe hover:text-brand-red"
                aria-label={showPassword ? 'إخفاء كلمة السر' : 'إظهار كلمة السر'}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>
          {state?.error ? (
            <p className="rounded-lg bg-brand-red/10 px-3 py-2 text-sm text-brand-red">{state.error}</p>
          ) : null}
          <SubmitBtn />
        </form>
      </div>
    </main>
  );
}
