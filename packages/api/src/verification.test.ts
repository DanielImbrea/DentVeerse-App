import { describe, expect, it } from 'vitest';
import { REQUIRED_DOCUMENTS } from './verification';

describe('REQUIRED_DOCUMENTS', () => {
  it('clinic requires CUI, DSP authorization, and legal representative ID', () => {
    expect(REQUIRED_DOCUMENTS.clinic).toEqual(['cui', 'dsp_authorization', 'id_document']);
  });

  it('laboratory requires CUI, technician certificate, and legal representative ID', () => {
    expect(REQUIRED_DOCUMENTS.laboratory).toEqual(['cui', 'technician_certificate', 'id_document']);
  });
});
