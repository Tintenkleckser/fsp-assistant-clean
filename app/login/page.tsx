import Link from 'next/link';
import { LoginForm } from './login-form';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-8">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <Link href="/" className="text-sm font-semibold text-medical">
          FSP-Assistent
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-ink">Anmeldung</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Melden Sie sich mit Ihrem Supabase-Konto an. Nach erfolgreicher Anmeldung
          oeffnet sich das Dashboard.
        </p>
        <LoginForm />
        <Link href="/register" className="mt-4 block text-center text-sm font-semibold text-medical">
          Neues Konto erstellen
        </Link>
      </section>
    </main>
  );
}
