import Link from 'next/link';
import { RegisterForm } from './register-form';

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-8">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <Link href="/" className="text-sm font-semibold text-medical">
          FSP-Assistent
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-ink">Konto erstellen</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Registrieren Sie ein neues Konto. Falls Supabase E-Mail-Bestaetigung verlangt,
          erhalten Sie danach eine entsprechende Meldung.
        </p>
        <RegisterForm />
        <Link href="/login" className="mt-4 block text-center text-sm font-semibold text-medical">
          Schon registriert? Zur Anmeldung
        </Link>
      </section>
    </main>
  );
}
