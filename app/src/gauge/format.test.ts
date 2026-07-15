import { describe, expect, it } from 'vitest';
import { formatEta, formatTokens, formatPct01 } from './format';

describe('formatEta', () => {
  it('shows minutes under an hour', () => {
    expect(formatEta(0)).toBe('0min');
    expect(formatEta(0.75)).toBe('45min');
  });

  it('shows clock hours under a day, zero-padding the minutes', () => {
    expect(formatEta(3)).toBe('3h');
    expect(formatEta(3 + 5 / 60)).toBe('3h05');
    expect(formatEta(19 + 4 / 60)).toBe('19h04');
  });

  it('rolls a 60-minute rounding up into the next hour', () => {
    expect(formatEta(2 + 59.9 / 60)).toBe('3h');
  });

  it('shows days once past 24h', () => {
    expect(formatEta(24)).toBe('1j');
    expect(formatEta(43)).toBe('1j19h');
  });
});

describe('formatTokens', () => {
  it('compacts by magnitude', () => {
    expect(formatTokens(512)).toBe('512');
    expect(formatTokens(340_000)).toBe('340k');
    expect(formatTokens(1_200_000)).toBe('1.2M');
    expect(formatTokens(12_000_000)).toBe('12M');
  });
});

describe('formatPct01', () => {
  it('renders a whole percent', () => {
    expect(formatPct01(0.985)).toBe('99%');
    expect(formatPct01(0)).toBe('0%');
  });
});
