// Pure reference-price math. Historical independent product prices are untouched.
const positive = (value) =>
  typeof value !== "boolean" &&
  value !== null &&
  value !== "" &&
  Number.isFinite(Number(value)) &&
  Number(value) > 0
    ? Number(value)
    : null;
function datedRate(value, date) {
  if (!positive(value) || !/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return null;
  const parsed = new Date(date + "T00:00:00Z");
  return !Number.isNaN(parsed.valueOf()) &&
    parsed.toISOString().slice(0, 10) === date
    ? Number(value)
    : null;
}
const cents = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
export function quotePayment(base, payment = {}, pending = false) {
  const baseUsd = positive(base);
  if (baseUsd === null) return null;
  const mode =
    payment.conversion_mode === "usdt_to_bcv" ? "usdt_to_bcv" : "bcv";
  const bcvRate = datedRate(payment.bcv_rate, payment.bcv_date);
  const usdtRate = datedRate(payment.usdt_rate, payment.usdt_date);
  const rate = mode === "usdt_to_bcv" ? usdtRate : bcvRate;
  const bs = rate === null ? null : cents(baseUsd * rate);
  const referenceBcvUsd =
    mode === "usdt_to_bcv" && bs !== null && bcvRate !== null
      ? bs / bcvRate
      : null;
  const rawPercent = positive(payment.deposit_percent);
  const depositPercent =
    !pending && rawPercent !== null && rawPercent <= 100 ? rawPercent : null;
  const fraction = depositPercent === null ? null : depositPercent / 100;
  const depositBaseUsd = fraction === null ? null : cents(baseUsd * fraction);
  const depositBs =
    fraction === null || bs === null ? null : cents(bs * fraction);
  return {
    mode,
    baseUsd,
    bs,
    referenceBcvUsd,
    bcvRate,
    usdtRate,
    bcvDate: bcvRate === null ? null : payment.bcv_date,
    usdtDate: usdtRate === null ? null : payment.usdt_date,
    pending,
    depositPercent,
    depositBaseUsd,
    depositBs,
    balanceBaseUsd:
      depositBaseUsd === null ? null : cents(baseUsd - depositBaseUsd),
    balanceBs: depositBs === null ? null : cents(bs - depositBs),
  };
}
export const moneyBs = (n) =>
  `Bs. ${Number(n).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const moneyUsd = (n) =>
  `USD ${Number(n).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export function quoteRates(quote) {
  if (!quote) return "";
  const parts = [];
  if (quote.mode === "usdt_to_bcv" && quote.usdtRate !== null)
    parts.push(
      `Tasa USDT configurada: ${moneyBs(quote.usdtRate)}/USD base · ${quote.usdtDate}`,
    );
  if (quote.bcvRate !== null)
    parts.push(`Tasa BCV: ${moneyBs(quote.bcvRate)}/USD · ${quote.bcvDate}`);
  return parts.join(". ");
}
export function quoteConversion(quote) {
  if (!quote || quote.bs === null) return "";
  return (
    moneyBs(quote.bs) +
    (quote.referenceBcvUsd !== null
      ? ` · Referencia a BCV: ${moneyUsd(quote.referenceBcvUsd)} (no es otro precio en dólares)`
      : quote.mode === "usdt_to_bcv"
        ? " · Referencia BCV pendiente de tasa fechada"
        : " · Conversión a BCV")
  );
}
