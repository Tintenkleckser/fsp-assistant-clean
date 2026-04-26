import Link from 'next/link';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-8">
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <Link href="/" className="text-sm font-semibold text-medical">
          FSP-Assistent
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-ink">Anmeldung</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Die Login-Oberflaeche ist in dieser ersten sauberen Version bewusst reduziert.
          Im naechsten Schritt wird Supabase Auth wieder angeschlossen.
        </p>
        <form className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">E-Mail</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-medical"
              type="email"
              placeholder="name@example.com"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Passwort</span>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-medical"
              type="password"
              placeholder="Passwort"
            />
          </label>
          <button
            className="w-full rounded-md bg-ink px-4 py-2 font-semibold text-white"
            type="button"
          >
            Bald wieder aktiv
          </button>
        </form>
        <Link href="/dashboard" className="mt-4 block text-center text-sm font-semibold text-medical">
          Dashboard-Vorschau
        </Link>
      </section>
    </main>
  );
}
