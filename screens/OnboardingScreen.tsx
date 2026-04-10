import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, S, R, F, SH } from '../lib/theme';
import { setCo, setOnb } from '../lib/storage';

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const [step, setStep] = useState(0);
  const finish = async () => { await setCo(name.trim() || 'My Company'); await setOnb(true); onDone(); };
  const features = [
    ['scan-outline', 'QR/Barcode Scanning & Tracking'],
    ['cube-outline', 'Real-time Inventory Management'],
    ['card-outline', 'UPI, Bank & Gateway Payments'],
    ['document-text-outline', 'Auto Invoice with GST & Reconciliation'],
    ['sparkles-outline', 'AI Demand Forecasting'],
    ['location-outline', 'Geo-tagged Delivery Tracking'],
    ['analytics-outline', 'Financial Analytics Dashboard'],
    ['notifications-outline', 'Smart Alerts & Notifications'],
  ];
  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {step === 0 ? (
            <View style={s.center}>
              <View style={s.logoBg}><View style={s.logoInner}><Ionicons name="business" size={44} color="#FFF" /></View></View>
              <Text style={s.brand}>BuildPro</Text>
              <Text style={s.tagline}>Construction Management Platform</Text>
              <View style={s.divider} />
              {features.map(([ic, tx], i) => (
                <View key={i} style={s.fRow}>
                  <View style={s.fDot}><Ionicons name={ic as any} size={18} color={C.priAccent} /></View>
                  <Text style={s.fText}>{tx}</Text>
                </View>
              ))}
              <TouchableOpacity style={[s.btn, SH.lg]} onPress={() => setStep(1)} activeOpacity={0.85}>
                <Text style={s.btnT}>Get Started</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.center}>
              <View style={s.logoBg}><View style={s.logoInner}><Ionicons name="person" size={36} color="#FFF" /></View></View>
              <Text style={s.stepT}>Your Company</Text>
              <Text style={s.stepS}>This name appears across the app</Text>
              <TextInput style={s.input} placeholder="e.g. Samarth Developers" placeholderTextColor={C.text3} value={name} onChangeText={setName} autoFocus returnKeyType="done" onSubmitEditing={finish} />
              <TouchableOpacity style={[s.btn, SH.lg, !name.trim() && { opacity: 0.4 }]} onPress={finish} disabled={!name.trim()} activeOpacity={0.85}>
                <Text style={s.btnT}>Launch App</Text>
                <Ionicons name="rocket" size={20} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setStep(0)} style={s.back}>
                <Ionicons name="arrow-back" size={16} color={C.text3} /><Text style={s.backT}>Back</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: S.xxl },
  center: { alignItems: 'center' },
  logoBg: { width: 100, height: 100, borderRadius: 28, backgroundColor: C.priAccent + '15', alignItems: 'center', justifyContent: 'center', marginBottom: S.xxl },
  logoInner: { width: 64, height: 64, borderRadius: 18, backgroundColor: C.priAccent, alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 38, fontWeight: '900', color: C.pri, letterSpacing: -1 },
  tagline: { fontSize: F.lg, color: C.text2, marginTop: 4, marginBottom: S.xl },
  divider: { width: 40, height: 3, backgroundColor: C.priAccent, borderRadius: 2, marginBottom: S.xxl },
  fRow: { flexDirection: 'row', alignItems: 'center', marginBottom: S.lg, width: '100%' },
  fDot: { width: 36, height: 36, borderRadius: R.sm, backgroundColor: C.priAccent + '12', alignItems: 'center', justifyContent: 'center', marginRight: S.md },
  fText: { fontSize: F.md, color: C.text, fontWeight: '500', flex: 1 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.priAccent, borderRadius: R.md, paddingVertical: 16, paddingHorizontal: S.xxxl, gap: S.sm, width: '100%', marginTop: S.xxl },
  btnT: { fontSize: F.lg, fontWeight: '700', color: '#FFF' },
  stepT: { fontSize: F.t1, fontWeight: '800', color: C.pri, marginBottom: S.sm },
  stepS: { fontSize: F.md, color: C.text2, marginBottom: S.xxxl },
  input: { width: '100%', backgroundColor: C.card, borderRadius: R.md, paddingHorizontal: S.xl, paddingVertical: 16, fontSize: F.xl, color: C.text, borderWidth: 2, borderColor: C.brd, marginBottom: S.lg, ...SH.sm },
  back: { flexDirection: 'row', alignItems: 'center', marginTop: S.xxl, gap: S.xs },
  backT: { fontSize: F.md, color: C.text3 },
});
