import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { C, S, R, F, SH } from '../lib/theme';
import { fmt, uid, today, genQR, forecast } from '../lib/helpers';
import { mStore, mlStore, pStore } from '../lib/storage';
import { Material, MaterialLog, Project } from '../lib/types';
import PB from '../components/ProgressBar';
import Empty from '../components/EmptyState';
import FF from '../components/FormField';
import PickerModal from '../components/PickerModal';
import ConfirmModal from '../components/ConfirmModal';
import InfoModal from '../components/InfoModal';

const UNIT_OPTIONS = [
  { value: 'Bags', label: 'Bags' }, { value: 'Tons', label: 'Tons' }, { value: 'Pieces', label: 'Pieces' },
  { value: 'Cubic Ft', label: 'Cubic Ft' }, { value: 'Meters', label: 'Meters' }, { value: 'Sheets', label: 'Sheets' },
  { value: 'Rolls', label: 'Rolls' }, { value: 'Kg', label: 'Kg' }, { value: 'Liters', label: 'Liters' },
  { value: 'Sqft', label: 'Sqft' }, { value: 'Units', label: 'Units' },
];
const CAT_OPTIONS = [
  { value: 'Cement', label: 'Cement', icon: 'cube' }, { value: 'Steel', label: 'Steel', icon: 'construct' },
  { value: 'Bricks', label: 'Bricks', icon: 'grid' }, { value: 'Sand', label: 'Sand', icon: 'layers' },
  { value: 'Aggregate', label: 'Aggregate', icon: 'diamond' }, { value: 'Wood', label: 'Wood', icon: 'leaf' },
  { value: 'Electrical', label: 'Electrical', icon: 'flash' }, { value: 'Plumbing', label: 'Plumbing', icon: 'water' },
  { value: 'Paint', label: 'Paint', icon: 'color-palette' }, { value: 'Hardware', label: 'Hardware', icon: 'hammer' },
  { value: 'Other', label: 'Other', icon: 'ellipse' },
];

