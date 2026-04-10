import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, S, F, R, SH } from '../lib/theme';
export default function Empty({ icon, title, msg, btn, onBtn }: { icon: any; title: string; msg: string; btn?: string; onBtn?: () => void }) {
  return <View style={s.c}><View style={s.iw}><Ionicons name={icon} size={48} color={C.text3} /></View><Text style={s.t}>{title}</Text><Text style={s.m}>{msg}</Text>{btn && onBtn && <TouchableOpacity style={s.b} onPress={onBtn} activeOpacity={0.8}><Ionicons name="add" size={18} color="#FFF" /><Text style={s.bt}>{btn}</Text></TouchableOpacity>}</View>;
}
const s = StyleSheet.create({ c: { alignItems: 'center', justifyContent: 'center', padding: S.xxxl, minHeight: 280 }, iw: { width: 88, height: 88, borderRadius: 44, backgroundColor: C.brdL, alignItems: 'center', justifyContent: 'center', marginBottom: S.xl }, t: { fontSize: F.xl, fontWeight: '700', color: C.text2, marginBottom: S.sm, textAlign: 'center' }, m: { fontSize: F.md, color: C.text3, textAlign: 'center', lineHeight: 22, maxWidth: 280 }, b: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.priAccent, borderRadius: R.md, paddingHorizontal: S.xl, paddingVertical: S.md, marginTop: S.xxl, gap: S.sm, ...SH.md }, bt: { fontSize: F.md, fontWeight: '600', color: '#FFF' } });
