import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { C, S, R, F, SH } from '../lib/theme';
import { fmt, fmtD, uid, today, reconcile } from '../lib/helpers';
import { iStore, pStore, tStore, nextInvNum } from '../lib/storage';
import { Invoice, InvoiceItem, Project } from '../lib/types';
import Empty from '../components/EmptyState';
import FF from '../components/FormField';
import PickerModal from '../components/PickerModal';
import ConfirmModal from '../components/ConfirmModal';
import InfoModal from '../components/InfoModal';

export default function Invoices() {
  const [invs, setInvs] = useState<Invoice[]>([]);
  const [projs, setProjs] = useState<Project[]>([]);
  const [sf, setSf] = useState('all');
  const [sel, setSel] = useState<Invoice | null>(null);
  const [showD, setShowD] = useState(false);
  const [showA, setShowA] = useState(false);
  const [fm, setFm] = useState({ partyName: '', partyContact: '', type: 'supplier', projectId: '', dueDate: '', items: [{ description: '', quantity: '', unit: 'Units', unitPrice: '' }] as any[] });
  const [showTypePick, setShowTypePick] = useState(false);
  const [showProjPick, setShowProjPick] = useState(false);
  const [showUnitPick, setShowUnitPick] = useState<number | null>(null);
  const typeOptions = [
    { value: 'supplier', label: 'Supplier Invoice', icon: 'arrow-up' },
    { value: 'client', label: 'Client Invoice', icon: 'arrow-down' },
    { value: 'internal', label: 'Internal', icon: 'swap-horizontal' },
  ];
  const projOptions = projs.map(p => ({ value: p.id, label: p.name, icon: 'business' }));
  const unitOptions = [
    { value: 'Units', label: 'Units' }, { value: 'Bags', label: 'Bags' }, { value: 'Tons', label: 'Tons' },
    { value: 'Cubic Ft', label: 'Cubic Ft' }, { value: 'Pieces', label: 'Pieces' }, { value: 'Meters', label: 'Meters' },
    { value: 'Sheets', label: 'Sheets' }, { value: 'Rolls', label: 'Rolls' }, { value: 'Lot', label: 'Lot' },
    { value: 'Kg', label: 'Kg' }, { value: 'Liters', label: 'Liters' }, { value: 'Sqft', label: 'Sqft' },
  ];
  const load = useCallback(async () => {
    const [i, p, t] = await Promise.all([iStore.all(), pStore.all(), tStore.all()]);
    const d = today(); let ch = false;
    const up = i.map(inv => { if (inv.status === 'pending' && inv.dueDate && inv.dueDate < d) { ch = true; return { ...inv, status: 'overdue' as const }; } return inv; });
    if (ch) await iStore.save(up);
    const { matched } = reconcile(up, t);
    setInvs(up.map(inv => ({ ...inv, reconciled: matched.includes(inv.id) })));
    setProjs(p);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const fil = sf === 'all' ? invs : invs.filter(i => i.status === sf);
  const sCfg: Record<string, any> = { paid: { c: C.ok, bg: C.okL, ic: 'checkmark-circle' }, pending: { c: C.warn, bg: C.warnL, ic: 'time' }, overdue: { c: C.err, bg: C.errL, ic: 'alert-circle' }, draft: { c: C.text3, bg: C.brdL, ic: 'document' } };
  const addItem = () => setFm(f => ({ ...f, items: [...f.items, { description: '', quantity: '', unit: 'Units', unitPrice: '' }] }));
  const upItem = (i: number, k: string, v: string) => setFm(f => { const items = [...f.items]; items[i] = { ...items[i], [k]: v }; return { ...f, items }; });
  const rmItem = (i: number) => setFm(f => ({ ...f, items: f.items.filter((_: any, j: number) => j !== i) }));
  // Live total calculation for preview
  const liveSubtotal = fm.items.reduce((s: number, it: any) => {
    const q = parseFloat(it.quantity) || 0;
    const p = parseFloat(it.unitPrice) || 0;
    return s + (q * p);
  }, 0);
  const liveTax = fm.type === 'supplier' ? Math.round(liveSubtotal * 0.18) : 0;
  const liveTotal = liveSubtotal + liveTax;

  const handleAdd = async () => {
    if (!fm.partyName.trim()) return;
    // Include items that have EITHER description OR (qty AND rate)
    const validItems = fm.items.filter((it: any) => {
      const hasDesc = it.description.trim().length > 0;
      const hasQty = parseFloat(it.quantity) > 0;
      const hasRate = parseFloat(it.unitPrice) > 0;
      return hasDesc || (hasQty && hasRate);
    });
    if (validItems.length === 0) {
      setInvInfo({ visible: true, title: 'No Items', message: 'Add at least one item with quantity and rate.', type: 'error' });
      return;
    }
    const num = await nextInvNum();
    const items: InvoiceItem[] = validItems.map((it: any) => {
      const q = parseFloat(it.quantity) || 0;
      const p = parseFloat(it.unitPrice) || 0;
      return { id: uid(), description: it.description.trim() || `Item (${q} × ${fmt(p)})`, quantity: q, unit: it.unit || 'Units', unitPrice: p, total: q * p };
    });
    const amt = items.reduce((s, it) => s + it.total, 0);
    if (amt <= 0) {
      setInvInfo({ visible: true, title: 'Invalid Amount', message: 'Total amount must be greater than zero. Check quantity and rate.', type: 'error' });
      return;
    }
    const tax = fm.type === 'supplier' ? Math.round(amt * 0.18) : 0;
    await iStore.add({ id: uid(), invoiceNumber: num, type: fm.type as any, amount: amt, tax, total: amt + tax, date: today(), dueDate: fm.dueDate, status: 'pending', projectId: fm.projectId || (projs.length > 0 ? projs[0].id : ''), items, partyName: fm.partyName.trim(), partyContact: fm.partyContact.trim(), reconciled: false, createdAt: new Date().toISOString() });
    setFm({ partyName: '', partyContact: '', type: 'supplier', projectId: '', dueDate: '', items: [{ description: '', quantity: '', unit: 'Units', unitPrice: '' }] }); setShowA(false); load();
  };
  const markPaid = async (inv: Invoice) => {
    const updatedInv = { ...inv, status: 'paid' as const, reconciled: true };
    await iStore.upd(updatedInv);
    // Sync project spent when invoice is marked paid
    if (inv.projectId && inv.type === 'supplier') {
      const allP = await pStore.all();
      const proj = allP.find(p => p.id === inv.projectId);
      if (proj) {
        await pStore.upd({ ...proj, spent: proj.spent + inv.total });
      }
    }
    // Auto-record as transaction
    await tStore.add({ id: uid(), type: 'payment' as any, category: 'supplier' as any, amount: inv.total, date: today(), description: `Invoice ${inv.invoiceNumber} - ${inv.partyName}`, projectId: inv.projectId, status: 'completed' as any, payee: inv.partyName, method: 'bank' as any, createdAt: new Date().toISOString() });
    setSel(null);
    setShowD(false);
    await load();
    setInvInfo({ visible: true, title: 'Done', message: `Invoice ${inv.invoiceNumber} marked as paid and transaction recorded.`, type: 'success' });
  };
  const [showDelInvConfirm, setShowDelInvConfirm] = useState(false);
  const [delInvTarget, setDelInvTarget] = useState<Invoice | null>(null);
  const [invInfo, setInvInfo] = useState<{ visible: boolean; title: string; message: string; type: 'success' | 'error' | 'info' }>({ visible: false, title: '', message: '', type: 'info' });
  const delInv = (inv: Invoice) => { setDelInvTarget(inv); setShowDelInvConfirm(true); };
  const doDelInv = async () => { if (delInvTarget) { await iStore.del(delInvTarget.id); setSel(null); setShowD(false); setShowDelInvConfirm(false); setDelInvTarget(null); await load(); } };
  const payInvoice = async (inv: Invoice) => {
    const url = `upi://pay?pn=${encodeURIComponent(inv.partyName)}&am=${inv.total}&cu=INR&tn=${encodeURIComponent(inv.invoiceNumber)}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) { await Linking.openURL(url); }
      else { setInvInfo({ visible: true, title: 'UPI Not Available', message: 'No UPI app found. Mark the invoice as paid after manual transfer.', type: 'info' }); }
    } catch { setInvInfo({ visible: true, title: 'Error', message: 'Could not open UPI app. Mark as paid after manual transfer.', type: 'error' }); }
  };
  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <View style={st.hdr}><View><Text style={st.title}>Invoices</Text><Text style={st.sub}>{invs.length} total</Text></View><TouchableOpacity style={[st.addB, SH.md]} onPress={() => setShowA(true)} activeOpacity={0.8}><Ionicons name="add" size={22} color="#FFF" /></TouchableOpacity></View>
      {invs.length > 0 && <FlatList horizontal data={['all', 'paid', 'pending', 'overdue']} keyExtractor={i => i} renderItem={({ item }) => { const cnt = item === 'all' ? invs.length : invs.filter(i2 => i2.status === item).length; return <TouchableOpacity style={[st.fC, sf === item && st.fCA]} onPress={() => setSf(item)}><Text style={[st.fCT, sf === item && st.fCTA]}>{item.charAt(0).toUpperCase() + item.slice(1)} ({cnt})</Text></TouchableOpacity>; }} showsHorizontalScrollIndicator={false} contentContainerStyle={st.chipR} />}
      <FlatList data={fil} keyExtractor={i => i.id} contentContainerStyle={st.list} showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Empty icon="document-text-outline" title="No Invoices" msg="Create your first invoice." btn="Create" onBtn={() => setShowA(true)} />}
        renderItem={({ item }) => { const cfg = sCfg[item.status] || sCfg.draft; return (
          <TouchableOpacity style={[st.invC, SH.sm]} onPress={() => { setSel(item); setShowD(true); }} activeOpacity={0.7}>
            <View style={st.invH}><View style={{ flex: 1 }}><Text style={st.invN}>{item.invoiceNumber}</Text><Text style={st.invP}>{item.partyName}</Text></View><View style={{ alignItems: 'flex-end', gap: 4 }}><View style={[st.sB, { backgroundColor: cfg.bg }]}><Text style={[st.sTx, { color: cfg.c }]}>{item.status.toUpperCase()}</Text></View>{item.reconciled && <View style={[st.sB, { backgroundColor: C.okL }]}><Ionicons name="checkmark-done" size={10} color={C.ok} /><Text style={[st.sTx, { color: C.ok }]}>RECONCILED</Text></View>}</View></View>
            <View style={st.invB}><Text style={st.invAmt}>{fmt(item.total)}</Text><Text style={st.invDue}>{item.dueDate ? `Due: ${fmtD(item.dueDate)}` : fmtD(item.date)}</Text></View>
          </TouchableOpacity>
        ); }} />
      {/* Detail */}
      <Modal visible={showD} animationType="slide" transparent><View style={st.mo}><View style={[st.mc, SH.lg]}>{sel && <ScrollView showsVerticalScrollIndicator={false}>
        <View style={st.mhh}><View><Text style={st.mtt}>{sel.invoiceNumber}</Text><Text style={{ fontSize: F.md, color: C.text3 }}>{sel.partyName}</Text></View><TouchableOpacity onPress={() => setShowD(false)}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity></View>
        {sel.items.length > 0 && <View style={st.tbl}>{sel.items.map(it => <View key={it.id} style={st.tR}><Text style={[st.tC, { flex: 2 }]}>{it.description}</Text><Text style={[st.tC, { flex: 1, textAlign: 'right' }]}>{it.quantity} {it.unit}</Text><Text style={[st.tC, { flex: 1, textAlign: 'right', fontWeight: '600' }]}>{fmt(it.total)}</Text></View>)}</View>}
        <View style={st.tots}><View style={st.totR}><Text style={st.totL}>Subtotal</Text><Text style={st.totV}>{fmt(sel.amount)}</Text></View><View style={st.totR}><Text style={st.totL}>GST 18%</Text><Text style={st.totV}>{fmt(sel.tax)}</Text></View><View style={[st.totR, { borderTopWidth: 2, borderTopColor: C.priAccent, paddingTop: S.sm, marginTop: S.sm }]}><Text style={{ fontSize: F.lg, fontWeight: '800', color: C.text }}>Total</Text><Text style={{ fontSize: F.lg, fontWeight: '800', color: C.priAccent }}>{fmt(sel.total)}</Text></View></View>
        <View style={st.actR}>
          {sel.status !== 'paid' && <TouchableOpacity style={[st.actB, { backgroundColor: C.ok }]} onPress={() => markPaid(sel)}><Ionicons name="checkmark" size={16} color="#FFF" /><Text style={st.actT}>Mark Paid</Text></TouchableOpacity>}
          {sel.status !== 'paid' && <TouchableOpacity style={[st.actB, { backgroundColor: '#5F259F' }]} onPress={() => payInvoice(sel)}><Ionicons name="send" size={16} color="#FFF" /><Text style={st.actT}>Pay UPI</Text></TouchableOpacity>}
          <TouchableOpacity style={[st.actB, { backgroundColor: C.err }]} onPress={() => delInv(sel)}><Ionicons name="trash" size={16} color="#FFF" /><Text style={st.actT}>Delete</Text></TouchableOpacity>
        </View>
      </ScrollView>}</View></View></Modal>
      {/* Add */}
      <Modal visible={showA} animationType="slide" transparent><KeyboardAvoidingView style={st.mo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View style={[st.mc, SH.lg]}><ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={st.mhh}><Text style={st.mtt}>New Invoice</Text><TouchableOpacity onPress={() => setShowA(false)}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity></View>
        <Text style={st.fl}>Invoice Type</Text>
        <TouchableOpacity style={st.pickerBtn} onPress={() => setShowTypePick(true)}>
          <Ionicons name={typeOptions.find(o => o.value === fm.type)?.icon as any || 'document'} size={16} color={C.priAccent} />
          <Text style={st.pickerBtnT}>{fm.type.charAt(0).toUpperCase() + fm.type.slice(1)}</Text>
          <Ionicons name="chevron-down" size={16} color={C.text3} />
        </TouchableOpacity>
        <FF label="Party Name *" placeholder="Name" inputType="name" value={fm.partyName} onChangeText={v => setFm(f => ({ ...f, partyName: v }))} />
        <FF label="Contact (10 digits)" placeholder="9876543210" inputType="phone" value={fm.partyContact} onChangeText={v => setFm(f => ({ ...f, partyContact: v }))} hint="10-digit mobile number" />
        <FF label="Due Date" placeholder="YYYY-MM-DD" inputType="date" value={fm.dueDate} onChangeText={v => setFm(f => ({ ...f, dueDate: v }))} hint="Auto-formats as you type" />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: S.md, marginBottom: S.sm }}><Text style={{ fontSize: F.md, fontWeight: '700', color: C.pri }}>Items</Text><TouchableOpacity onPress={addItem}><Ionicons name="add-circle" size={24} color={C.priAccent} /></TouchableOpacity></View>
        {fm.items.map((it: any, idx: number) => {
          const q = parseFloat(it.quantity) || 0;
          const r = parseFloat(it.unitPrice) || 0;
          const lineTotal = q * r;
          return (
            <View key={idx} style={{ backgroundColor: C.brdL, borderRadius: R.md, padding: S.md, marginBottom: S.sm }}>
              <FF label={`Item ${idx + 1} Description`} placeholder="e.g. OPC Cement 50kg" value={it.description} onChangeText={v => upItem(idx, 'description', v)} />
              <View style={{ flexDirection: 'row', gap: S.sm }}>
                <View style={{ flex: 1 }}><FF label="Qty *" placeholder="0" inputType="number" value={it.quantity} onChangeText={v => upItem(idx, 'quantity', v)} /></View>
                <View style={{ flex: 1 }}><FF label="Rate (\u20B9) *" placeholder="0" inputType="currency" value={it.unitPrice} onChangeText={v => upItem(idx, 'unitPrice', v)} /></View>
                {fm.items.length > 1 && <TouchableOpacity onPress={() => rmItem(idx)} style={{ marginTop: 28 }}><Ionicons name="close-circle" size={22} color={C.err} /></TouchableOpacity>}
              </View>
              {lineTotal > 0 && <Text style={{ fontSize: F.sm, color: C.priAccent, fontWeight: '700', textAlign: 'right', marginTop: 4 }}>Line Total: {fmt(lineTotal)}</Text>}
            </View>
          );
        })}
        {/* Live Total Preview */}
        {liveSubtotal > 0 && (
          <View style={{ backgroundColor: C.pri, borderRadius: R.md, padding: S.lg, marginTop: S.sm, marginBottom: S.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}><Text style={{ fontSize: F.sm, color: C.text3 }}>Subtotal</Text><Text style={{ fontSize: F.sm, color: '#FFF' }}>{fmt(liveSubtotal)}</Text></View>
            {liveTax > 0 && <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}><Text style={{ fontSize: F.sm, color: C.text3 }}>GST 18%</Text><Text style={{ fontSize: F.sm, color: '#FFF' }}>{fmt(liveTax)}</Text></View>}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 6, marginTop: 4 }}><Text style={{ fontSize: F.lg, fontWeight: '800', color: '#FFF' }}>Total</Text><Text style={{ fontSize: F.lg, fontWeight: '800', color: C.goldL }}>{fmt(liveTotal)}</Text></View>
          </View>
        )}
        <TouchableOpacity style={[st.subBtn, (!fm.partyName.trim() || liveSubtotal <= 0) && { opacity: 0.4 }]} onPress={handleAdd} disabled={!fm.partyName.trim() || liveSubtotal <= 0}><Text style={st.subT}>Create Invoice • {fmt(liveTotal)}</Text></TouchableOpacity>
      </ScrollView></View></KeyboardAvoidingView></Modal>
      {/* Picker Modals */}
      <PickerModal visible={showTypePick} onClose={() => setShowTypePick(false)} title="Invoice Type" options={typeOptions} selected={fm.type} onSelect={v => setFm(f => ({ ...f, type: v }))} />
      <PickerModal visible={showProjPick} onClose={() => setShowProjPick(false)} title="Select Project" options={projOptions} selected={fm.projectId} onSelect={v => setFm(f => ({ ...f, projectId: v }))} />
      {showUnitPick !== null && <PickerModal visible={true} onClose={() => setShowUnitPick(null)} title="Select Unit" options={unitOptions} selected={fm.items[showUnitPick]?.unit} onSelect={v => { upItem(showUnitPick!, 'unit', v); setShowUnitPick(null); }} />}
      <ConfirmModal visible={showDelInvConfirm} title="Delete Invoice?" message={delInvTarget ? `Are you sure you want to delete ${delInvTarget.invoiceNumber}? This cannot be undone.` : ''} confirmText="Delete" destructive icon="trash" onConfirm={doDelInv} onCancel={() => { setShowDelInvConfirm(false); setDelInvTarget(null); }} />
      <InfoModal visible={invInfo.visible} title={invInfo.title} message={invInfo.message} type={invInfo.type} onClose={() => setInvInfo(prev => ({ ...prev, visible: false }))} />
    </SafeAreaView>
  );
}
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, hdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: S.xl, paddingBottom: S.md }, title: { fontSize: F.t1, fontWeight: '900', color: C.pri }, sub: { fontSize: F.sm, color: C.text3, marginTop: 2 }, addB: { width: 42, height: 42, borderRadius: R.md, backgroundColor: C.priAccent, alignItems: 'center', justifyContent: 'center' },
  chipR: { paddingHorizontal: S.xl, paddingVertical: S.xs, gap: S.sm }, fC: { paddingHorizontal: S.lg, paddingVertical: 8, borderRadius: R.full, backgroundColor: C.card, borderWidth: 1, borderColor: C.brd }, fCA: { backgroundColor: C.pri, borderColor: C.pri }, fCT: { fontSize: F.sm, color: C.text2, fontWeight: '600' }, fCTA: { color: '#FFF' },
  list: { padding: S.xl, paddingTop: S.sm },
  invC: { backgroundColor: C.card, borderRadius: R.lg, padding: S.lg, marginBottom: S.md }, invH: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: S.md }, invN: { fontSize: F.md, fontWeight: '700', color: C.text }, invP: { fontSize: F.sm, color: C.text3 }, sB: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: R.full, gap: 3 }, sTx: { fontSize: 9, fontWeight: '700' },
  invB: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, invAmt: { fontSize: F.xl, fontWeight: '800', color: C.priAccent }, invDue: { fontSize: F.sm, color: C.text3 },
  mo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }, mc: { backgroundColor: C.card, borderTopLeftRadius: R.xxl, borderTopRightRadius: R.xxl, padding: S.xxl, maxHeight: '92%' }, mhh: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: S.xl }, mtt: { fontSize: F.xxl, fontWeight: '800', color: C.pri },
  tbl: { backgroundColor: C.brdL, borderRadius: R.md, padding: S.md, marginBottom: S.lg }, tR: { flexDirection: 'row', paddingVertical: S.sm, borderBottomWidth: 1, borderBottomColor: C.brd }, tC: { fontSize: F.sm, color: C.text },
  tots: { marginBottom: S.lg }, totR: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }, totL: { fontSize: F.md, color: C.text3 }, totV: { fontSize: F.md, color: C.text },
  actR: { flexDirection: 'row', gap: S.sm }, actB: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: R.md, gap: 4 }, actT: { fontSize: F.sm, fontWeight: '600', color: '#FFF' },
  fl: { fontSize: F.sm, fontWeight: '600', color: C.text2, marginBottom: 6, marginTop: S.md }, catR: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm, marginBottom: S.md }, catB: { paddingHorizontal: S.md, paddingVertical: S.sm, borderRadius: R.full, backgroundColor: C.brdL }, catBA: { backgroundColor: C.priAccent }, catBT: { fontSize: F.sm, color: C.text3, fontWeight: '500' },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.brdL, borderRadius: R.md, paddingHorizontal: S.lg, paddingVertical: 14, gap: S.sm, marginBottom: S.sm }, pickerBtnT: { flex: 1, fontSize: F.md, fontWeight: '500', color: C.text },
  subBtn: { alignItems: 'center', backgroundColor: C.priAccent, borderRadius: R.md, paddingVertical: 16, marginTop: S.lg }, subT: { fontSize: F.lg, fontWeight: '700', color: '#FFF' },
});
