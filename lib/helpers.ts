import { Project, Material, Invoice, Transaction, Delivery, AppAlert } from './types';
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
export const today = () => new Date().toISOString().split('T')[0];
export function fmt(n: number): string {
  if (n >= 1e7) return '\u20B9' + (n / 1e7).toFixed(2) + ' Cr';
  if (n >= 1e5) return '\u20B9' + (n / 1e5).toFixed(2) + ' L';
  if (n >= 1e3) return '\u20B9' + (n / 1e3).toFixed(1) + 'K';
  return '\u20B9' + n.toLocaleString('en-IN');
}
export function fmtD(d: string): string { if (!d) return '-'; return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
export function daysDiff(a: string, b: string): number { return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 864e5); }
export function genQR(m: Material): string { return `BUILDPRO:${m.id}:${m.name.replace(/\s/g, '_')}`; }
export function parseQR(data: string): { id: string; name: string } | null {
  if (data.startsWith('BUILDPRO:')) { const p = data.split(':'); return { id: p[1] || '', name: (p[2] || '').replace(/_/g, ' ') }; }
  return null;
}
export function forecast(mat: Material, logs: { type: string; quantity: number }[]): { daysLeft: number; reorderDate: string; recQty: number; trend: string } {
  const rate = mat.dailyUsageRate > 0 ? mat.dailyUsageRate : 1;
  const daysLeft = Math.max(0, Math.floor(mat.currentStock / rate));
  const rd = new Date(Date.now() + Math.max(0, daysLeft - 5) * 864e5).toISOString().split('T')[0];
  const recQty = Math.ceil(rate * 30);
  const outs = logs.filter(l => l.type === 'out').slice(0, 14);
  const h1 = outs.slice(0, 7).reduce((s, l) => s + l.quantity, 0);
  const h2 = outs.slice(7).reduce((s, l) => s + l.quantity, 0);
  const trend = h1 > h2 * 1.15 ? 'increasing' : h2 > h1 * 1.15 ? 'decreasing' : 'stable';
  return { daysLeft, reorderDate: rd, recQty, trend };
}
export function reconcile(invoices: Invoice[], txs: Transaction[]): { matched: string[]; unmatched: string[] } {
  const matched: string[] = []; const unmatched: string[] = []; const used = new Set<string>();
  invoices.forEach(inv => {
    if (inv.status === 'paid') { matched.push(inv.id); return; }
    const m = txs.find(tx => !used.has(tx.id) && tx.type === 'payment' && tx.status === 'completed' && Math.abs(tx.amount - inv.total) < inv.total * 0.01 && inv.partyName.toLowerCase().split(' ').some(w => tx.payee.toLowerCase().includes(w)));
    if (m) { matched.push(inv.id); used.add(m.id); } else unmatched.push(inv.id);
  });
  return { matched, unmatched };
}
export function genAlerts(P: Project[], M: Material[], I: Invoice[], T: Transaction[], D: Delivery[]): AppAlert[] {
  const a: AppAlert[] = []; const d = today();
  M.forEach(m => {
    if (m.currentStock <= m.minStock && m.minStock > 0) a.push({ id: 'ls-' + m.id, type: 'low-stock', title: 'Low Stock: ' + m.name, message: `${m.currentStock} ${m.unit} left (min: ${m.minStock}).${m.dailyUsageRate > 0 ? ` ~${Math.floor(m.currentStock / m.dailyUsageRate)}d left.` : ''}`, severity: m.currentStock <= m.minStock * 0.5 ? 'critical' : 'warning', date: d, read: false, projectId: m.projectId });
    if (m.dailyUsageRate > 0 && m.currentStock > m.minStock) { const dl = Math.floor(m.currentStock / m.dailyUsageRate); if (dl <= 7 && dl > 0) a.push({ id: 'dep-' + m.id, type: 'ai-insight', title: 'Depletion: ' + m.name, message: `Runs out in ~${dl}d at ${m.dailyUsageRate} ${m.unit}/day.`, severity: 'info', date: d, read: false, projectId: m.projectId }); }
  });
  P.forEach(p => { if (p.budget > 0 && p.status === 'active') { const pct = p.spent / p.budget; if (pct >= 0.9) a.push({ id: 'bud-' + p.id, type: 'budget-overrun', title: 'Budget: ' + p.name, message: `${(pct * 100).toFixed(1)}% used (${fmt(p.spent)}/${fmt(p.budget)}).`, severity: pct >= 1 ? 'critical' : 'warning', date: d, read: false, projectId: p.id }); } });
  I.forEach(inv => { if ((inv.status === 'pending' || inv.status === 'overdue') && inv.dueDate && inv.dueDate < d) { const od = daysDiff(inv.dueDate, d); a.push({ id: 'od-' + inv.id, type: 'payment-due', title: 'Overdue: ' + inv.invoiceNumber, message: `${inv.partyName} - ${fmt(inv.total)} overdue ${od}d.`, severity: od > 15 ? 'critical' : 'warning', date: d, read: false, projectId: inv.projectId }); } });
  const pend = T.filter(t => t.status === 'pending'); if (pend.length > 0) a.push({ id: 'pend', type: 'payment-due', title: `${pend.length} Pending Payment(s)`, message: `Total: ${fmt(pend.reduce((s, t) => s + t.amount, 0))}`, severity: pend.length > 5 ? 'critical' : 'info', date: d, read: false });
  const { unmatched } = reconcile(I, T); if (unmatched.length > 0) a.push({ id: 'recon', type: 'reconciliation', title: `${unmatched.length} Unreconciled`, message: 'Invoices without matching payments.', severity: 'info', date: d, read: false });
  D.filter(dl => dl.status === 'expected' || dl.status === 'in-transit').forEach(dl => a.push({ id: 'del-' + dl.id, type: 'delivery', title: 'Delivery: ' + dl.materialName, message: `${dl.quantity} ${dl.unit} from ${dl.supplier}. Expected: ${fmtD(dl.expectedDate)}.${dl.geoAddress ? ' ' + dl.geoAddress : ''}`, severity: 'info', date: d, read: false, projectId: dl.projectId }));
  return a;
}
