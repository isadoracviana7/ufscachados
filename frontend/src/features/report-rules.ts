import type { Item } from "@/data/types";
export type Period = "all" | "month" | "semester" | "year";
export function inPeriod(
  value: string,
  period: Period,
  year: number,
  month: number,
  semester: number,
) {
  if (period === "all") return true;
  const match = /^(\d{4})-(\d{2})/.exec(value);
  if (!match) return false;
  const y = Number(match[1]),
    m = Number(match[2]);
  return (
    y === year &&
    (period === "year" ||
      (period === "month" && m === month) ||
      (period === "semester" && (m <= 6 ? 1 : 2) === semester))
  );
}
export function returnRate(items: Item[]) {
  const found = items.filter((i) => i.type === "achado");
  return found.length
    ? Math.round((found.filter((i) => i.status === 3).length / found.length) * 100)
    : 0;
}
export function aggregateBlocks(items: Item[]) {
  return Object.entries(
    items.reduce<Record<string, number>>((a, i) => {
      a[i.location] = (a[i.location] ?? 0) + 1;
      return a;
    }, {}),
  )
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}
export function aggregateCategories(items: Item[]) {
  return [...new Set(items.map((i) => i.category))].map((name) => ({
    name,
    achados: items.filter((i) => i.category === name && i.type === "achado" && i.status !== 3)
      .length,
    perdidos: items.filter((i) => i.category === name && i.type === "perdido" && i.status !== 3)
      .length,
    devolvidos: items.filter((i) => i.category === name && i.status === 3).length,
  }));
}
