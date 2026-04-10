import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, S, R, F, SH } from '../lib/theme';
export default function SC({ title, value, sub, icon, color, bg }: { title: string; value: string; sub?: string; icon: any; color: string; bg: string }) {
  return <View style={[s.c, SH.md]}><View style={[s.iw, { backgroundColor: bg }]}><Ionicons name={icon} size={18} color={color} /></View><Text style={s.t}>{title}</Text><Text style={[s.v, { color }]}>{value}</Text>{sub ? <Text style={s.s}>{sub}</Text> : null}</View>;
}
const s = StyleSheet.create({ c: { backgroundColor: C.card, borderRadius: R.lg, padding: S.lg, flex: 1, minWidth: 125, marginRight: S.md }, iw: { width: 34, height: 34, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center', marginBottom: S.sm }, t: { fontSize: F.xs, color: C.text3, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 }, v: { fontSize: F.xl, fontWeight: '800' }, s: { fontSize: F.xs, color: C.text3, marginTop: 2 } });
