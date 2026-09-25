import { describe, expect, it } from 'vitest';
import { parseStoredLocation } from './geo';

describe('parseStoredLocation', () => {
  it('parses GeoJSON Point coordinates', () => {
    expect(parseStoredLocation({ type: 'Point', coordinates: [26.1025, 44.4268] })).toEqual({
      lat: 44.4268,
      lng: 26.1025,
    });
  });

  it('returns null for invalid input', () => {
    expect(parseStoredLocation(null)).toBeNull();
    expect(parseStoredLocation({ type: 'Polygon', coordinates: [] })).toBeNull();
  });
});
