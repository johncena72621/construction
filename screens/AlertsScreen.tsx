import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, S, R, F, SH } from '../lib/theme';
import { fmtD } from '../lib/helpers';
import { AppAlert } from '../lib/types';
import Empty from '../components/EmptyState';

export default function Alerts({ route, navigation }: any) {
  const alerts: AppAlert[] = route?.params?.alerts || [];
  const cfg: Record<string, any> = { critical: { c: C.err, bg: C.errL, ic: 'alert-circle' }, warning: { c: C.warn, bg: C.warnL, ic: 'warning' }, info: { c: C.info, bg: C.infoL, ic: 'information-circle' } };
  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <View style={st.hdr}><TouchableOpacity onPress={() => navigation.goBack()} style={st.back}><Ionicons name="arrow-back" size={24} color={C.text} /></TouchableOpacity><Text style={st.title}>Alerts</Text><Text style={st.cnt}>{alerts.length}</Text></View>
      <FlatList data={alerts} keyExtractor={i => i.id} contentContainerStyle={st.list} showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Empty icon="notifications-off-outline" title="All Clear" msg="No alerts right now." />}
        renderItem={({ item }) => { const cf = cfg[item.severity] || cfg.info; return (
          <View style={[st.aC, SH.sm, { borderLeftColor: cf.c }]}>
            <View style={[st.aI, { backgroundColor: cf.bg }]}><Ionicons name={item.type === 'ai-insight' ? 'sparkles' : item.type === 'reconciliation' ? 'checkmark-done' : cf.ic} size={18} color={cf.c} /></View>
            <View style={{ flex: 1 }}>
              <View style={st.tR}><Text style={st.aT}>{item.title}</Text>{item.type === 'ai-insight' && <View style={st.aiB}><Text style={st.aiT}>AI</Text></View>}</View>
              <Text style={st.aM}>{item.message}</Text>
              <Text style={st.aD}>{fmtD(item.date)}</Text>
            </View>
          </View>
        ); }} />
    </SafeAreaView>
  );
}
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, hdr: { flexDirection: 'row', alignItems: 'center', padding: S.xl, paddingBottom: S.md }, back: { marginRight: S.md }, title: { fontSize: F.xxl, fontWeight: '800', color: C.pri, flex: 1 }, cnt: { fontSize: F.sm, fontWeight: '700', color: C.priAccent, backgroundColor: C.priAccent + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.full },
  list: { padding: S.xl, paddingTop: S.sm },
  aC: { flexDirection: 'row', backgroundColor: C.card, borderRadius: R.md, padding: S.lg, marginBottom: S.md, borderLeftWidth: 4 },
  aI: { width: 38, height: 38, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center', marginRight: S.md },
  tR: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginBottom: 4 },
  aT: { fontSize: F.md, fontWeight: '700', color: C.text, flex: 1 },
  aiB: { backgroundColor: C.purple, borderRadius: R.sm, paddingHorizontal: 6, paddingVertical: 2 },
  aiT: { fontSize: 9, fontWeight: '800', color: '#FFF' },
  aM: { fontSize: F.sm, color: C.text2, lineHeight: 18, marginBottom: S.xs },
  aD: { fontSize: F.xs, color: C.text3 },
});
