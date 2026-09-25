import { describe, it, expect } from 'vitest';
import { slugify } from './slugify';

/**
 * TEST CREATED — has NOT been executed in this environment (no `npm
 * install`/`vitest` runner available here, per docs/17-implementation-status.md
 * §23). Run with `pnpm --filter @dental/utils test` in Cursor to actually
 * execute these and confirm they pass.
 */
describe('slugify', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    expect(slugify('Clinica Dentară')).toBe('clinica-dentara');
  });

  it('strips Romanian diacritics', () => {
    expect(slugify('Laborator Zâmbet Sănătos')).toBe('laborator-zambet-sanatos');
  });

  it('removes leading and trailing hyphens', () => {
    expect(slugify('  -Clinica- ')).toBe('clinica');
  });

  it('collapses multiple non-alphanumeric characters into one hyphen', () => {
    expect(slugify('Dr. Popescu & Asociații!!')).toBe('dr-popescu-asociatii');
  });

  it('handles an already-clean input unchanged', () => {
    expect(slugify('clean-slug')).toBe('clean-slug');
  });

  it('returns an empty string for input with no alphanumeric characters', () => {
    expect(slugify('!!!')).toBe('');
  });
});
