'use client';

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

export default function LoginPage() {
  const [state, formAction] = useFormState(login, { error: '' } as any);
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
            <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
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
