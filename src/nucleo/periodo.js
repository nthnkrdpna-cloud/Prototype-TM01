// Agrupar por mês e por ano. Sem país, sem imposto — só calendário.
//
// A data entra como `AAAA-MM-DD`, e é assim por um motivo: ordenar texto nesse
// formato dá a mesma ordem que ordenar data, e `AAAA-MM` sai com um corte de
// string. Nenhum `Date` é construído aqui, e isso evita o problema clássico —
// `new Date('2026-09-18')` é meia-noite UTC, que no Brasil é dia 17. Um mês
// inteiro migraria de lugar na virada.

const FORMATO = /^\d{4}-\d{2}-\d{2}$/;

export function exigirData(d) {
  if (!FORMATO.test(d)) {
    throw new RangeError(`data fora do formato AAAA-MM-DD: ${d}`);
  }
  const [ano, mes, dia] = d.split('-').map(Number);
  if (mes < 1 || mes > 12) throw new RangeError(`mês inválido em ${d}`);
  if (dia < 1 || dia > diasNoMes(ano, mes)) throw new RangeError(`dia inválido em ${d}`);
  return d;
}

export const diasNoMes = (ano, mes) => new Date(Date.UTC(ano, mes, 0)).getUTCDate();

/** `2026-09-18` → `2026-09` */
export const mesDe = (data) => exigirData(data).slice(0, 7);

/** `2026-09-18` → `2026` */
export const anoDe = (data) => exigirData(data).slice(0, 4);

/**
 * Agrupa eventos por uma chave de calendário, em ordem crescente.
 *
 * Devolve `Map` e não objeto: `Map` preserva a ordem de inserção para chaves
 * de texto, objeto não garante o mesmo para toda chave. Com mês em texto o
 * risco é teórico, mas a garantia sai de graça.
 */
export function agrupar(eventos, chave = mesDe) {
  const grupos = new Map();
  for (const e of [...eventos].sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0))) {
    const k = chave(e.data);
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k).push(e);
  }
  return grupos;
}

export const porMes = (eventos) => agrupar(eventos, mesDe);
export const porAno = (eventos) => agrupar(eventos, anoDe);
