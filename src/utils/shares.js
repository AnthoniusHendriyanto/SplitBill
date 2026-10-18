export const lineTotal = item => (item.unitPrice ?? item.price) * (item.qty ?? item.quantity ?? 1);
const cents = value => Math.round((value + Number.EPSILON) * 100);

export function billAmounts(bill) {
  const subtotal = bill.items.reduce((sum, item) => sum + lineTotal(item), 0);
  const tax = bill.taxMode === 'percent' ? subtotal * bill.tax / 100 : (bill.tax ?? 0);
  const service = bill.serviceMode === 'percent' ? subtotal * bill.serviceCharge / 100 : (bill.serviceCharge ?? 0);
  const discount = bill.discountMode === 'percent' ? cents(subtotal * bill.discount / 100) / 100 : (bill.discount ?? 0);
  return { subtotal, tax, service, discount, total: cents(subtotal + tax + service - discount) / 100 };
}

// Match domain/shares.go: allocate final cents, with input order breaking ties.
export function calculatePersonTotals(bill, assignments) {
  const amounts = billAmounts(bill);
  const people = bill.persons;
  if (!people.length) return [];
  let weights = people.map(p => bill.splitType === 'percentage' ? (p.percentage || 0) : 1);
  if (bill.splitType === 'shared_items') {
    weights = people.map(() => 0);
    for (const item of bill.items) {
      let indices = people.flatMap((p, i) => assignments[p.id]?.[item.id] ? [i] : []);
      if (!indices.length) indices = people.map((_, i) => i);
      for (const i of indices) weights[i] += lineTotal(item) / indices.length;
    }
  }
  if (!weights.some(w => w > 0)) weights = people.map(() => 1);
  const weightSum = weights.reduce((sum, w) => sum + w, 0);
  const totalCents = Math.max(0, cents(amounts.total));
  const raw = weights.map(w => totalCents * w / weightSum);
  const allocated = raw.map(Math.floor);
  const order = raw.map((v, i) => ({ i, fraction: v - allocated[i] })).sort((a, b) => b.fraction - a.fraction || a.i - b.i);
  const remainder = totalCents - allocated.reduce((sum, v) => sum + v, 0);
  for (let i = 0; i < remainder && i < order.length; i++) allocated[order[i].i]++;
  return people.map((p, i) => {
    const ratio = weights[i] / weightSum;
    return {
      ...p,
      subtotal: cents(amounts.subtotal * ratio) / 100,
      tax: cents(amounts.tax * ratio) / 100,
      service: cents(amounts.service * ratio) / 100,
      discount: cents(amounts.discount * ratio) / 100,
      total: bill.splitType === 'custom' ? (p.customAmount || 0) : allocated[i] / 100,
    };
  });
}

export function splitError(bill) {
  const amounts = billAmounts(bill);
  const money = value => Number.isFinite(value) && value >= 0 && value <= 1e10 && Math.abs(value * 100 - cents(value)) < 0.00001;
  if (!bill.items.length || bill.items.some(i => !i.name?.trim() || !money(i.unitPrice ?? i.price) || !Number.isInteger(i.qty ?? i.quantity ?? 1) || (i.qty ?? i.quantity ?? 1) < 1 || (i.qty ?? i.quantity ?? 1) > 100000)) return 'Add valid items, prices, and quantities.';
  if (bill.persons.length < 2 || bill.persons.some(p => !p.name?.trim())) return 'Add at least two named participants.';
  if (!bill.persons.some(p => p.id === bill.payerId)) return 'Select who paid the bill.';
  if (!['equal', 'shared_items', 'percentage', 'custom'].includes(bill.splitType) || !['amount', 'percent'].includes(bill.taxMode) || !['amount', 'percent'].includes(bill.serviceMode)) return 'Select valid split and fee modes.';
  if (![amounts.subtotal, amounts.total, amounts.discount, bill.tax ?? 0, bill.serviceCharge ?? 0].every(money)) return 'Check bill amounts; the discount cannot exceed the total.';
  if (bill.splitType === 'custom' && (bill.persons.some(p => !money(p.customAmount ?? 0)) || bill.persons.reduce((sum, p) => sum + cents(p.customAmount ?? 0), 0) !== cents(amounts.total))) return 'Custom final amounts must add up to the grand total, including fees and discount.';
  if (bill.splitType === 'percentage' && (bill.persons.some(p => !money(p.percentage ?? 0) || p.percentage > 100) || Math.abs(bill.persons.reduce((sum, p) => sum + (p.percentage ?? 0), 0) - 100) > 0.000001)) return 'Percentages must total 100%.';
  return '';
}

export function savedShares(bill) {
  // ponytail: older bills have no share snapshot; use recorded payments, never names.
  const payments = bill.payments || [];
  return (bill.persons || []).map(p => ({
    id: p.id, name: p.name,
    total: p.share_amount ?? (bill.status === 'draft' ? null : p.is_payer
      ? bill.grand_total - payments.filter(pm => pm.to_person_id === p.id).reduce((sum, pm) => sum + pm.amount, 0)
      : payments.filter(pm => pm.from_person_id === p.id).reduce((sum, pm) => sum + pm.amount, 0)),
  }));
}
