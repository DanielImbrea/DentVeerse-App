/** Apple Sign In „Ascunde-mi emailul” — relay @privaterelay.appleid.com */
export function isApplePrivateRelayEmail(email: string): boolean {
  return /@privaterelay\.appleid\.com$/i.test(email.trim());
}
