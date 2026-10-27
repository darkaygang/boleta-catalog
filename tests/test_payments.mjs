import test from "node:test";
import assert from "node:assert/strict";
import {
  quotePayment,
  quoteConversion,
  quoteRates,
} from "../dist/js/payments.js";
const payment = {
  conversion_mode: "usdt_to_bcv",
  bcv_rate: 887.3,
  usdt_rate: 1005,
  bcv_date: "2026-10-26",
  usdt_date: "2026-10-26",
  deposit_percent: 50,
};
test("USD30 uses exact USDT/BCV ratio, with 50 percent deposit", () => {
  const q = quotePayment(30, payment);
  assert.equal(q.bs, 30150);
  assert.equal(q.referenceBcvUsd.toFixed(2), "33.98");
  assert.equal(q.depositBs, 15075);
  assert.equal(q.depositBaseUsd, 15);
  assert.equal(q.balanceBs, 15075);
  assert.equal(q.balanceBaseUsd, 15);
  assert.notEqual(q.referenceBcvUsd, 36);
  assert.notEqual(q.referenceBcvUsd, 35);
  assert.match(quoteConversion(q), /Ref\. BCV: \$33,98 USD/);
  assert.match(quoteRates(q), /2026-10-26/);
});
test("quantity and variant totals calculate from their actual base", () => {
  const q = quotePayment(42.75 * 3, payment);
  assert.equal(q.bs, 128.25 * 1005);
  assert.equal(q.depositBs, 64445.63);
  assert.equal(q.balanceBs, 64445.62);
  assert.equal(Number((q.depositBs + q.balanceBs).toFixed(2)), q.bs);
});
test("unknown price and incomplete subtotal never create a payment commitment", () => {
  for (const base of [null, undefined, "", 0, -1, NaN, Infinity])
    assert.equal(quotePayment(base, payment), null);
  const q = quotePayment(30, payment, true);
  assert.equal(q.bs, 30150);
  assert.equal(q.depositBs, null);
  assert.equal(q.depositBaseUsd, null);
  assert.equal(q.balanceBs, null);
});
test("legacy BCV conversion retains its own multiplication", () => {
  const q = quotePayment(30, { ...payment, conversion_mode: "bcv" });
  assert.equal(q.bs, 30 * 887.3);
  assert.equal(q.referenceBcvUsd, null);
});
test("missing or impossible dates never create dated exchange prices", () => {
  const missing = quotePayment(30, { ...payment, usdt_date: "" });
  assert.equal(missing.bs, null);
  const impossible = quotePayment(30, { ...payment, usdt_date: "2026-02-30" });
  assert.equal(impossible.bs, null);
  const noBcv = quotePayment(30, { ...payment, bcv_rate: null });
  assert.equal(noBcv.bs, 30150);
  assert.equal(noBcv.referenceBcvUsd, null);
});
test("changing rates does not rewrite independently stored product prices", () => {
  const product = { numeric_usd: 30, numeric_bcv: 35 };
  const before = JSON.stringify(product);
  const q = quotePayment(product.numeric_usd, payment);
  assert.equal(q.bs, 30150);
  assert.equal(JSON.stringify(product), before);
});
test("odd cents allocate the balance by subtraction without inventing a cent", () => {
  const q = quotePayment(0.01, payment);
  assert.equal(q.bs, 10.05);
  assert.equal(q.depositBs, 5.03);
  assert.equal(q.balanceBs, 5.02);
  assert.equal(Number((q.depositBs + q.balanceBs).toFixed(2)), q.bs);
  assert.equal(
    Number((q.depositBaseUsd + q.balanceBaseUsd).toFixed(2)),
    q.baseUsd,
  );
});

test("customer reference is in dollars without bolivar amounts", () => {
  const text = quoteConversion(quotePayment(30, payment));
  assert.equal(text, "Ref. BCV: $33,98 USD");
  assert.doesNotMatch(text, /Bs|30150/);
});

