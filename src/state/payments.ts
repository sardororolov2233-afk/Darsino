import {
  localDate,
  UZ_MONTHS,
  type Marketplace,
  type MonthlyPayment,
} from "./domain";

export const paymentMonth = (date = new Date()) => localDate(date).slice(0, 7);
export const validPaymentMonth = (month: string) =>
  /^20\d{2}-(0[1-9]|1[0-2])$/.test(month);
export function monthLabel(month: string) {
  if (!validPaymentMonth(month)) throw new Error("Hisobot oyi noto‘g‘ri.");
  const name = UZ_MONTHS[Number(month.slice(5, 7)) - 1];
  return `${name[0].toUpperCase()}${name.slice(1)} ${month.slice(0, 4)}`;
}
export function shiftMonth(month: string, step: number) {
  if (!validPaymentMonth(month)) throw new Error("Hisobot oyi noto‘g‘ri.");
  const date = new Date(`${month}-15T12:00:00+05:00`);
  date.setUTCMonth(date.getUTCMonth() + step);
  return paymentMonth(date);
}
export const canRemind = (payment?: MonthlyPayment, now = new Date()) =>
  !payment?.paid &&
  (!payment?.remindedAt ||
    now.getTime() - Date.parse(payment.remindedAt) >= 86400000);

export function groupPaymentRows(
  market: Marketplace,
  offeringId: string,
  month: string,
) {
  const group = market.offerings.find((g) => g.id === offeringId);
  if (!group || !validPaymentMonth(month)) return [];
  const payments = new Map(
    (market.payments || [])
      .filter((p) => p.offeringId === offeringId && p.month === month)
      .map((p) => [p.studentId, p]),
  );
  const users = new Map(market.users.map((u) => [u.id, u]));
  const unique = new Map<string, Marketplace["enrollments"][number]>();
  for (const e of market.enrollments) {
    if (e.offeringId !== offeringId) continue;
    const prior = unique.get(e.studentId);
    if (!prior || (e.active && !prior.active) ||
      (e.active === prior.active && e.createdAt > prior.createdAt)) unique.set(e.studentId, e);
  }
  return [...unique.values()]
    .filter((e) => {
      const recorded = payments.has(e.studentId);
      return (
        e.offeringId === offeringId &&
        ((e.active && paymentMonth(new Date(e.createdAt)) <= month) || recorded)
      );
    })
    .map((enrollment) => {
      const student = users.get(enrollment.studentId);
      const payment = payments.get(enrollment.studentId);
      const amount = payment?.amount ?? group.price;
      return {
        enrollment,
        student,
        payment,
        amount,
        paid: amount === 0 || !!payment?.paid,
        name: student?.name || "Ism kiritilmagan",
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "uz"));
}

export function paymentSummary(
  market: Marketplace,
  tutorId: string,
  month = paymentMonth(),
  offeringId = "all",
) {
  const rows = market.offerings
    .filter(
      (g) =>
        g.tutorId === tutorId && (offeringId === "all" || g.id === offeringId),
    )
    .flatMap((g) => groupPaymentRows(market, g.id, month));
  const expected = rows.reduce((sum, r) => sum + r.amount, 0);
  const received = rows.reduce((sum, r) => sum + (r.paid ? r.amount : 0), 0);
  return {
    rows,
    expected,
    received,
    outstanding: expected - received,
    paidCount: rows.filter((r) => r.paid && r.amount > 0).length,
    unpaidCount: rows.filter((r) => !r.paid).length,
    percent: expected ? Math.round((received / expected) * 100) : 0,
  };
}
