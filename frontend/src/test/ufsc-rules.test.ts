import { describe, expect, it } from 'vitest';
import { canOperate, canPublish, canReturn, isPublic } from '@/data/types';
import { inPeriod } from '@/features/report-rules';
describe('regras do UFSCAchados', () => {
  it('somente usuários autenticados e operadores podem publicar', () => {
    expect(canPublish('visitante')).toBe(false);
    expect(canPublish('usuario')).toBe(true);
    expect(canPublish('operador')).toBe(true);
  });
  it('somente operadores podem concluir status', () => {
    expect(canOperate('usuario')).toBe(false);
    expect(canOperate('operador')).toBe(true);
  });
  it('devolvidos e expirados não aparecem no mural', () => {
    expect(isPublic({ status: 1 })).toBe(true);
    expect(isPublic({ status: 5 })).toBe(true);
    expect(isPublic({ status: 3 })).toBe(false);
    expect(isPublic({ status: 4 })).toBe(false);
  });
  it('devolução exige nome, matrícula numérica validada e comprovação', () => {
    expect(canReturn('Ana Souza', '20231045', true, true)).toBe(true);
    expect(canReturn('Ana Souza', '2023A045', true, true)).toBe(false);
    expect(canReturn('Ana Souza', '20231045', false, true)).toBe(false);
    expect(canReturn('Ana Souza', '20231045', true, false)).toBe(false);
  });
  it('relatórios separam mês, semestre e ano', () => {
    expect(inPeriod('2026-11-20', 'month', 2026, 11, 2)).toBe(true);
    expect(inPeriod('2026-06-30', 'semester', 2026, 11, 2)).toBe(false);
    expect(inPeriod('2026-07-01', 'semester', 2026, 1, 2)).toBe(true);
    expect(inPeriod('2025-11-20', 'year', 2026, 11, 2)).toBe(false);
  });
});