export default function Inventory({ navigation }: any) {
  const [mats, setMats] = useState<Material[]>([]);
  const [showUnitPick, setShowUnitPick] = useState(false);
  const [showCatPick, setShowCatPick] = useState(false);
  const [showProjPick, setShowProjPick] = useState(false);
  const [logs, setLogs] = useState<MaterialLog[]>([]);
  const [projs, setProjs] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showDet, setShowDet] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [sel, setSel] = useState<Material | null>(null);
  const [fm, setFm] = useState({ name: '', category: '', unit: '', currentStock: '', minStock: '', maxStock: '', unitPrice: '', supplier: '', projectId: '', dailyUsageRate: '' });
  const [lf, setLf] = useState({ type: 'out' as 'in' | 'out', quantity: '', note: '', loggedBy: '' });
  const load = useCallback(async () => { const [m, l, p] = await Promise.all([mStore.all(), mlStore.all(), pStore.all()]); setMats(m); setLogs(l); setProjs(p); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const fil = mats.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.supplier.toLowerCase().includes(search.toLowerCase()));
  const totVal = fil.reduce((s, m) => s + m.currentStock * m.unitPrice, 0);
  const lowCnt = fil.filter(m => m.currentStock <= m.minStock && m.minStock > 0).length;
  const resetFm = () => setFm({ name: '', category: '', unit: '', currentStock: '', minStock: '', maxStock: '', unitPrice: '', supplier: '', projectId: '', dailyUsageRate: '' });
  const handleAdd = async () => { if (!fm.name.trim()) return; const stock = fm.currentStock.trim() ? Number(fm.currentStock) : 0; const minS = fm.minStock.trim() ? Number(fm.minStock) : 0; const maxS = fm.maxStock.trim() ? Number(fm.maxStock) : 0; const price = fm.unitPrice.trim() ? Number(fm.unitPrice) : 0; const daily = fm.dailyUsageRate.trim() ? Number(fm.dailyUsageRate) : 0; const m: Material = { id: uid(), name: fm.name.trim(), category: fm.category.trim(), unit: fm.unit.trim() || 'Units', currentStock: isNaN(stock) ? 0 : stock, minStock: isNaN(minS) ? 0 : minS, maxStock: isNaN(maxS) ? 0 : maxS, unitPrice: isNaN(price) ? 0 : price, supplier: fm.supplier.trim(), projectId: fm.projectId || (projs.length > 0 ? projs[0].id : ''), lastRestocked: today(), dailyUsageRate: isNaN(daily) ? 0 : daily, qrCode: '', createdAt: new Date().toISOString() }; m.qrCode = genQR(m); await mStore.add(m); resetFm(); setShowAdd(false); await load(); };
  const [showDelConfirm, setShowDelConfirm] = useState(false);
  const [delTarget, setDelTarget] = useState<Material | null>(null);
  const [infoMsg, setInfoMsg] = useState<{ visible: boolean; title: string; message: string; type: 'success' | 'error' | 'info' }>({ visible: false, title: '', message: '', type: 'info' });
  const handleLog = async () => { if (!sel || !lf.quantity) return; const qty = Number(lf.quantity); if (isNaN(qty) || qty <= 0) { setInfoMsg({ visible: true, title: 'Error', message: 'Enter a valid quantity greater than 0.', type: 'error' }); return; } await mlStore.add({ id: uid(), materialId: sel.id, type: lf.type, quantity: qty, date: today(), note: lf.note, loggedBy: lf.loggedBy }); const ns = lf.type === 'in' ? sel.currentStock + qty : Math.max(0, sel.currentStock - qty); const up = { ...sel, currentStock: ns, lastRestocked: lf.type === 'in' ? today() : sel.lastRestocked }; await mStore.upd(up); setSel(up); setLf({ type: 'out', quantity: '', note: '', loggedBy: '' }); setShowLog(false); await load(); setInfoMsg({ visible: true, title: 'Success', message: `${qty} ${sel.unit} ${lf.type === 'in' ? 'added to' : 'removed from'} ${sel.name}. New stock: ${ns} ${sel.unit}`, type: 'success' }); };
  const handleDel = (m: Material) => { setDelTarget(m); setShowDelConfirm(true); };
  const doDelMaterial = async () => { if (delTarget) { await mStore.del(delTarget.id); setSel(null); setShowDet(false); setShowDelConfirm(false); setDelTarget(null); await load(); } };
  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <View style={st.hdr}><View><Text style={st.title}>Inventory</Text><Text style={st.sub}>{mats.length} material{mats.length !== 1 ? 's' : ''}</Text></View><View style={{ flexDirection: 'row', gap: S.sm }}><TouchableOpacity style={[st.scanB, SH.sm]} onPress={() => navigation.navigate('Scanner')} activeOpacity={0.8}><Ionicons name="scan" size={20} color={C.priAccent} /></TouchableOpacity><TouchableOpacity style={[st.addB, SH.sm]} onPress={() => setShowAdd(true)} activeOpacity={0.8}><Ionicons name="add" size={22} color="#FFF" /></TouchableOpacity></View></View>
      {mats.length > 0 && <><View style={st.sumR}><View style={[st.sumC, SH.sm]}><Text style={st.sumV}>{fmt(totVal)}</Text><Text style={st.sumL}>Total Value</Text></View><View style={[st.sumC, SH.sm]}><Text style={[st.sumV, { color: C.err }]}>{lowCnt}</Text><Text style={st.sumL}>Low Stock</Text></View></View><View style={st.searchR}><View style={[st.searchB, SH.sm]}><Ionicons name="search" size={16} color={C.text3} /><TextInput style={st.searchI} placeholder="Search materials..." placeholderTextColor={C.text3} value={search} onChangeText={setSearch} />{search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={C.text3} /></TouchableOpacity>}</View></View></>}
      <FlatList data={fil} keyExtractor={i => i.id} contentContainerStyle={st.list} showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Empty icon="cube-outline" title="No Materials" msg="Add materials to track inventory." btn="Add Material" onBtn={() => setShowAdd(true)} />}
        renderItem={({ item }) => { const low = item.currentStock <= item.minStock && item.minStock > 0; const dl = item.dailyUsageRate > 0 ? Math.floor(item.currentStock / item.dailyUsageRate) : -1; const sl = item.maxStock > 0 ? item.currentStock / item.maxStock : 0; return (
          <TouchableOpacity style={[st.matC, SH.sm, low && { borderLeftWidth: 3, borderLeftColor: C.err }]} onPress={() => { setSel(item); setShowDet(true); }} activeOpacity={0.7}>
            <View style={st.matH}><View style={[st.matI, { backgroundColor: low ? C.errL : C.priAccent + '12' }]}><Ionicons name="cube" size={18} color={low ? C.err : C.priAccent} /></View><View style={{ flex: 1 }}><Text style={st.matN} numberOfLines={1}>{item.name}</Text><Text style={st.matSub}>{item.category}{item.supplier ? ` \u2022 ${item.supplier}` : ''}</Text></View>{low && <View style={st.lowB}><Text style={st.lowT}>LOW</Text></View>}</View>
            <View style={st.statsR}><View style={st.statI}><Text style={st.statL}>Stock</Text><Text style={[st.statV, low && { color: C.err }]}>{item.currentStock} {item.unit}</Text></View><View style={st.statI}><Text style={st.statL}>Price</Text><Text style={st.statV}>{fmt(item.unitPrice)}</Text></View><View style={st.statI}><Text style={st.statL}>Days</Text><Text style={[st.statV, { color: dl >= 0 && dl < 7 ? C.err : dl < 14 ? C.warn : C.ok }]}>{dl >= 0 ? `~${dl}d` : '-'}</Text></View></View>
            {item.maxStock > 0 && <PB progress={sl} h={4} />}
            <View style={st.qrR}><Ionicons name="qr-code" size={12} color={C.text3} /><Text style={st.qrT}>{item.qrCode || item.id.slice(0, 12)}</Text></View>
          </TouchableOpacity>
        ); }} />
      {/* Detail */}
      <Modal visible={showDet} animationType="slide" transparent><View style={st.mo}><View style={[st.mc, SH.lg]}>{sel && <ScrollView showsVerticalScrollIndicator={false}>
        <View style={st.mh}><Text style={st.mtt}>{sel.name}</Text><TouchableOpacity onPress={() => setShowDet(false)}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity></View>
        {sel.dailyUsageRate > 0 && (() => { const fc = forecast(sel, logs.filter(l => l.materialId === sel.id)); return <View style={[st.aiBox, SH.sm]}><Ionicons name="sparkles" size={18} color={C.purple} /><View style={{ flex: 1 }}><Text style={st.aiT}>AI Forecast</Text><Text style={st.aiM}>Depletes in <Text style={{ fontWeight: '700', color: C.err }}>~{fc.daysLeft}d</Text>. Trend: {fc.trend}. Order {fc.recQty} {sel.unit} by {fc.reorderDate}.</Text></View></View>; })()}
        <View style={st.qrBig}><Ionicons name="qr-code" size={44} color={C.pri} /><Text style={st.qrBigT}>{sel.qrCode || sel.id}</Text><Text style={st.qrBigS}>Scan to track this material</Text></View>
        <View style={st.dGrid}>{[['Stock', `${sel.currentStock} ${sel.unit}`], ['Min', `${sel.minStock} ${sel.unit}`], ['Max', `${sel.maxStock} ${sel.unit}`], ['Price', fmt(sel.unitPrice)], ['Value', fmt(sel.currentStock * sel.unitPrice)], ['Daily', `${sel.dailyUsageRate} ${sel.unit}/d`]].map(([l, v], i) => <View key={i} style={st.dItem}><Text style={st.dL}>{l}</Text><Text style={st.dV}>{v}</Text></View>)}</View>
        <View style={st.actR}><TouchableOpacity style={[st.actB, { backgroundColor: C.priAccent }]} onPress={() => { setShowDet(false); setShowLog(true); }}><Ionicons name="create" size={16} color="#FFF" /><Text style={st.actT}>Log Usage</Text></TouchableOpacity><TouchableOpacity style={[st.actB, { backgroundColor: C.err }]} onPress={() => handleDel(sel)}><Ionicons name="trash" size={16} color="#FFF" /><Text style={st.actT}>Delete</Text></TouchableOpacity></View>
      </ScrollView>}</View></View></Modal>
      {/* Log */}
      <Modal visible={showLog} animationType="slide" transparent><KeyboardAvoidingView style={st.mo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View style={[st.mc, SH.lg]}>
        <View style={st.mh}><Text style={st.mtt}>Log Usage</Text><TouchableOpacity onPress={() => setShowLog(false)}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity></View>
        {sel && <Text style={{ fontSize: F.md, color: C.text2, marginBottom: S.lg }}>{sel.name} \u2022 {sel.currentStock} {sel.unit}</Text>}
        <View style={{ flexDirection: 'row', gap: S.sm, marginBottom: S.lg }}>{(['out', 'in'] as const).map(t => <TouchableOpacity key={t} style={[st.togB, lf.type === t && st.togA]} onPress={() => setLf(f => ({ ...f, type: t }))}><Ionicons name={t === 'out' ? 'arrow-up' : 'arrow-down'} size={16} color={lf.type === t ? '#FFF' : C.text2} /><Text style={[st.togT, lf.type === t && st.togTA]}>{t === 'out' ? 'Out' : 'In'}</Text></TouchableOpacity>)}</View>
        <FF label={`Quantity (${sel?.unit || 'Units'}) *`} placeholder="0" inputType="number" value={lf.quantity} onChangeText={v => setLf(f => ({ ...f, quantity: v }))} />
        <FF label="Note" placeholder="e.g. 3rd floor slab" value={lf.note} onChangeText={v => setLf(f => ({ ...f, note: v }))} />
        <FF label="Logged By" placeholder="Your name" inputType="name" value={lf.loggedBy} onChangeText={v => setLf(f => ({ ...f, loggedBy: v }))} />
        <TouchableOpacity style={[st.subBtn, !lf.quantity && { opacity: 0.4 }]} onPress={handleLog} disabled={!lf.quantity}><Text style={st.subT}>Log {lf.type === 'out' ? 'Usage' : 'Receipt'}</Text></TouchableOpacity>
      </View></KeyboardAvoidingView></Modal>
      {/* Add */}
      <Modal visible={showAdd} animationType="slide" transparent><KeyboardAvoidingView style={st.mo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View style={[st.mc, SH.lg]}><ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={st.mh}><Text style={st.mtt}>Add Material</Text><TouchableOpacity onPress={() => { resetFm(); setShowAdd(false); }}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity></View>
        <FF label="Name *" placeholder="OPC Cement 50kg" value={fm.name} onChangeText={v => setFm(f => ({ ...f, name: v }))} />
        <Text style={st.fl}>Category</Text>
        <TouchableOpacity style={st.pickerBtn} onPress={() => setShowCatPick(true)}>
          <Ionicons name={(CAT_OPTIONS.find(c => c.value === fm.category)?.icon || 'cube') as any} size={16} color={C.priAccent} />
          <Text style={st.pickerBtnT}>{fm.category || 'Select Category'}</Text>
          <Ionicons name="chevron-down" size={16} color={C.text3} />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: S.md }}>
          <View style={{ flex: 1 }}>
            <Text style={st.fl}>Unit</Text>
            <TouchableOpacity style={st.pickerBtn} onPress={() => setShowUnitPick(true)}>
              <Text style={st.pickerBtnT}>{fm.unit || 'Select Unit'}</Text>
              <Ionicons name="chevron-down" size={16} color={C.text3} />
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}><FF label="Price (\u20B9)" placeholder="380" inputType="currency" value={fm.unitPrice} onChangeText={v => setFm(f => ({ ...f, unitPrice: v }))} /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: S.md }}><View style={{ flex: 1 }}><FF label="Stock" placeholder="0" inputType="number" value={fm.currentStock} onChangeText={v => setFm(f => ({ ...f, currentStock: v }))} /></View><View style={{ flex: 1 }}><FF label="Min" placeholder="0" inputType="number" value={fm.minStock} onChangeText={v => setFm(f => ({ ...f, minStock: v }))} /></View></View>
        <View style={{ flexDirection: 'row', gap: S.md }}><View style={{ flex: 1 }}><FF label="Max" placeholder="0" inputType="number" value={fm.maxStock} onChangeText={v => setFm(f => ({ ...f, maxStock: v }))} /></View><View style={{ flex: 1 }}><FF label="Daily Use" placeholder="0" inputType="number" value={fm.dailyUsageRate} onChangeText={v => setFm(f => ({ ...f, dailyUsageRate: v }))} /></View></View>
        <FF label="Supplier" placeholder="Supplier name" inputType="name" value={fm.supplier} onChangeText={v => setFm(f => ({ ...f, supplier: v }))} />
        {projs.length > 0 && <>
          <Text style={st.fl}>Project</Text>
          <TouchableOpacity style={st.pickerBtn} onPress={() => setShowProjPick(true)}>
            <Ionicons name="business" size={16} color={C.priAccent} />
            <Text style={st.pickerBtnT}>{projs.find(p => p.id === fm.projectId)?.name || 'Select Project'}</Text>
            <Ionicons name="chevron-down" size={16} color={C.text3} />
          </TouchableOpacity>
        </>}
        <TouchableOpacity style={[st.subBtn, !fm.name.trim() && { opacity: 0.4 }]} onPress={handleAdd} disabled={!fm.name.trim()}><Text style={st.subT}>Add Material</Text></TouchableOpacity>
      </ScrollView></View></KeyboardAvoidingView></Modal>
      {/* Picker Modals */}
      <PickerModal visible={showUnitPick} onClose={() => setShowUnitPick(false)} title="Select Unit" options={UNIT_OPTIONS} selected={fm.unit} onSelect={v => setFm(f => ({ ...f, unit: v }))} />
      <PickerModal visible={showCatPick} onClose={() => setShowCatPick(false)} title="Select Category" options={CAT_OPTIONS} selected={fm.category} onSelect={v => setFm(f => ({ ...f, category: v }))} />
      <PickerModal visible={showProjPick} onClose={() => setShowProjPick(false)} title="Select Project" options={projs.map(p => ({ value: p.id, label: p.name, icon: 'business' }))} selected={fm.projectId} onSelect={v => setFm(f => ({ ...f, projectId: v }))} />
      <ConfirmModal visible={showDelConfirm} title="Delete Material?" message={delTarget ? `Are you sure you want to delete "${delTarget.name}"? This cannot be undone.` : ''} confirmText="Delete" destructive icon="trash" onConfirm={doDelMaterial} onCancel={() => { setShowDelConfirm(false); setDelTarget(null); }} />
      <InfoModal visible={infoMsg.visible} title={infoMsg.title} message={infoMsg.message} type={infoMsg.type} onClose={() => setInfoMsg(prev => ({ ...prev, visible: false }))} />
    </SafeAreaView>
  );
}
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, hdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: S.xl, paddingBottom: S.md }, title: { fontSize: F.t1, fontWeight: '900', color: C.pri }, sub: { fontSize: F.sm, color: C.text3, marginTop: 2 },
  scanB: { width: 42, height: 42, borderRadius: R.md, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }, addB: { width: 42, height: 42, borderRadius: R.md, backgroundColor: C.priAccent, alignItems: 'center', justifyContent: 'center' },
  sumR: { flexDirection: 'row', paddingHorizontal: S.xl, gap: S.md, marginBottom: S.md }, sumC: { flex: 1, backgroundColor: C.card, borderRadius: R.md, padding: S.md }, sumV: { fontSize: F.xl, fontWeight: '800', color: C.priAccent }, sumL: { fontSize: F.xs, color: C.text3, marginTop: 2 },
  searchR: { paddingHorizontal: S.xl, marginBottom: S.sm }, searchB: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: R.md, paddingHorizontal: S.md, height: 42 }, searchI: { flex: 1, marginLeft: S.sm, fontSize: F.md, color: C.text },
  list: { padding: S.xl, paddingTop: S.sm },
  matC: { backgroundColor: C.card, borderRadius: R.lg, padding: S.lg, marginBottom: S.md }, matH: { flexDirection: 'row', alignItems: 'center', marginBottom: S.md }, matI: { width: 38, height: 38, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center', marginRight: S.md }, matN: { fontSize: F.md, fontWeight: '600', color: C.text }, matSub: { fontSize: F.xs, color: C.text3 }, lowB: { backgroundColor: C.errL, borderRadius: R.sm, paddingHorizontal: 6, paddingVertical: 2 }, lowT: { fontSize: F.xs, fontWeight: '700', color: C.err },
  statsR: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: S.sm }, statI: { alignItems: 'center' }, statL: { fontSize: F.xs, color: C.text3 }, statV: { fontSize: F.md, fontWeight: '700', color: C.text, marginTop: 2 },
  qrR: { flexDirection: 'row', alignItems: 'center', marginTop: S.sm, gap: 4 }, qrT: { fontSize: F.xs, color: C.text3, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  mo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }, mc: { backgroundColor: C.card, borderTopLeftRadius: R.xxl, borderTopRightRadius: R.xxl, padding: S.xxl, maxHeight: '92%' }, mh: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.xxl }, mtt: { fontSize: F.xxl, fontWeight: '800', color: C.pri, flex: 1 },
  aiBox: { flexDirection: 'row', backgroundColor: C.purpleL, borderRadius: R.md, padding: S.md, gap: S.sm, marginBottom: S.lg }, aiT: { fontSize: F.sm, fontWeight: '700', color: C.purple }, aiM: { fontSize: F.md, color: C.text, lineHeight: 20 },
  qrBig: { alignItems: 'center', backgroundColor: C.brdL, borderRadius: R.md, padding: S.xxl, marginBottom: S.lg }, qrBigT: { fontSize: F.md, fontWeight: '600', color: C.text, marginTop: S.sm, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }, qrBigS: { fontSize: F.xs, color: C.text3 },
  dGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md, marginBottom: S.lg }, dItem: { width: '47%', backgroundColor: C.brdL, borderRadius: R.sm, padding: S.md }, dL: { fontSize: F.xs, color: C.text3, textTransform: 'uppercase', letterSpacing: 0.5 }, dV: { fontSize: F.lg, fontWeight: '700', color: C.text, marginTop: 2 },
  actR: { flexDirection: 'row', gap: S.sm }, actB: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: R.md, gap: 6 }, actT: { fontSize: F.md, fontWeight: '600', color: '#FFF' },
  togB: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: R.md, backgroundColor: C.brdL, gap: 6 }, togA: { backgroundColor: C.priAccent }, togT: { fontSize: F.md, fontWeight: '600', color: C.text2 }, togTA: { color: '#FFF' },
  subBtn: { alignItems: 'center', backgroundColor: C.priAccent, borderRadius: R.md, paddingVertical: 16, marginTop: S.md }, subT: { fontSize: F.lg, fontWeight: '700', color: '#FFF' },
  fl: { fontSize: F.sm, fontWeight: '600', color: C.text2, marginBottom: 6, marginTop: S.md },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.brdL, borderRadius: R.md, paddingHorizontal: S.lg, paddingVertical: 14, gap: S.sm, marginBottom: S.sm },
  pickerBtnT: { flex: 1, fontSize: F.md, fontWeight: '500', color: C.text },
});
