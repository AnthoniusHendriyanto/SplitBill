export const roundMoney = (value) => Math.round(value * 100) / 100;

export function savedShares(bill) {
  const payments = bill.payments || [];
  return (bill.persons || []).map(p => {
    const outgoing = payments.filter(pm => pm.from_person_id === p.id).reduce((sum, pm) => sum + pm.amount, 0);
    const incoming = payments.filter(pm => pm.to_person_id === p.id).reduce((sum, pm) => sum + pm.amount, 0);
    const total = p.share_amount ?? (p.is_payer ? bill.grand_total - incoming : outgoing);
    const ratio = bill.grand_total ? total / bill.grand_total : 0;
    return { ...p, total: roundMoney(total), subtotal: roundMoney(bill.total_amount * ratio), tax: roundMoney((bill.tax_mode === 'percent' ? bill.total_amount * bill.tax / 100 : bill.tax) * ratio), service: roundMoney((bill.service_mode === 'percent' ? bill.total_amount * bill.service_charge / 100 : bill.service_charge) * ratio), discount: roundMoney((bill.discount || 0) * ratio) };
  });
}

export function billAmounts(bill) {
  const subtotal = bill.items.reduce((sum, item) => sum + (item.unitPrice ?? item.price) * (item.qty ?? item.quantity ?? 1), 0);
  const tax = bill.taxMode === 'percent' ? subtotal * bill.tax / 100 : bill.tax;
  const service = bill.serviceMode === 'percent' ? subtotal * bill.serviceCharge / 100 : bill.serviceCharge;
  const discount = bill.discount || 0;
  return { subtotal, tax, service, discount, total: roundMoney(subtotal + tax + service - discount) };
}

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
        if (sharers.includes(person)) weights[i] += (item.unitPrice ?? item.price) * (item.qty ?? item.quantity ?? 1) / sharers.length;
      });
    }
  }
  let sum = weights.reduce((s, w) => s + w, 0);
  if (!sum) { weights = people.map(() => 1); sum = people.length; }
  const cents = Math.round(amounts.total * 100);
  const raw = weights.map(w => cents * w / sum);
  const allocated = raw.map(Math.floor);
  const order = raw.map((v, i) => ({ i, fraction: v - allocated[i] })).sort((a, b) => b.fraction - a.fraction || a.i - b.i);
  const remainder = cents - allocated.reduce((s, v) => s + v, 0);
  for (let i = 0; i < remainder; i++) allocated[order[i].i]++;
  return people.map((p, i) => {
    const total = bill.splitType === 'custom' ? roundMoney(p.customAmount || 0) : allocated[i] / 100;
    const ratio = bill.splitType === 'custom' ? (amounts.total ? total / amounts.total : 0) : weights[i] / sum;
    return { ...p, subtotal: roundMoney(amounts.subtotal * ratio), tax: roundMoney(amounts.tax * ratio), service: roundMoney(amounts.service * ratio), discount: roundMoney(amounts.discount * ratio), total };
  });
}
