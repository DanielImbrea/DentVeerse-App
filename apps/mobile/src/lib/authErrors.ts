/**
 * Maps Supabase Auth / network errors to short Romanian copy for mobile auth screens.
 * Supabase does not reveal whether an email exists on sign-in — use a combined message.
 */
export function formatAuthErrorMessage(raw: string | null | undefined): string {
  if (!raw?.trim()) {
    return 'Autentificarea a eșuat. Încearcă din nou.';
  }

  const msg = raw.trim();
  const lower = msg.toLowerCase();

  if (lower.includes('invalid login credentials') || lower.includes('invalid_credentials')) {
    return 'Email sau parolă incorectă. Dacă nu ai încă cont, apasă «Creează un cont» și confirmă emailul.';
  }

  if (lower.includes('email not confirmed') || lower.includes('email_not_confirmed')) {
    return 'Confirmă adresa de email (linkul din inbox, inclusiv spam) înainte de autentificare.';
  }

  if (
    lower.includes('user already registered') ||
    lower.includes('already been registered') ||
    lower.includes('already exists')
  ) {
    return 'Există deja un cont cu acest email. Autentifică-te sau folosește «Ai uitat parola?».';
  }

  if (lower.includes('signup is disabled')) {
    return 'Înregistrarea este dezactivată temporar. Contactează suportul DentVeerse.';
  }

  if (lower.includes('too many requests') || lower.includes('rate limit')) {
    return 'Prea multe încercări. Așteaptă câteva minute și încearcă din nou.';
  }

  if (isConnectivityError(lower)) {
    return 'Nu ne putem conecta la serverul DentVeerse. Verifică internetul (Wi‑Fi sau date mobile). Dacă folosești VPN, dezactivează-l și încearcă din nou.';
  }

  if (lower.includes('id_token') || lower.includes('oauth') || lower.includes('provider')) {
    return 'Autentificarea cu Google sau Apple a eșuat. Încearcă din nou sau folosește email și parolă.';
  }

  // Hide low-level native / Expo stack traces from testers.
  if (
    lower.includes('unexpectedexception') ||
    lower.includes('promiseswift') ||
    lower.includes('expomodulescore') ||
    msg.length > 120
  ) {
    return 'Autentificarea nu a reușit din cauza conexiunii sau a serviciului. Verifică internetul și încearcă din nou.';
  }

  return msg;
}

function isConnectivityError(lower: string): boolean {
  return (
    lower.includes('fetch failed') ||
    lower.includes('network request failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('hostname') ||
    lower.includes('host nu') ||
    lower.includes('could not be found') ||
    lower.includes('enotfound') ||
    lower.includes('econnrefused') ||
    lower.includes('timed out') ||
    lower.includes('timeout') ||
    lower.includes('internet connection') ||
    lower.includes('offline')
  );
}
