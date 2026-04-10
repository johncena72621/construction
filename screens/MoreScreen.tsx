import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { C, S, R, F, SH } from '../lib/theme';
import { fmt, genAlerts } from '../lib/helpers';
import { pStore, mStore, tStore, iStore, wStore, dStore, getCo } from '../lib/storage';
import { Project, Material, Transaction, Invoice, Worker, Delivery } from '../lib/types';
import PB from '../components/ProgressBar';

export default function MoreScreen({ navigation }: any) {
  const [co, setCo] = useState('');
  const [P, sP] = useState<Project[]>([]);
  const [M, sM] = useState<Material[]>([]);
  const [T, sT] = useState<Transaction[]>([]);
  const [I, sI] = useState<Invoice[]>([]);
  const [W, sW] = useState<Worker[]>([]);
  const [D, sD] = useState<Delivery[]>([]);

  const load = useCallback(async () => {
    const [p, m, t, i, w, d, c] = await Promise.all([pStore.all(), mStore.all(), tStore.all(), iStore.all(), wStore.all(), dStore.all(), getCo()]);
    sP(p); sM(m); sT(t); sI(i); sW(w); sD(d); setCo(c);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const tB = P.reduce((s, p) => s + p.budget, 0);
  const tS = P.reduce((s, p) => s + p.spent, 0);
  const lowStock = M.filter(m => m.currentStock <= m.minStock && m.minStock > 0).length;
  const pendingTx = T.filter(t => t.status === 'pending').length;
  const overdueInv = I.filter(i => i.status === 'overdue').length;
  const activeW = W.filter(w => w.status === 'active').length;
  const pendingDel = D.filter(d => d.status === 'expected' || d.status === 'in-transit').length;
  const alerts = genAlerts(P, M, I, T, D);
  const critAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'warning');

  const hasData = P.length > 0 || M.length > 0 || T.length > 0;

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <ScrollView contentContainerStyle={st.cc} showsVerticalScrollIndicator={false}>
        <Text style={st.title}>More</Text>
        <Text style={st.sub}>{co || 'BuildPro'}</Text>

        {/* Quick Analytics Summary */}
        {hasData && (
          <View style={[st.card, SH.md]}>
            <View style={st.cH}>
              <Ionicons name="analytics" size={18} color={C.priAccent} />
              <Text style={st.cT}>Quick Overview</Text>
            </View>
            <View style={st.quickGrid}>
              <View style={[st.qItem, { backgroundColor: C.priAccent + '10' }]}>
                <Text style={[st.qVal, { color: C.priAccent }]}>{fmt(tB)}</Text>
                <Text style={st.qLabel}>Total Budget</Text>
              </View>
              <View style={[st.qItem, { backgroundColor: C.gold + '15' }]}>
                <Text style={[st.qVal, { color: C.gold }]}>{fmt(tS)}</Text>
                <Text style={st.qLabel}>Total Spent</Text>
              </View>
              <View style={[st.qItem, { backgroundColor: tB - tS >= 0 ? C.ok + '15' : C.err + '15' }]}>
                <Text style={[st.qVal, { color: tB - tS >= 0 ? C.ok : C.err }]}>{fmt(Math.abs(tB - tS))}</Text>
                <Text style={st.qLabel}>{tB - tS >= 0 ? 'Remaining' : 'Over Budget'}</Text>
              </View>
              <View style={[st.qItem, { backgroundColor: C.err + '10' }]}>
                <Text style={[st.qVal, { color: C.err }]}>{lowStock}</Text>
                <Text style={st.qLabel}>Low Stock</Text>
              </View>
            </View>
            {tB > 0 && (
              <View style={{ marginTop: S.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={st.progLabel}>Budget Utilization</Text>
                  <Text style={[st.progPct, { color: tS / tB > 0.85 ? C.err : C.priAccent }]}>{((tS / tB) * 100).toFixed(1)}%</Text>
                </View>
                <PB progress={tS / tB} h={8} />
              </View>
            )}
          </View>
        )}

        {/* AI Alerts Banner */}
        {critAlerts.length > 0 && (
          <View style={[st.alertCard, SH.md]}>
            <View style={st.alertIcon}>
              <Ionicons name="sparkles" size={20} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={st.alertTitle}>{critAlerts.length} Smart Alert{critAlerts.length !== 1 ? 's' : ''}</Text>
              <Text style={st.alertMsg} numberOfLines={2}>{critAlerts[0].message}</Text>
            </View>
          </View>
        )}

        {/* Navigation Cards */}
        <Text style={st.secTitle}>Features</Text>

        <TouchableOpacity style={[st.navCard, SH.md]} onPress={() => navigation.navigate('Analytics')} activeOpacity={0.7}>
          <View style={[st.navIcon, { backgroundColor: C.priAccent + '15' }]}>
            <Ionicons name="analytics" size={24} color={C.priAccent} />
          </View>
          <View style={st.navContent}>
            <Text style={st.navTitle}>Analytics & Reports</Text>
            <Text style={st.navDesc}>Financial summary, cost breakdown, project comparison, AI insights</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={C.text3} />
        </TouchableOpacity>

        <TouchableOpacity style={[st.navCard, SH.md]} onPress={() => navigation.navigate('Deliveries')} activeOpacity={0.7}>
          <View style={[st.navIcon, { backgroundColor: C.info + '15' }]}>
            <Ionicons name="car" size={24} color={C.info} />
          </View>
          <View style={st.navContent}>
            <Text style={st.navTitle}>Deliveries</Text>
            <Text style={st.navDesc}>Geo-tagged material delivery tracking{pendingDel > 0 ? ` \u2022 ${pendingDel} pending` : ''}</Text>
          </View>
          {pendingDel > 0 && <View style={st.badge}><Text style={st.badgeT}>{pendingDel}</Text></View>}
          <Ionicons name="chevron-forward" size={20} color={C.text3} />
        </TouchableOpacity>

        <TouchableOpacity style={[st.navCard, SH.md]} onPress={() => navigation.navigate('SettingsDetail')} activeOpacity={0.7}>
          <View style={[st.navIcon, { backgroundColor: C.text3 + '15' }]}>
            <Ionicons name="settings" size={24} color={C.text2} />
          </View>
          <View style={st.navContent}>
            <Text style={st.navTitle}>Settings</Text>
            <Text style={st.navDesc}>Company profile, export data, reset</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={C.text3} />
        </TouchableOpacity>

        {/* Stats Summary */}
        {hasData && (
          <>
            <Text style={st.secTitle}>Data Summary</Text>
            <View style={st.statGrid}>
              {[
                { label: 'Projects', val: P.length, icon: 'business' as const, color: C.priAccent },
                { label: 'Materials', val: M.length, icon: 'cube' as const, color: C.gold },
                { label: 'Transactions', val: T.length, icon: 'card' as const, color: C.ok },
                { label: 'Invoices', val: I.length, icon: 'document-text' as const, color: C.purple },
                { label: 'Workers', val: activeW, icon: 'people' as const, color: C.info },
                { label: 'Deliveries', val: D.length, icon: 'car' as const, color: C.warn },
              ].map((s2, idx) => (
                <View key={idx} style={[st.statItem, SH.sm]}>
                  <Ionicons name={s2.icon} size={18} color={s2.color} />
                  <Text style={[st.statVal, { color: s2.color }]}>{s2.val}</Text>
                  <Text style={st.statLabel}>{s2.label}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  cc: { padding: S.xl },
  title: { fontSize: F.t1, fontWeight: '900', color: C.pri },
  sub: { fontSize: F.md, color: C.text3, marginTop: 2, marginBottom: S.xl },
  card: { backgroundColor: C.card, borderRadius: R.lg, padding: S.lg, marginBottom: S.lg },
  cH: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginBottom: S.md },
  cT: { fontSize: F.lg, fontWeight: '700', color: C.text },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  qItem: { width: '48%', borderRadius: R.md, padding: S.md, alignItems: 'center' },
  qVal: { fontSize: F.lg, fontWeight: '800' },
  qLabel: { fontSize: F.xs, color: C.text3, marginTop: 2 },
  progLabel: { fontSize: F.xs, color: C.text3 },
  progPct: { fontSize: F.xs, fontWeight: '700' },
  alertCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.purple, borderRadius: R.lg, padding: S.lg, marginBottom: S.lg },
  alertIcon: { width: 40, height: 40, borderRadius: R.md, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: S.md },
  alertTitle: { fontSize: F.sm, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  alertMsg: { fontSize: F.md, color: '#FFF', lineHeight: 20, marginTop: 2 },
  secTitle: { fontSize: F.lg, fontWeight: '700', color: C.text, marginBottom: S.md, marginTop: S.sm },
  navCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: R.lg, padding: S.lg, marginBottom: S.md },
  navIcon: { width: 48, height: 48, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', marginRight: S.lg },
  navContent: { flex: 1 },
  navTitle: { fontSize: F.md, fontWeight: '700', color: C.text },
  navDesc: { fontSize: F.sm, color: C.text3, marginTop: 2, lineHeight: 18 },
  badge: { backgroundColor: C.err, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', marginRight: S.sm, paddingHorizontal: 6 },
  badgeT: { fontSize: 10, fontWeight: '700', color: '#FFF' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  statItem: { width: '31%', backgroundColor: C.card, borderRadius: R.md, padding: S.md, alignItems: 'center' },
  statVal: { fontSize: F.xl, fontWeight: '800', marginTop: S.xs },
  statLabel: { fontSize: F.xs, color: C.text3, marginTop: 2 },
});
