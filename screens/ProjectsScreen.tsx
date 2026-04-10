import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { C, S, R, F, SH } from '../lib/theme';
import { fmt, uid, today } from '../lib/helpers';
import { pStore } from '../lib/storage';
import { Project } from '../lib/types';
import PB from '../components/ProgressBar';
import Empty from '../components/EmptyState';
import FF from '../components/FormField';

export default function Projects({ navigation, route }: any) {
  const [data, setData] = useState<Project[]>([]);
  const [flt, setFlt] = useState('all');
  const [show, setShow] = useState(false);
  const [fm, setFm] = useState({ name: '', location: '', budget: '', description: '' });
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      const result = await pStore.all();
      setData(result);
    } catch (e: any) {
      setErr('Load error: ' + (e?.message || String(e)));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      if (route?.params?.openAdd) {
        setShow(true);
        navigation.setParams({ openAdd: false });
      }
    }, [load])
  );

  const fil = flt === 'all' ? data : data.filter(p => p.status === flt);

  const add = async () => {
    if (!fm.name.trim()) return;
    try {
      await pStore.add({
        id: uid(),
        name: fm.name.trim(),
        location: fm.location.trim(),
        status: 'active',
        budget: parseFloat(fm.budget) || 0,
        spent: 0,
        startDate: today(),
        endDate: '',
        phases: [],
        description: fm.description.trim(),
        createdAt: new Date().toISOString(),
      });
      setFm({ name: '', location: '', budget: '', description: '' });
      setShow(false);
      load();
    } catch (e: any) {
      setErr('Save error: ' + (e?.message || String(e)));
    }
  };

  if (err) {
    return (
      <SafeAreaView style={st.safe} edges={['top']}>
        <View style={{ padding: 20 }}>
          <Text style={{ color: 'red', fontSize: 16 }}>Error: {err}</Text>
          <TouchableOpacity onPress={() => { setErr(''); load(); }} style={{ marginTop: 20, padding: 12, backgroundColor: C.priAccent, borderRadius: 8 }}>
            <Text style={{ color: '#FFF', textAlign: 'center' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <View style={st.hdr}>
        <Text style={st.title}>Projects</Text>
        <TouchableOpacity style={[st.addB, SH.md]} onPress={() => setShow(true)} activeOpacity={0.8}>
          <Ionicons name="add" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {data.length > 0 && (
        <View style={st.fRow}>
          {['all', 'active', 'completed', 'on-hold'].map(f => (
            <TouchableOpacity key={f} style={[st.fBtn, flt === f && st.fA]} onPress={() => setFlt(f)}>
              <Text style={[st.fT, flt === f && st.fTA]}>
                {f === 'all' ? 'All' : f === 'on-hold' ? 'Hold' : f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        data={fil}
        keyExtractor={i => i.id}
        contentContainerStyle={st.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Empty
            icon="business-outline"
            title="No Projects"
            msg="Create your first project to start tracking."
            btn="New Project"
            onBtn={() => setShow(true)}
          />
        }
        renderItem={({ item }) => {
          const u = item.budget > 0 ? item.spent / item.budget : 0;
          return (
            <TouchableOpacity
              style={[st.card, SH.sm]}
              onPress={() => navigation.navigate('PDetail', { projectId: item.id })}
              activeOpacity={0.7}
            >
              <View style={st.cH}>
                <View style={st.cL}>
                  <View
                    style={[
                      st.dot,
                      {
                        backgroundColor:
                          item.status === 'active'
                            ? C.ok
                            : item.status === 'completed'
                            ? C.priAccent
                            : C.warn,
                      },
                    ]}
                  />
                  <Text style={st.cN} numberOfLines={1}>{item.name}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.text3} />
              </View>
              {item.location ? (
                <View style={st.loc}>
                  <Ionicons name="location-outline" size={13} color={C.text3} />
                  <Text style={st.locT}>{item.location}</Text>
                </View>
              ) : null}
              <PB progress={u} />
              <View style={st.vals}>
                <Text style={st.vl}>{fmt(item.spent)} spent</Text>
                <Text style={st.vr}>{fmt(item.budget)} budget</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* New Project Modal */}
      <Modal visible={show} animationType="slide" transparent>
        <KeyboardAvoidingView style={st.mo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[st.mc, SH.lg]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={st.mh}>
                <Text style={st.mt}>New Project</Text>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Ionicons name="close" size={24} color={C.text} />
                </TouchableOpacity>
              </View>
              <FF
                label="Project Name *"
                placeholder="e.g. Samarth Residency Tower A"
                value={fm.name}
                onChangeText={(v: string) => setFm(f => ({ ...f, name: v }))}
              />
              <FF
                label="Location"
                placeholder="e.g. Gangapur Road, Nashik"
                value={fm.location}
                onChangeText={(v: string) => setFm(f => ({ ...f, location: v }))}
              />
              <FF
                label="Budget (₹)"
                placeholder="e.g. 45000000"
                keyboardType="numeric"
                value={fm.budget}
                onChangeText={(v: string) => setFm(f => ({ ...f, budget: v }))}
              />
              <FF
                label="Description"
                placeholder="Brief description"
                multiline
                style={{ height: 80, textAlignVertical: 'top' }}
                value={fm.description}
                onChangeText={(v: string) => setFm(f => ({ ...f, description: v }))}
              />
              <TouchableOpacity
                style={[st.sub, !fm.name.trim() && { opacity: 0.4 }]}
                onPress={add}
                disabled={!fm.name.trim()}
                activeOpacity={0.85}
              >
                <Text style={st.subT}>Create Project</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  hdr: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: S.xl,
    paddingBottom: S.md,
  },
  title: { fontSize: F.t1, fontWeight: '900', color: C.pri },
  addB: {
    width: 42,
    height: 42,
    borderRadius: R.md,
    backgroundColor: C.priAccent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fRow: { flexDirection: 'row', paddingHorizontal: S.xl, marginBottom: S.md, gap: S.sm },
  fBtn: { paddingHorizontal: S.lg, paddingVertical: 8, borderRadius: R.full, backgroundColor: C.card },
  fA: { backgroundColor: C.pri },
  fT: { fontSize: F.sm, color: C.text2, fontWeight: '600' },
  fTA: { color: '#FFF' },
  list: { padding: S.xl, paddingTop: 0, flexGrow: 1 },
  card: { backgroundColor: C.card, borderRadius: R.lg, padding: S.lg, marginBottom: S.md },
  cH: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.sm },
  cL: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: S.sm },
  cN: { fontSize: F.lg, fontWeight: '700', color: C.text, flex: 1 },
  loc: { flexDirection: 'row', alignItems: 'center', marginBottom: S.md },
  locT: { fontSize: F.sm, color: C.text3, marginLeft: 4 },
  vals: { flexDirection: 'row', justifyContent: 'space-between', marginTop: S.sm },
  vl: { fontSize: F.xs, color: C.text2 },
  vr: { fontSize: F.xs, color: C.text3 },
  mo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  mc: {
    backgroundColor: C.card,
    borderTopLeftRadius: R.xxl,
    borderTopRightRadius: R.xxl,
    padding: S.xxl,
    maxHeight: '90%',
  },
  mh: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.xxl },
  mt: { fontSize: F.xxl, fontWeight: '800', color: C.pri },
  sub: { alignItems: 'center', backgroundColor: C.priAccent, borderRadius: R.md, paddingVertical: 16, marginTop: S.md },
  subT: { fontSize: F.lg, fontWeight: '700', color: '#FFF' },
});
