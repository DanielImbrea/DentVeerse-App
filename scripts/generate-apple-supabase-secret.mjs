#!/usr/bin/env node
/**
 * Generează JWT-ul pentru Supabase → Authentication → Apple → Secret Key.
 * Rulezi pe Mac, cu fișierul .p8 descărcat o singură dată din Apple Developer → Keys.
 *
 * Usage:
 *   node scripts/generate-apple-supabase-secret.mjs \
 *     --p8 ~/Downloads/AuthKey_XXXXXXXXXX.p8 \
 *     --key-id ABCD123456 \
 *     --team-id TR36PR6252 \
 *     --services-id ro.dentveerse.signin
 *
 * Copiezi output-ul în Supabase Secret Key. Expiră ~6 luni — rulezi din nou.
 */
import { readFileSync } from 'node:fs';
import { SignJWT, importPKCS8 } from 'jose';

function arg(name) {
  const i = process.argv.indexOf(name);
  if (i === -1 || !process.argv[i + 1]) {
    console.error(`Lipsește ${name}`);
    process.exit(1);
  }
  return process.argv[i + 1];
}

const p8Path = arg('--p8');
const keyId = arg('--key-id');
const teamId = arg('--team-id');
const servicesId = arg('--services-id');

const pem = readFileSync(p8Path, 'utf8');
const privateKey = await importPKCS8(pem, 'ES256');

const now = Math.floor(Date.now() / 1000);
const exp = now + 86400 * 180; // max ~6 luni

const jwt = await new SignJWT({})
  .setProtectedHeader({ alg: 'ES256', kid: keyId })
  .setIssuer(teamId)
  .setSubject(servicesId)
  .setAudience('https://appleid.apple.com')
  .setIssuedAt(now)
  .setExpirationTime(exp)
  .sign(privateKey);

console.log('\nLipește în Supabase → Apple → Secret Key:\n');
console.log(jwt);
console.log('\n');
