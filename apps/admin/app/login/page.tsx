import { signInAction } from './actions';
import { mapAuthError, s } from '../../lib/strings';

export default function AdminLoginPage({ searchParams }: { searchParams: { error?: string } }) {
  const errorMessage = searchParams.error ? mapAuthError(searchParams.error) : null;

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background via-background to-primary/5">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-white text-2xl mb-4 shadow-lg shadow-primary/20">
            🦷
          </div>
          <h1 className="font-display text-2xl font-semibold text-text-primary">{s.appName}</h1>
          <p className="text-text-secondary text-sm mt-1">{s.appSubtitle}</p>
        </div>

        <form action={signInAction} className="admin-card p-8 flex flex-col gap-5 shadow-md">
          <div>
            <h2 className="text-lg font-semibold">{s.login.title}</h2>
            <p className="text-text-secondary text-sm mt-1">{s.login.subtitle}</p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-primary">{s.login.email}</span>
            <input name="email" type="email" required autoComplete="email" className="admin-input" />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-text-primary">{s.login.password}</span>
            <input name="password" type="password" required autoComplete="current-password" className="admin-input" />
          </label>

          {errorMessage ? (
            <p className="text-error text-sm bg-error/5 border border-error/20 rounded-lg px-3 py-2">{errorMessage}</p>
          ) : null}

          <button
            type="submit"
            className="bg-primary hover:bg-primary-dark text-white rounded-lg px-4 py-3 font-medium transition-colors shadow-sm"
          >
            {s.login.submit}
          </button>
        </form>
      </div>
    </main>
  );
}
