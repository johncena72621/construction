import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { C, S, R, F, SH } from '../lib/theme';
import { fmt, fmtD, genAlerts } from '../lib/helpers';
import { pStore, mStore, tStore, iStore, wStore, dStore, getCo } from '../lib/storage';
import { Project, Material, Transaction, Invoice, Worker, Delivery, AppAlert } from '../lib/types';
import SC from '../components/StatCard';
import PB from '../components/ProgressBar';
import Empty from '../components/EmptyState';

export default function Dashboard({ navigation }: any) {
  const [ref, setRef] = useState(false);
  const [co, setCo] = useState('');
  const [P, setP] = useState<Project[]>([]);
  const [M, setM] = useState<Material[]>([]);
  const [T, setT] = useState<Transaction[]>([]);
  const [I, setI] = useState<Invoice[]>([]);
  const [W, setW] = useState<Worker[]>([]);
  const [D, setD] = useState<Delivery[]>([]);
  const [alerts, setAlerts] = useState<AppAlert[]>([]);
  const load = useCallback(async () => {
    const [p, m, t, i, w, d, c] = await Promise.all([pStore.all(), mStore.all(), tStore.all(), iStore.all(), wStore.all(), dStore.all(), getCo()]);
    setP(p); setM(m); setT(t); setI(i); setW(w); setD(d); setCo(c); setAlerts(genAlerts(p, m, i, t, d));
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRef = useCallback(async () => { setRef(true); await load(); setRef(false); }, [load]);
  const tBud = P.reduce((s, p) => s + p.budget, 0);
  const tSp = P.reduce((s, p) => s + p.spent, 0);
  const pend = T.filter(t => t.status === 'pending' && t.type === 'payment').reduce((s, t) => s + t.amount, 0);
  const lowS = M.filter(m => m.currentStock <= m.minStock && m.minStock > 0);
  const actP = P.filter(p => p.status === 'active');
  const crit = alerts.filter(a => a.severity === 'critical' || a.severity === 'warning');
  const has = P.length > 0 || M.length > 0 || T.length > 0;
  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <ScrollView contentContainerStyle={st.cc} refreshControl={<RefreshControl refreshing={ref} onRefresh={onRef} tintColor={C.priAccent} />} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={st.hdr}>
          <View style={{ flex: 1 }}>
            <Text style={st.hi}>Welcome back</Text>
            <Text style={st.co}>{co || 'BuildPro'}</Text>
          </View>
          <TouchableOpacity style={[st.scanBtn, SH.sm]} onPress={() => navigation.navigate('Scanner')} activeOpacity={0.8}>
            <Ionicons name="scan" size={22} color={C.priAccent} />
          </TouchableOpacity>
          <TouchableOpacity style={[st.bellBtn, SH.sm]} onPress={() => navigation.navigate('Alerts', { alerts })} activeOpacity={0.8}>
            <Ionicons name="notifications" size={22} color={C.pri} />
            {crit.length > 0 && <View style={st.badge}><Text style={st.badgeT}>{crit.length}</Text></View>}
          </TouchableOpacity>
        </View>
        {!has ? <Empty icon="rocket-outline" title="Let's Get Started" msg="Add your first project, material, or payment to activate your dashboard." btn="Add Project" onBtn={() => navigation.navigate('ProjectsTab', { screen: 'PList', params: { openAdd: true } })} /> : (
          <>
            {/* Stats */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.xl, paddingHorizontal: S.xl, marginBottom: S.xl }}>
              <SC title="Budget" value={tBud > 0 ? fmt(tBud) : '\u20B90'} sub={`${P.length} project(s)`} icon="wallet" color={C.priAccent} bg={C.priAccent + '12'} />
              <SC title="Spent" value={fmt(tSp)} sub={tBud > 0 ? `${((tSp / tBud) * 100).toFixed(0)}%` : '-'} icon="trending-up" color={C.gold} bg={C.warnL} />
              <SC title="Pending" value={fmt(pend)} sub={`${T.filter(t => t.status === 'pending').length} txn`} icon="time" color={C.err} bg={C.errL} />
              <SC title="Workers" value={String(W.filter(w => w.status === 'active').length)} sub="Active" icon="people" color={C.purple} bg={C.purpleL} />
            </ScrollView>
            {/* Alert Banner */}
            {crit.length > 0 && (
              <TouchableOpacity style={[st.alertB, SH.md]} onPress={() => navigation.navigate('Alerts', { alerts })} activeOpacity={0.85}>
                <View style={st.alertI}><Ionicons name="sparkles" size={20} color="#FFF" /></View>
                <View style={{ flex: 1 }}><Text style={st.alertT}>{crit.length} Smart Alert{crit.length !== 1 ? 's' : ''}</Text><Text style={st.alertM} numberOfLines={2}>{crit[0].message}</Text></View>
                <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            )}
            {/* Quick Actions */}
            <View style={st.qaRow}>
              {[['scan', 'Scan QR', 'Scanner'], ['add-circle', 'New Payment', 'Payments'], ['document-text', 'Invoice', 'Invoices'], ['cube', 'Inventory', 'Inventory']].map(([ic, lb, nav], i) => (
                <TouchableOpacity key={i} style={[st.qaBtn, SH.sm]} onPress={() => navigation.navigate(nav as any)} activeOpacity={0.8}>
                  <View style={[st.qaIcon, { backgroundColor: [C.priAccent, C.ok, C.gold, C.purple][i] + '15' }]}><Ionicons name={ic as any} size={20} color={[C.priAccent, C.ok, C.gold, C.purple][i]} /></View>
                  <Text style={st.qaLb}>{lb}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Projects */}
            {P.length > 0 && <><View style={st.secH}><Text style={st.sec}>Projects</Text><TouchableOpacity onPress={() => navigation.navigate('ProjectsTab')}><Text style={st.seeAll}>See All</Text></TouchableOpacity></View>
            {P.slice(0, 3).map(p => { const u = p.budget > 0 ? p.spent / p.budget : 0; return (
              <TouchableOpacity key={p.id} style={[st.pCard, SH.sm]} onPress={() => navigation.navigate('ProjectsTab', { screen: 'PDetail', params: { projectId: p.id } })} activeOpacity={0.7}>
                <View style={st.pH}><View style={st.pL}><View style={[st.dot, { backgroundColor: p.status === 'active' ? C.ok : p.status === 'completed' ? C.priAccent : C.warn }]} /><Text style={st.pN} numberOfLines={1}>{p.name}</Text></View><Text style={[st.pPct, { color: u > 0.85 ? C.err : u > 0.65 ? C.warn : C.ok }]}>{(u * 100).toFixed(0)}%</Text></View>
                <PB progress={u} />
                <View style={st.pV}><Text style={st.pS}>{fmt(p.spent)}</Text><Text style={st.pB}>of {fmt(p.budget)}</Text></View>
              </TouchableOpacity>
            ); })}</>}
            {/* Recent Tx */}
            {T.length > 0 && <><Text style={st.sec}>Recent Transactions</Text>
            {T.slice(0, 4).map(tx => (
              <View key={tx.id} style={[st.txC, SH.sm]}>
                <View style={[st.txI, { backgroundColor: tx.type === 'receipt' ? C.okL : C.priAccent + '12' }]}><Ionicons name={tx.type === 'receipt' ? 'arrow-down' : 'arrow-up'} size={16} color={tx.type === 'receipt' ? C.ok : C.priAccent} /></View>
                <View style={{ flex: 1 }}><Text style={st.txD} numberOfLines={1}>{tx.description || tx.payee}</Text><Text style={st.txM}>{tx.payee} \u2022 {fmtD(tx.date)}</Text></View>
                <Text style={[st.txA, { color: tx.type === 'receipt' ? C.ok : C.text }]}>{tx.type === 'receipt' ? '+' : '-'}{fmt(tx.amount)}</Text>
              </View>
            ))}</>}
            {/* Low Stock */}
            {lowS.length > 0 && <><Text style={st.sec}>Low Stock</Text><View style={[st.lsW, SH.sm]}>{lowS.slice(0, 4).map(m => <View key={m.id} style={st.lsR}><Ionicons name="warning" size={14} color={C.err} /><Text style={st.lsN}>{m.name}</Text><Text style={st.lsQ}>{m.currentStock}/{m.minStock} {m.unit}</Text></View>)}</View></>}
          </>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, cc: { padding: S.xl },
  hdr: { flexDirection: 'row', alignItems: 'center', marginBottom: S.xl },
  hi: { fontSize: F.sm, color: C.text3, textTransform: 'uppercase', letterSpacing: 1 },
  co: { fontSize: F.t1, fontWeight: '900', color: C.pri, marginTop: 2 },
  scanBtn: { width: 44, height: 44, borderRadius: R.md, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', marginRight: S.sm },
  bellBtn: { width: 44, height: 44, borderRadius: R.md, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 6, right: 6, backgroundColor: C.err, borderRadius: 7, minWidth: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  badgeT: { fontSize: 9, fontWeight: '800', color: '#FFF' },
  alertB: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.pri, borderRadius: R.lg, padding: S.lg, marginBottom: S.xl },
  alertI: { width: 36, height: 36, borderRadius: R.sm, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: S.md },
  alertT: { fontSize: F.xs, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5 },
  alertM: { fontSize: F.md, color: '#FFF', lineHeight: 20, marginTop: 2 },
  qaRow: { flexDirection: 'row', gap: S.sm, marginBottom: S.xl },
  qaBtn: { flex: 1, backgroundColor: C.card, borderRadius: R.md, padding: S.md, alignItems: 'center' },
  qaIcon: { width: 36, height: 36, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center', marginBottom: S.sm },
  qaLb: { fontSize: F.xs, fontWeight: '600', color: C.text2, textAlign: 'center' },
  secH: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.md },
  sec: { fontSize: F.lg, fontWeight: '700', color: C.pri, marginBottom: S.md },
  seeAll: { fontSize: F.sm, fontWeight: '600', color: C.priAccent },
  pCard: { backgroundColor: C.card, borderRadius: R.md, padding: S.lg, marginBottom: S.md },
  pH: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.sm },
  pL: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: S.sm },
  pN: { fontSize: F.md, fontWeight: '600', color: C.text, flex: 1 },
  pPct: { fontSize: F.md, fontWeight: '800' },
  pV: { flexDirection: 'row', justifyContent: 'space-between', marginTop: S.xs },
  pS: { fontSize: F.xs, color: C.text2 }, pB: { fontSize: F.xs, color: C.text3 },
  txC: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: R.md, padding: S.md, marginBottom: S.sm },
  txI: { width: 36, height: 36, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center', marginRight: S.md },
  txD: { fontSize: F.md, fontWeight: '500', color: C.text },
  txM: { fontSize: F.xs, color: C.text3, marginTop: 1 },
  txA: { fontSize: F.md, fontWeight: '700', marginLeft: S.sm },
  lsW: { backgroundColor: C.card, borderRadius: R.md, padding: S.md, marginBottom: S.md },
  lsR: { flexDirection: 'row', alignItems: 'center', paddingVertical: S.sm, gap: S.sm },
  lsN: { flex: 1, fontSize: F.md, fontWeight: '500', color: C.text },
  lsQ: { fontSize: F.sm, fontWeight: '600', color: C.err },
});
