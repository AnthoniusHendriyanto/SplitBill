export const roundMoney = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

export const lineTotal = item => (item.unitPrice ?? item.price) * (item.qty ?? item.quantity ?? 1);

export function billAmounts(bill) {
  const subtotal = bill.items.reduce((sum, item) => sum + lineTotal(item), 0);
  // ponytail: ?? so a zero tax, service charge, or discount is a value, not a missing field.
  const tax = bill.taxMode === 'percent' ? subtotal * (bill.tax ?? 0) / 100 : (bill.tax ?? 0);
  const service = bill.serviceMode === 'percent' ? subtotal * (bill.serviceCharge ?? 0) / 100 : (bill.serviceCharge ?? 0);
  const discount = bill.discountMode === 'percent' ? roundMoney(subtotal * (bill.discount ?? 0) / 100) : (bill.discount ?? 0);
  return { subtotal, tax, service, discount, total: roundMoney(subtotal + tax + service - discount) };
}

// Match domain/shares.go: allocate final cents, with input order breaking ties.
export function calculateShares(bill, assignments) {
  const amounts = billAmounts(bill);
  const people = bill.persons;
  if (!people.length) return [];
  let weights = people.map(() => 1);
  if (bill.splitType === 'percentage') weights = people.map(p => p.percentage || 0);
  if (bill.splitType === 'shared_items') {
    weights = people.map(() => 0);
    for (const item of bill.items) {
      const selected = people.filter(p => assignments[p.id]?.[item.id]);
      const sharers = selected.length ? selected : people;
      people.forEach((person, i) => {
        if (sharers.includes(person)) weights[i] += lineTotal(item) / sharers.length;
      });
    }
  }
  let sum = weights.reduce((s, w) => s + w, 0);
  if (!sum) { weights = people.map(() => 1); sum = people.length; }
  const totalCents = Math.max(0, Math.round((amounts.total + Number.EPSILON) * 100));
  const raw = weights.map(w => totalCents * w / sum);
  const allocated = raw.map(Math.floor);
  const order = raw.map((v, i) => ({ i, fraction: v - allocated[i] })).sort((a, b) => b.fraction - a.fraction || a.i - b.i);
  const remainder = totalCents - allocated.reduce((s, v) => s + v, 0);
  for (let i = 0; i < remainder && i < order.length; i++) allocated[order[i].i]++;
  return people.map((p, i) => {
    const total = bill.splitType === 'custom' ? roundMoney(p.customAmount || 0) : allocated[i] / 100;
    const ratio = bill.splitType === 'custom' ? (amounts.total ? total / amounts.total : 0) : weights[i] / sum;
    return {
      ...p,
      subtotal: roundMoney(amounts.subtotal * ratio),
      tax: roundMoney(amounts.tax * ratio),
      service: roundMoney(amounts.service * ratio),
      discount: roundMoney(amounts.discount * ratio),
      total,
    };
  });
}

// Equal and By Item are free on both tiers. Percentage and Custom require Premium.
// Single source of truth so the tab lock and the save guard cannot drift apart.
const PREMIUM_SPLITS = new Set(['percentage', 'custom']);
export const isPremiumSplit = (splitType) => PREMIUM_SPLITS.has(splitType);
export const SPLIT_TABS = { equal: 'equal', item: 'shared_items', percent: 'percentage', custom: 'custom' };
export const splitTypeForTab = (tab) => SPLIT_TABS[tab] || 'equal';

export function splitError(bill) {
  const amounts = billAmounts(bill);
  const money = value => Number.isFinite(value) && value >= 0 && value <= 1e10 && Math.abs(value * 100 - Math.round(value * 100)) < 0.00001;
  if (!bill.items.length || bill.items.some(i => !i.name?.trim() || !money(i.unitPrice ?? i.price) || !Number.isInteger(i.qty ?? i.quantity ?? 1) || (i.qty ?? i.quantity ?? 1) < 1 || (i.qty ?? i.quantity ?? 1) > 100000)) return 'Add valid items, prices, and quantities.';
  if (bill.persons.length < 2 || bill.persons.some(p => !p.name?.trim())) return 'Add at least two named participants.';
  if (!bill.persons.some(p => p.id === bill.payerId)) return 'Select who paid the bill.';
  if (!['equal', 'shared_items', 'percentage', 'custom'].includes(bill.splitType) || !['amount', 'percent'].includes(bill.taxMode) || !['amount', 'percent'].includes(bill.serviceMode)) return 'Select valid split and fee modes.';
  if (![amounts.subtotal, amounts.total, amounts.discount, bill.tax ?? 0, bill.serviceCharge ?? 0].every(money)) return 'Check bill amounts; the discount cannot exceed the total.';
  if (bill.splitType === 'custom' && (bill.persons.some(p => !money(p.customAmount ?? 0)) || bill.persons.reduce((sum, p) => sum + Math.round(p.customAmount ?? 0), 0) !== Math.round(amounts.total))) return 'Custom final amounts must add up to the grand total, including fees and discount.';
  if (bill.splitType === 'percentage' && (bill.persons.some(p => !money(p.percentage ?? 0) || p.percentage > 100) || Math.abs(bill.persons.reduce((sum, p) => sum + (p.percentage ?? 0), 0) - 100) > 0.000001)) return 'Percentages must total 100%.';
  return '';
}

export function savedShares(bill) {
  // ponytail: older bills have no share snapshot; fall back to recorded payments, never names.
  const payments = bill.payments || [];
  const total = (bill.grand_total ?? bill.total_amount ?? 0);
  return (bill.persons || []).map(p => {
    const outgoing = payments.filter(pm => pm.from_person_id === p.id).reduce((sum, pm) => sum + pm.amount, 0);
    const incoming = payments.filter(pm => pm.to_person_id === p.id).reduce((sum, pm) => sum + pm.amount, 0);
    // A draft has no settled share; callers render null as "Not finalized".
    const hasSnapshot = p.share_amount != null;
    const share = hasSnapshot ? p.share_amount : (p.is_payer ? total - incoming : outgoing);
    const value = hasSnapshot || bill.status !== 'draft' ? roundMoney(share) : null;
    const ratio = value == null || !total ? 0 : value / total;
    return {
      ...p,
      total: value,
      subtotal: roundMoney((bill.total_amount ?? 0) * ratio),
      tax: roundMoney((bill.tax_mode === 'percent' ? (bill.total_amount ?? 0) * (bill.tax ?? 0) / 100 : (bill.tax ?? 0)) * ratio),
      service: roundMoney((bill.service_mode === 'percent' ? (bill.total_amount ?? 0) * (bill.service_charge ?? 0) / 100 : (bill.service_charge ?? 0)) * ratio),
      discount: roundMoney((bill.discount ?? 0) * ratio),
    };
  });
}
