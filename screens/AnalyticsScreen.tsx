import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { C, S, R, F, SH } from '../lib/theme';
import { fmt, genAlerts } from '../lib/helpers';
import { pStore, mStore, tStore, iStore, wStore, dStore } from '../lib/storage';
import { Project, Material, Transaction, Invoice, Worker, Delivery } from '../lib/types';
import PB from '../components/ProgressBar';
import Empty from '../components/EmptyState';

export default function Analytics() {
  const [P, sP] = useState<Project[]>([]); const [M, sM] = useState<Material[]>([]); const [T, sT] = useState<Transaction[]>([]); const [I, sI] = useState<Invoice[]>([]); const [W, sW] = useState<Worker[]>([]); const [D, sD] = useState<Delivery[]>([]);
  const load = useCallback(async () => { const [p, m, t, i, w, d] = await Promise.all([pStore.all(), mStore.all(), tStore.all(), iStore.all(), wStore.all(), dStore.all()]); sP(p); sM(m); sT(t); sI(i); sW(w); sD(d); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const has = P.length > 0 || M.length > 0 || T.length > 0;
  if (!has) return <SafeAreaView style={st.safe} edges={['top']}><View style={{ padding: S.xl }}><Text style={st.title}>Analytics</Text></View><Empty icon="analytics-outline" title="No Data" msg="Add data to see analytics." /></SafeAreaView>;
  const tB = P.reduce((s, p) => s + p.budget, 0); const tS = P.reduce((s, p) => s + p.spent, 0);
  const labC = T.filter(t => t.category === 'labor' && t.type === 'payment').reduce((s, t) => s + t.amount, 0);
  const matC = T.filter(t => (t.category === 'material' || t.category === 'supplier') && t.type === 'payment').reduce((s, t) => s + t.amount, 0);
  const eqC = T.filter(t => t.category === 'equipment').reduce((s, t) => s + t.amount, 0);
  const ohC = T.filter(t => t.category === 'overhead').reduce((s, t) => s + t.amount, 0);
  const totC = labC + matC + eqC + ohC;
  const cb = [{ l: 'Labor', a: labC, c: C.priAccent }, { l: 'Material', a: matC, c: C.gold }, { l: 'Equipment', a: eqC, c: C.purple }, { l: 'Overhead', a: ohC, c: C.err }].filter(x => x.a > 0);
  const invV = M.reduce((s, m) => s + m.currentStock * m.unitPrice, 0);
  const lowS = M.filter(m => m.currentStock <= m.minStock && m.minStock > 0).length;
  const alerts = genAlerts(P, M, I, T, D).filter(a => a.severity !== 'info');
  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <ScrollView contentContainerStyle={st.cc} showsVerticalScrollIndicator={false}>
        <Text style={st.title}>Analytics</Text>
        <View style={[st.card, SH.md]}><View style={st.cH}><Ionicons name="wallet" size={18} color={C.priAccent} /><Text style={st.cT}>Financial</Text></View><View style={st.finR}><View style={st.finI}><Text style={st.finL}>Budget</Text><Text style={st.finV}>{fmt(tB)}</Text></View><View style={st.finI}><Text style={st.finL}>Spent</Text><Text style={[st.finV, { color: C.gold }]}>{fmt(tS)}</Text></View><View style={st.finI}><Text style={st.finL}>Left</Text><Text style={[st.finV, { color: tB - tS >= 0 ? C.ok : C.err }]}>{fmt(Math.abs(tB - tS))}</Text></View></View>{tB > 0 && <PB progress={tS / tB} h={10} />}</View>
        {cb.length > 0 && <View style={[st.card, SH.md]}><View style={st.cH}><Ionicons name="pie-chart" size={18} color={C.priAccent} /><Text style={st.cT}>Cost Breakdown</Text></View>{cb.map(x => { const pct = totC > 0 ? (x.a / totC) * 100 : 0; return <View key={x.l} style={st.bkR}><View style={{ width: 100 }}><Text style={st.bkL}>{x.l}</Text><Text style={st.bkA}>{fmt(x.a)}</Text></View><View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: S.sm }}><View style={{ flex: 1, height: 8, backgroundColor: C.brdL, borderRadius: R.full, overflow: 'hidden' }}><View style={{ height: 8, borderRadius: R.full, backgroundColor: x.c, width: `${pct}%` }} /></View><Text style={st.bkP}>{pct.toFixed(0)}%</Text></View></View>; })}</View>}
        {P.length > 0 && <View style={[st.card, SH.md]}><View style={st.cH}><Ionicons name="bar-chart" size={18} color={C.priAccent} /><Text style={st.cT}>Projects</Text></View>{P.map(p => { const u = p.budget > 0 ? p.spent / p.budget : 0; return <View key={p.id} style={{ marginBottom: S.md }}><Text style={st.pjL}>{p.name}</Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm }}><View style={{ flex: 1 }}><PB progress={u} h={8} /></View><Text style={st.pjP}>{(u * 100).toFixed(0)}%</Text></View></View>; })}</View>}
        {M.length > 0 && <View style={[st.card, SH.md]}><View style={st.cH}><Ionicons name="cube" size={18} color={C.priAccent} /><Text style={st.cT}>Inventory</Text></View><View style={st.hG}><View style={[st.hI, { backgroundColor: C.priAccent + '12' }]}><Text style={[st.hV, { color: C.priAccent }]}>{fmt(invV)}</Text><Text style={st.hL}>Value</Text></View><View style={[st.hI, { backgroundColor: C.errL }]}><Text style={[st.hV, { color: C.err }]}>{lowS}</Text><Text style={st.hL}>Low</Text></View><View style={[st.hI, { backgroundColor: C.purpleL }]}><Text style={[st.hV, { color: C.purple }]}>{M.length}</Text><Text style={st.hL}>Items</Text></View><View style={[st.hI, { backgroundColor: C.okL }]}><Text style={[st.hV, { color: C.ok }]}>{W.filter(w => w.status === 'active').length}</Text><Text style={st.hL}>Workers</Text></View></View></View>}
        {alerts.length > 0 && <View style={[st.card, SH.md, { backgroundColor: C.purpleL }]}><View style={st.cH}><Ionicons name="sparkles" size={18} color={C.purple} /><Text style={[st.cT, { color: C.purple }]}>AI Insights</Text></View>{alerts.slice(0, 6).map((a, i) => <View key={i} style={st.insC}><Ionicons name={a.severity === 'critical' ? 'alert-circle' : 'warning'} size={16} color={a.severity === 'critical' ? C.err : C.warn} /><View style={{ flex: 1, marginLeft: S.sm }}><Text style={st.insT}>{a.title}</Text><Text style={st.insM}>{a.message}</Text></View></View>)}</View>}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, cc: { padding: S.xl }, title: { fontSize: F.t1, fontWeight: '900', color: C.pri, marginBottom: S.xl },
  card: { backgroundColor: C.card, borderRadius: R.lg, padding: S.lg, marginBottom: S.lg }, cH: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginBottom: S.lg }, cT: { fontSize: F.lg, fontWeight: '700', color: C.text },
  finR: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: S.lg }, finI: { alignItems: 'center' }, finL: { fontSize: F.xs, color: C.text3, textTransform: 'uppercase', letterSpacing: 0.5 }, finV: { fontSize: F.xl, fontWeight: '800', color: C.text, marginTop: 2 },
  bkR: { flexDirection: 'row', alignItems: 'center', marginBottom: S.md }, bkL: { fontSize: F.sm, fontWeight: '600', color: C.text }, bkA: { fontSize: F.xs, color: C.text3 }, bkP: { fontSize: F.xs, fontWeight: '600', color: C.text3, width: 30, textAlign: 'right' },
  pjL: { fontSize: F.sm, fontWeight: '600', color: C.text, marginBottom: 4 }, pjP: { fontSize: F.sm, fontWeight: '700', color: C.text, width: 30, textAlign: 'right' },
  hG: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md }, hI: { width: '47%', borderRadius: R.md, padding: S.md, alignItems: 'center' }, hV: { fontSize: F.xl, fontWeight: '800', marginTop: 2 }, hL: { fontSize: F.xs, color: C.text3, marginTop: 2 },
  insC: { flexDirection: 'row', backgroundColor: C.card, borderRadius: R.sm, padding: S.md, marginBottom: S.sm }, insT: { fontSize: F.sm, fontWeight: '600', color: C.text }, insM: { fontSize: F.xs, color: C.text2, lineHeight: 16 },
});
