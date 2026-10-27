import type { Marketplace } from "./domain";
import { groupPaymentRows, paymentMonth, shiftMonth } from "./payments";
export function teacherFinance(
  market: Marketplace,
  tutorId: string,
  month: string,
  groupId = "all",
) {
  const groups = market.offerings.filter(
    (g) => g.tutorId === tutorId && (groupId === "all" || g.id === groupId),
  );
  const rows = groups.flatMap((group) =>
    groupPaymentRows(market, group.id, month).map((row) => ({ ...row, group })),
  );
  const expected = rows.reduce((sum, r) => sum + r.amount, 0);
  const received = rows.reduce((sum, r) => sum + (r.paid ? r.amount : 0), 0);
  return {
    rows,
    expected,
    received,
    outstanding: expected - received,
    percent: expected ? Math.round((100 * received) / expected) : 0,
    paidCount: rows.filter((r) => r.paid && r.amount > 0).length,
    debtorCount: new Set(
      rows
        .filter((r) => !r.paid && r.amount > 0)
        .map((r) => r.enrollment.studentId),
    ).size,
    groups: groups.map((g) => ({
      group: g,
      received: rows
        .filter((r) => r.group.id === g.id && r.paid)
        .reduce((n, r) => n + r.amount, 0),
      expected: rows
        .filter((r) => r.group.id === g.id)
        .reduce((n, r) => n + r.amount, 0),
    })),
  };
}
export function financeHistory(
  market: Marketplace,
  tutorId: string,
  month = paymentMonth(),
  groupId = "all",
) {
  return [-3, -2, -1, 0].map((offset) => {
    const date = shiftMonth(month, offset);
    return { month: date, ...teacherFinance(market, tutorId, date, groupId) };
  });
}
export function csvCell(value: string | number) {
  const text = String(value);
  return `"${(/^[\s]*[=+@-]/.test(text) ? "'" : "") + text.replace(/"/g, '""')}"`;
}
