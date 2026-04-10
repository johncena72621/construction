import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { C, S, R, F, SH } from '../lib/theme';
import { fmt, fmtD, uid, today } from '../lib/helpers';
import { pStore, mStore, tStore, wStore, dStore } from '../lib/storage';
import { Project, ProjectPhase, Material, Transaction, Worker, Delivery } from '../lib/types';
import PB from '../components/ProgressBar';
import FF from '../components/FormField';
import ConfirmModal from '../components/ConfirmModal';

const STATUS_FLOW: Delivery['status'][] = ['expected', 'in-transit', 'delivered'];
const DEL_COLORS: Record<string, { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  expected: { bg: C.infoL, fg: C.info, icon: 'time-outline' },
  'in-transit': { bg: C.warnL, fg: C.warn, icon: 'car-outline' },
  delivered: { bg: C.okL, fg: C.ok, icon: 'checkmark-circle' },
  cancelled: { bg: C.errL, fg: C.err, icon: 'close-circle' },
};

export default function PDetail({ route, navigation }: any) {
  const { projectId } = route.params;
  const [P, setP] = useState<Project | null>(null);
  const [mats, setMats] = useState<Material[]>([]);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [wks, setWks] = useState<Worker[]>([]);
  const [dels, setDels] = useState<Delivery[]>([]);
  const [showPh, setShowPh] = useState(false);
  const [showDel, setShowDel] = useState(false);
  const [showDelDetail, setShowDelDetail] = useState(false);
  const [selDel, setSelDel] = useState<Delivery | null>(null);
  const [phF, setPhF] = useState({ name: '', budget: '' });
  const [delF, setDelF] = useState({ materialName: '', supplier: '', quantity: '', unit: 'Units', expectedDate: '', geoAddress: '' });
  const [tab, setTab] = useState<'overview' | 'deliveries'>('overview');

  const load = useCallback(async () => {
    const ps = await pStore.all();
    setP(ps.find(x => x.id === projectId) || null);
    setMats((await mStore.all()).filter(m => m.projectId === projectId));
    setTxs((await tStore.all()).filter(t => t.projectId === projectId));
    setWks((await wStore.all()).filter(w => w.projectId === projectId));
    setDels((await dStore.all()).filter(d => d.projectId === projectId));
  }, [projectId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!P) return <View style={st.loadWrap}><Text style={st.loadTxt}>Loading...</Text></View>;

  const bu = P.budget > 0 ? P.spent / P.budget : 0;
  const rem = P.budget - P.spent;
  const labC = txs.filter(t => t.category === 'labor').reduce((s, t) => s + t.amount, 0);
  const matC = txs.filter(t => t.category === 'material' || t.category === 'supplier').reduce((s, t) => s + t.amount, 0);

  // Phase actions
  const addPh = async () => {
    if (!phF.name.trim()) return;
    const ph: ProjectPhase = { id: uid(), name: phF.name.trim(), budget: parseFloat(phF.budget) || 0, spent: 0, status: 'pending' };
    const up = { ...P, phases: [...P.phases, ph] };
    await pStore.upd(up); setP(up); setPhF({ name: '', budget: '' }); setShowPh(false);
  };
  const togPh = async (pid: string) => {
    const phases = P.phases.map(ph => ph.id !== pid ? ph : { ...ph, status: (ph.status === 'pending' ? 'in-progress' : ph.status === 'in-progress' ? 'completed' : 'pending') as any });
    const up = { ...P, phases }; await pStore.upd(up); setP(up);
  };

  // Delivery actions
  const addDel = async () => {
    if (!delF.materialName.trim()) return;
    const d: Delivery = {
      id: uid(), materialId: '', materialName: delF.materialName.trim(),
      supplier: delF.supplier.trim(), quantity: parseFloat(delF.quantity) || 0,
      unit: delF.unit || 'Units', expectedDate: delF.expectedDate || today(),
      status: 'expected', geoAddress: delF.geoAddress.trim(),
      projectId: P.id, createdAt: new Date().toISOString(), driverName: '', driverPhone: '', vehicleNumber: '', pickupAddress: '', destAddress: '', trackingPoints: []
    };
    await dStore.add(d);
    setDelF({ materialName: '', supplier: '', quantity: '', unit: 'Units', expectedDate: '', geoAddress: '' });
    setShowDel(false); load();
  };

  const advanceDelivery = async (d: Delivery) => {
    const idx = STATUS_FLOW.indexOf(d.status);
    if (idx < 0 || idx >= STATUS_FLOW.length - 1) return;
    const updated = { ...d, status: STATUS_FLOW[idx + 1] };
    await dStore.upd(updated); setSelDel(updated); load();
  };

  const cancelDelivery = async (d: Delivery) => {
    const updated = { ...d, status: 'cancelled' as const };
    await dStore.upd(updated); setSelDel(updated); load();
  };

  const deleteDelivery = async (d: Delivery) => {
    await dStore.del(d.id); setShowDelDetail(false); setSelDel(null); load();
  };

  // Project delete
  const [showDelConfirm, setShowDelConfirm] = useState(false);
  const doDel = async () => { setShowDelConfirm(false); await pStore.del(P.id); navigation.goBack(); };

  const pendingDels = dels.filter(d => d.status === 'expected' || d.status === 'in-transit');
  const completedDels = dels.filter(d => d.status === 'delivered');
  const cancelledDels = dels.filter(d => d.status === 'cancelled');

  return (
    <View style={st.container}>
      {/* Tab Switcher */}
      <View style={st.tabRow}>
        <TouchableOpacity style={[st.tabBtn, tab === 'overview' && st.tabActive]} onPress={() => setTab('overview')}>
          <Ionicons name="layers-outline" size={16} color={tab === 'overview' ? '#FFF' : C.text2} />
          <Text style={[st.tabTxt, tab === 'overview' && st.tabTxtA]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.tabBtn, tab === 'deliveries' && st.tabActive]} onPress={() => setTab('deliveries')}>
          <Ionicons name="car-outline" size={16} color={tab === 'deliveries' ? '#FFF' : C.text2} />
          <Text style={[st.tabTxt, tab === 'deliveries' && st.tabTxtA]}>Deliveries</Text>
          {pendingDels.length > 0 && <View style={st.tabBadge}><Text style={st.tabBadgeTxt}>{pendingDels.length}</Text></View>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        {tab === 'overview' ? (
          <>
            {/* Header Card */}
            <View style={[st.hCard, SH.md]}>
              <View style={st.hTop}>
                <TouchableOpacity onPress={() => { const ns = P.status === 'active' ? 'on-hold' : P.status === 'on-hold' ? 'completed' : 'active'; const up = { ...P, status: ns as any }; pStore.upd(up); setP(up); }} style={[st.sBadge, { backgroundColor: P.status === 'active' ? C.okL : P.status === 'completed' ? C.infoL : C.warnL }]}>
                  <Text style={[st.sT, { color: P.status === 'active' ? C.ok : P.status === 'completed' ? C.info : C.warn }]}>{P.status.toUpperCase()}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowDelConfirm(true)}>
                  <Ionicons name="trash-outline" size={20} color={C.err} />
                </TouchableOpacity>
              </View>
              <Text style={st.pN}>{P.name}</Text>
              {P.location ? <View style={st.locRow}><Ionicons name="location" size={13} color={C.text3} /><Text style={st.locTxt}>{P.location}</Text></View> : null}
              {P.description ? <Text style={st.desc}>{P.description}</Text> : null}
            </View>

            {/* Budget Card */}
            <View style={[st.budCard, SH.sm]}>
              <View style={st.budRow}>
                <View><Text style={st.budLabel}>Budget</Text><Text style={st.budVal}>{fmt(P.budget)}</Text></View>
                <View style={{ alignItems: 'flex-end' }}><Text style={st.budLabel}>Remaining</Text><Text style={[st.budVal, { color: rem >= 0 ? C.ok : C.err }]}>{fmt(Math.abs(rem))}{rem < 0 ? ' over' : ''}</Text></View>
              </View>
              <View style={{ marginBottom: S.md }}>
                <View style={st.prgRow}><Text style={st.budLabel}>Utilized</Text><Text style={[st.prgPct, { color: bu > 0.85 ? C.err : C.priAccent }]}>{(bu * 100).toFixed(1)}%</Text></View>
                <PB progress={bu} h={10} />
              </View>
              {(labC > 0 || matC > 0) && (
                <View style={st.costRow}>
                  <View style={st.costItem}><View style={[st.costDot, { backgroundColor: C.info }]} /><Text style={st.costTxt}>Labor {fmt(labC)}</Text></View>
                  <View style={st.costItem}><View style={[st.costDot, { backgroundColor: C.gold }]} /><Text style={st.costTxt}>Material {fmt(matC)}</Text></View>
                </View>
              )}
            </View>

            {/* Quick Delivery Summary */}
            {dels.length > 0 && (
              <TouchableOpacity style={[st.delSummary, SH.sm]} onPress={() => setTab('deliveries')} activeOpacity={0.7}>
                <View style={st.delSumLeft}>
                  <Ionicons name="car" size={20} color={C.priAccent} />
                  <View style={{ marginLeft: S.md }}>
                    <Text style={st.delSumTitle}>{dels.length} Delivery Record{dels.length !== 1 ? 's' : ''}</Text>
                    <Text style={st.delSumSub}>{pendingDels.length} pending \u2022 {completedDels.length} delivered</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.text3} />
              </TouchableOpacity>
            )}

            {/* Phases */}
            <View style={st.secHeader}>
              <Text style={st.sec}>Phases ({P.phases.length})</Text>
              <TouchableOpacity onPress={() => setShowPh(true)}><Ionicons name="add-circle" size={24} color={C.priAccent} /></TouchableOpacity>
            </View>
            {P.phases.length === 0 && <Text style={st.hint}>No phases yet. Tap + to add.</Text>}
            {P.phases.map(ph => {
              const pp = ph.budget > 0 ? ph.spent / ph.budget : 0;
              return (
                <TouchableOpacity key={ph.id} style={[st.phCard, SH.sm]} onPress={() => togPh(ph.id)} activeOpacity={0.7}>
                  <View style={st.phHeader}>
                    <View style={st.phLeft}>
                      <View style={[st.phDot, { backgroundColor: ph.status === 'completed' ? C.ok : ph.status === 'in-progress' ? C.gold : C.text3 }]} />
                      <Text style={st.phName}>{ph.name}</Text>
                    </View>
                    <Text style={[st.phStatus, { color: ph.status === 'completed' ? C.ok : ph.status === 'in-progress' ? C.gold : C.text3 }]}>{ph.status.replace('-', ' ')}</Text>
                  </View>
                  <PB progress={pp} h={5} />
                  <View style={st.phVals}><Text style={st.phTxt}>{fmt(ph.spent)}</Text><Text style={st.phTxt}>of {fmt(ph.budget)}</Text></View>
                </TouchableOpacity>
              );
            })}

            {/* Materials */}
            {mats.length > 0 && (
              <>
                <Text style={st.sec}>Materials ({mats.length})</Text>
                {mats.map(m => {
                  const low = m.currentStock <= m.minStock;
                  return (
                    <View key={m.id} style={[st.matCard, SH.sm, low && st.matLow]}>
                      <View style={st.matHeader}>
                        <Text style={st.matName}>{m.name}</Text>
                        {low && <View style={st.lowBadge}><Text style={st.lowTxt}>LOW</Text></View>}
                      </View>
                      <View style={st.matStats}>
                        <Text style={st.matStat}>{m.currentStock} {m.unit}</Text>
                        <Text style={st.matStatLight}>Daily: {m.dailyUsageRate}</Text>
                        <Text style={[st.matStat, { color: m.dailyUsageRate > 0 && m.currentStock / m.dailyUsageRate < 7 ? C.err : C.ok }]}>
                          {m.dailyUsageRate > 0 ? `~${Math.floor(m.currentStock / m.dailyUsageRate)}d` : '-'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </>
            )}

            {/* Workers */}
            {wks.length > 0 && (
              <>
                <Text style={st.sec}>Team ({wks.length})</Text>
                {wks.map(w => (
                  <View key={w.id} style={[st.wCard, SH.sm]}>
                    <View style={st.wAvatar}><Text style={st.wInit}>{w.name.charAt(0)}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.wName}>{w.name}</Text>
                      <Text style={st.wRole}>{w.role}</Text>
                    </View>
                    <Text style={st.wRate}>{fmt(w.rate)}<Text style={st.wPer}>/{w.type === 'daily' ? 'd' : w.type === 'weekly' ? 'wk' : 'mo'}</Text></Text>
                  </View>
                ))}
              </>
            )}
          </>
        ) : (
          /* ═══ DELIVERIES TAB ═══ */
          <>
            <View style={st.delHeader}>
              <Text style={st.delTitle}>Delivery Tracking</Text>
              <TouchableOpacity style={[st.addDelBtn, SH.sm]} onPress={() => setShowDel(true)} activeOpacity={0.8}>
                <Ionicons name="add" size={18} color="#FFF" />
                <Text style={st.addDelTxt}>New Delivery</Text>
              </TouchableOpacity>
            </View>

            {/* Delivery Stats */}
            <View style={st.delStatsRow}>
              {[
                { label: 'Expected', count: dels.filter(d => d.status === 'expected').length, color: C.info, bg: C.infoL },
                { label: 'In Transit', count: dels.filter(d => d.status === 'in-transit').length, color: C.warn, bg: C.warnL },
                { label: 'Delivered', count: completedDels.length, color: C.ok, bg: C.okL },
                { label: 'Cancelled', count: cancelledDels.length, color: C.err, bg: C.errL },
              ].map((s2, i) => (
                <View key={i} style={[st.delStatCard, { backgroundColor: s2.bg }]}>
                  <Text style={[st.delStatNum, { color: s2.color }]}>{s2.count}</Text>
                  <Text style={st.delStatLabel}>{s2.label}</Text>
                </View>
              ))}
            </View>

            {/* Active Deliveries */}
            {pendingDels.length > 0 && <Text style={st.delSecTitle}>Active ({pendingDels.length})</Text>}
            {pendingDels.map(d => {
              const dc = DEL_COLORS[d.status];
              return (
                <TouchableOpacity key={d.id} style={[st.delCard, SH.sm]} onPress={() => { setSelDel(d); setShowDelDetail(true); }} activeOpacity={0.7}>
                  <View style={[st.delIcon, { backgroundColor: dc.bg }]}>
                    <Ionicons name={dc.icon} size={22} color={dc.fg} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.delName}>{d.materialName}</Text>
                    <Text style={st.delInfo}>{d.quantity} {d.unit} \u2022 {d.supplier}</Text>
                    <View style={st.delMeta}>
                      <Ionicons name="calendar-outline" size={12} color={C.text3} />
                      <Text style={st.delDate}>{fmtD(d.expectedDate)}</Text>
                      {d.geoAddress ? <><Ionicons name="location-outline" size={12} color={C.priAccent} style={{ marginLeft: S.sm }} /><Text style={[st.delDate, { color: C.priAccent }]} numberOfLines={1}>{d.geoAddress}</Text></> : null}
                    </View>
                  </View>
                  <View style={[st.delStatusBadge, { backgroundColor: dc.bg }]}>
                    <Text style={[st.delStatusTxt, { color: dc.fg }]}>{d.status.replace('-', ' ')}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Completed Deliveries */}
            {completedDels.length > 0 && <Text style={st.delSecTitle}>Completed ({completedDels.length})</Text>}
            {completedDels.map(d => (
              <TouchableOpacity key={d.id} style={[st.delCard, SH.sm, { opacity: 0.7 }]} onPress={() => { setSelDel(d); setShowDelDetail(true); }}>
                <View style={[st.delIcon, { backgroundColor: C.okL }]}><Ionicons name="checkmark-circle" size={22} color={C.ok} /></View>
                <View style={{ flex: 1 }}><Text style={st.delName}>{d.materialName}</Text><Text style={st.delInfo}>{d.quantity} {d.unit} \u2022 {d.supplier}</Text></View>
                <Ionicons name="checkmark-done" size={20} color={C.ok} />
              </TouchableOpacity>
            ))}

            {/* Cancelled */}
            {cancelledDels.length > 0 && <Text style={st.delSecTitle}>Cancelled ({cancelledDels.length})</Text>}
            {cancelledDels.map(d => (
              <View key={d.id} style={[st.delCard, SH.sm, { opacity: 0.5 }]}>
                <View style={[st.delIcon, { backgroundColor: C.errL }]}><Ionicons name="close-circle" size={22} color={C.err} /></View>
                <View style={{ flex: 1 }}><Text style={[st.delName, { textDecorationLine: 'line-through' }]}>{d.materialName}</Text><Text style={st.delInfo}>{d.quantity} {d.unit}</Text></View>
              </View>
            ))}

            {dels.length === 0 && (
              <View style={st.emptyDel}>
                <Ionicons name="car-outline" size={48} color={C.text3} />
                <Text style={st.emptyDelTitle}>No Deliveries Yet</Text>
                <Text style={st.emptyDelMsg}>Track material deliveries with geo-tagging and real-time status updates.</Text>
                <TouchableOpacity style={[st.addDelBtn, SH.sm, { marginTop: S.xl }]} onPress={() => setShowDel(true)}>
                  <Ionicons name="add" size={18} color="#FFF" /><Text style={st.addDelTxt}>Schedule Delivery</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ═══ MODALS ═══ */}

      {/* Delete Project Confirm */}
      <ConfirmModal visible={showDelConfirm} title="Delete Project?" message={`Delete "${P.name}"? All data will be lost.`} confirmText="Delete" destructive icon="trash" onConfirm={doDel} onCancel={() => setShowDelConfirm(false)} />

      {/* Add Phase Modal */}
      <Modal visible={showPh} animationType="slide" transparent>
        <KeyboardAvoidingView style={st.mo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[st.mc, SH.lg]}>
            <View style={st.mh}><Text style={st.mtt}>Add Phase</Text><TouchableOpacity onPress={() => setShowPh(false)}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity></View>
            <FF label="Phase Name *" placeholder="e.g. Foundation" value={phF.name} onChangeText={(v: string) => setPhF(f => ({ ...f, name: v }))} />
            <FF label="Budget (\u20B9)" placeholder="8000000" keyboardType="numeric" value={phF.budget} onChangeText={(v: string) => setPhF(f => ({ ...f, budget: v }))} />
            <TouchableOpacity style={[st.subBtn, !phF.name.trim() && { opacity: 0.4 }]} onPress={addPh} disabled={!phF.name.trim()}>
              <Text style={st.subTxt}>Add Phase</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Delivery Modal */}
      <Modal visible={showDel} animationType="slide" transparent>
        <KeyboardAvoidingView style={st.mo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[st.mc, SH.lg]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={st.mh}><Text style={st.mtt}>Schedule Delivery</Text><TouchableOpacity onPress={() => setShowDel(false)}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity></View>
              <FF label="Material Name *" placeholder="e.g. OPC Cement 50kg" value={delF.materialName} onChangeText={(v: string) => setDelF(f => ({ ...f, materialName: v }))} />
              <FF label="Supplier" placeholder="Supplier name" value={delF.supplier} onChangeText={(v: string) => setDelF(f => ({ ...f, supplier: v }))} />
              <View style={st.row2}>
                <View style={{ flex: 1 }}><FF label="Quantity" placeholder="0" keyboardType="numeric" value={delF.quantity} onChangeText={(v: string) => setDelF(f => ({ ...f, quantity: v }))} /></View>
                <View style={{ flex: 1 }}><FF label="Unit" placeholder="Bags" value={delF.unit} onChangeText={(v: string) => setDelF(f => ({ ...f, unit: v }))} /></View>
              </View>
              <FF label="Expected Date (YYYY-MM-DD)" placeholder={today()} value={delF.expectedDate} onChangeText={(v: string) => setDelF(f => ({ ...f, expectedDate: v }))} />
              <FF label="Delivery Location / Address" placeholder="e.g. Site Gate, Gangapur Road" value={delF.geoAddress} onChangeText={(v: string) => setDelF(f => ({ ...f, geoAddress: v }))} />
              <TouchableOpacity style={[st.subBtn, !delF.materialName.trim() && { opacity: 0.4 }]} onPress={addDel} disabled={!delF.materialName.trim()}>
                <Ionicons name="car" size={18} color="#FFF" />
                <Text style={st.subTxt}>Schedule Delivery</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delivery Detail Modal */}
      <Modal visible={showDelDetail} animationType="slide" transparent>
        <View style={st.mo}>
          <View style={[st.mc, SH.lg]}>
            {selDel && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={st.mh}>
                  <Text style={st.mtt}>Delivery Details</Text>
                  <TouchableOpacity onPress={() => { setShowDelDetail(false); setSelDel(null); }}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity>
                </View>

                {/* Status Timeline */}
                <View style={st.timeline}>
                  {STATUS_FLOW.map((s2, i) => {
                    const isActive = STATUS_FLOW.indexOf(selDel.status) >= i;
                    const isCurrent = selDel.status === s2;
                    const dc = DEL_COLORS[s2];
                    return (
                      <View key={s2} style={st.tlStep}>
                        <View style={st.tlDotCol}>
                          <View style={[st.tlDot, isActive ? { backgroundColor: dc.fg } : { backgroundColor: C.brdL }]}>
                            {isActive && <Ionicons name={isCurrent ? dc.icon : 'checkmark'} size={14} color="#FFF" />}
                          </View>
                          {i < STATUS_FLOW.length - 1 && <View style={[st.tlLine, isActive ? { backgroundColor: dc.fg } : { backgroundColor: C.brdL }]} />}
                        </View>
                        <View style={st.tlContent}>
                          <Text style={[st.tlLabel, isActive && { color: C.text, fontWeight: '700' }]}>{s2.replace('-', ' ').toUpperCase()}</Text>
                          {isCurrent && <Text style={[st.tlSub, { color: dc.fg }]}>Current Status</Text>}
                        </View>
                      </View>
                    );
                  })}
                  {selDel.status === 'cancelled' && (
                    <View style={st.tlStep}>
                      <View style={st.tlDotCol}><View style={[st.tlDot, { backgroundColor: C.err }]}><Ionicons name="close" size={14} color="#FFF" /></View></View>
                      <View style={st.tlContent}><Text style={[st.tlLabel, { color: C.err, fontWeight: '700' }]}>CANCELLED</Text></View>
                    </View>
                  )}
                </View>

                {/* Details Grid */}
                <View style={st.detGrid}>
                  <View style={st.detItem}><Text style={st.detLabel}>Material</Text><Text style={st.detVal}>{selDel.materialName}</Text></View>
                  <View style={st.detItem}><Text style={st.detLabel}>Supplier</Text><Text style={st.detVal}>{selDel.supplier || '-'}</Text></View>
                  <View style={st.detItem}><Text style={st.detLabel}>Quantity</Text><Text style={st.detVal}>{selDel.quantity} {selDel.unit}</Text></View>
                  <View style={st.detItem}><Text style={st.detLabel}>Expected</Text><Text style={st.detVal}>{fmtD(selDel.expectedDate)}</Text></View>
                  {selDel.geoAddress ? <View style={[st.detItem, { width: '100%' }]}><Text style={st.detLabel}>Delivery Location</Text><View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}><Ionicons name="location" size={16} color={C.priAccent} /><Text style={[st.detVal, { marginLeft: 4, color: C.priAccent }]}>{selDel.geoAddress}</Text></View></View> : null}
                </View>

                {/* Action Buttons */}
                <View style={st.delActRow}>
                  {selDel.status !== 'delivered' && selDel.status !== 'cancelled' && (
                    <TouchableOpacity style={[st.delActBtn, { backgroundColor: C.priAccent }]} onPress={() => advanceDelivery(selDel)} activeOpacity={0.8}>
                      <Ionicons name={selDel.status === 'expected' ? 'car' : 'checkmark-circle'} size={18} color="#FFF" />
                      <Text style={st.delActTxt}>{selDel.status === 'expected' ? 'Mark In Transit' : 'Mark Delivered'}</Text>
                    </TouchableOpacity>
                  )}
                  {selDel.status !== 'delivered' && selDel.status !== 'cancelled' && (
                    <TouchableOpacity style={[st.delActBtn, { backgroundColor: C.err }]} onPress={() => cancelDelivery(selDel)} activeOpacity={0.8}>
                      <Ionicons name="close-circle" size={18} color="#FFF" />
                      <Text style={st.delActTxt}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={[st.delActBtn, { backgroundColor: C.brdL }]} onPress={() => deleteDelivery(selDel)} activeOpacity={0.8}>
                    <Ionicons name="trash" size={18} color={C.err} />
                    <Text style={[st.delActTxt, { color: C.err }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loadWrap: { flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' },
  loadTxt: { color: C.text3 },
  scroll: { padding: S.xl },

  // Tabs
  tabRow: { flexDirection: 'row', paddingHorizontal: S.xl, paddingTop: S.md, gap: S.sm },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: R.md, backgroundColor: C.card, gap: 6 },
  tabActive: { backgroundColor: C.pri },
  tabTxt: { fontSize: F.md, fontWeight: '600', color: C.text2 },
  tabTxtA: { color: '#FFF' },
  tabBadge: { backgroundColor: C.err, borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
  tabBadgeTxt: { fontSize: 10, fontWeight: '700', color: '#FFF' },

  // Header
  hCard: { backgroundColor: C.card, borderRadius: R.lg, padding: S.xl, marginBottom: S.lg },
  hTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.sm },
  sBadge: { paddingHorizontal: S.md, paddingVertical: 4, borderRadius: R.full },
  sT: { fontSize: F.xs, fontWeight: '700', letterSpacing: 0.5 },
  pN: { fontSize: F.xxl, fontWeight: '800', color: C.text },
  locRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  locTxt: { fontSize: F.sm, color: C.text3, marginLeft: 4 },
  desc: { fontSize: F.md, color: C.text2, lineHeight: 20, marginTop: S.sm },

  // Budget
  budCard: { backgroundColor: C.card, borderRadius: R.lg, padding: S.lg, marginBottom: S.md },
  budRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: S.lg },
  budLabel: { fontSize: F.sm, color: C.text3, marginBottom: 2 },
  budVal: { fontSize: F.xl, fontWeight: '800', color: C.text },
  prgRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  prgPct: { fontSize: F.sm, fontWeight: '700' },
  costRow: { flexDirection: 'row', gap: S.xl },
  costItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  costDot: { width: 8, height: 8, borderRadius: 4 },
  costTxt: { fontSize: F.sm, color: C.text2 },

  // Delivery Summary
  delSummary: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: R.lg, padding: S.lg, marginBottom: S.md },
  delSumLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  delSumTitle: { fontSize: F.md, fontWeight: '700', color: C.text },
  delSumSub: { fontSize: F.sm, color: C.text3, marginTop: 2 },

  // Sections
  sec: { fontSize: F.lg, fontWeight: '700', color: C.pri, marginBottom: S.md, marginTop: S.md },
  secHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: S.md, marginBottom: S.md },
  hint: { fontSize: F.md, color: C.text3, fontStyle: 'italic', marginBottom: S.md },

  // Phases
  phCard: { backgroundColor: C.card, borderRadius: R.md, padding: S.lg, marginBottom: S.sm },
  phHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: S.sm },
  phLeft: { flexDirection: 'row', alignItems: 'center' },
  phDot: { width: 8, height: 8, borderRadius: 4, marginRight: S.sm },
  phName: { fontSize: F.md, fontWeight: '600', color: C.text },
  phStatus: { fontSize: F.xs, fontWeight: '600', textTransform: 'capitalize' },
  phVals: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  phTxt: { fontSize: F.xs, color: C.text3 },

  // Materials
  matCard: { backgroundColor: C.card, borderRadius: R.md, padding: S.lg, marginBottom: S.sm },
  matLow: { borderLeftWidth: 3, borderLeftColor: C.err },
  matHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  matName: { fontSize: F.md, fontWeight: '600', color: C.text, flex: 1 },
  lowBadge: { backgroundColor: C.errL, borderRadius: R.sm, paddingHorizontal: 6, paddingVertical: 2 },
  lowTxt: { fontSize: F.xs, fontWeight: '700', color: C.err },
  matStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: S.sm },
  matStat: { fontSize: F.sm, color: C.text2 },
  matStatLight: { fontSize: F.sm, color: C.text3 },

  // Workers
  wCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: R.md, padding: S.md, marginBottom: S.sm },
  wAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.priAccent, alignItems: 'center', justifyContent: 'center', marginRight: S.md },
  wInit: { fontSize: F.lg, fontWeight: '700', color: '#FFF' },
  wName: { fontSize: F.md, fontWeight: '600', color: C.text },
  wRole: { fontSize: F.sm, color: C.text3 },
  wRate: { fontSize: F.md, fontWeight: '700', color: C.priAccent },
  wPer: { fontSize: F.xs, color: C.text3 },

  // ═══ DELIVERIES TAB ═══
  delHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.lg },
  delTitle: { fontSize: F.xl, fontWeight: '800', color: C.pri },
  addDelBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.priAccent, borderRadius: R.md, paddingHorizontal: S.lg, paddingVertical: S.sm, gap: 6 },
  addDelTxt: { fontSize: F.sm, fontWeight: '600', color: '#FFF' },

  delStatsRow: { flexDirection: 'row', gap: S.sm, marginBottom: S.lg },
  delStatCard: { flex: 1, borderRadius: R.md, padding: S.md, alignItems: 'center' },
  delStatNum: { fontSize: F.xxl, fontWeight: '800' },
  delStatLabel: { fontSize: F.xs, color: C.text2, marginTop: 2 },

  delSecTitle: { fontSize: F.md, fontWeight: '700', color: C.text2, marginBottom: S.sm, marginTop: S.md },

  delCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: R.lg, padding: S.lg, marginBottom: S.sm },
  delIcon: { width: 44, height: 44, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', marginRight: S.md },
  delName: { fontSize: F.md, fontWeight: '700', color: C.text },
  delInfo: { fontSize: F.sm, color: C.text2, marginTop: 2 },
  delMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  delDate: { fontSize: F.xs, color: C.text3 },
  delStatusBadge: { borderRadius: R.full, paddingHorizontal: 10, paddingVertical: 4 },
  delStatusTxt: { fontSize: F.xs, fontWeight: '700', textTransform: 'capitalize' },

  emptyDel: { alignItems: 'center', paddingVertical: S.xxxxl || 40 },
  emptyDelTitle: { fontSize: F.lg, fontWeight: '700', color: C.text2, marginTop: S.lg },
  emptyDelMsg: { fontSize: F.md, color: C.text3, textAlign: 'center', marginTop: S.sm, lineHeight: 22, maxWidth: 280 },

  // Timeline
  timeline: { marginBottom: S.xl },
  tlStep: { flexDirection: 'row', minHeight: 52 },
  tlDotCol: { alignItems: 'center', width: 32 },
  tlDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tlLine: { width: 3, flex: 1, marginVertical: 2 },
  tlContent: { flex: 1, marginLeft: S.md, paddingBottom: S.lg },
  tlLabel: { fontSize: F.md, color: C.text3, textTransform: 'capitalize' },
  tlSub: { fontSize: F.xs, fontWeight: '600', marginTop: 2 },

  // Detail Grid
  detGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md, marginBottom: S.xl },
  detItem: { width: '47%', backgroundColor: C.brdL, borderRadius: R.md, padding: S.md },
  detLabel: { fontSize: F.xs, color: C.text3 },
  detVal: { fontSize: F.md, fontWeight: '600', color: C.text, marginTop: 2 },

  // Delivery Actions
  delActRow: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  delActBtn: { flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: R.md, gap: 6 },
  delActTxt: { fontSize: F.md, fontWeight: '600', color: '#FFF' },

  // Modals
  mo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  mc: { backgroundColor: C.card, borderTopLeftRadius: R.xxl, borderTopRightRadius: R.xxl, padding: S.xxl, maxHeight: '90%' },
  mh: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.xxl },
  mtt: { fontSize: F.xxl, fontWeight: '800', color: C.pri },
  subBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.priAccent, borderRadius: R.md, paddingVertical: 16, marginTop: S.md, gap: S.sm },
  subTxt: { fontSize: F.lg, fontWeight: '700', color: '#FFF' },
  row2: { flexDirection: 'row', gap: S.md },
});
