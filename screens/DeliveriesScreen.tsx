import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView,
  KeyboardAvoidingView, Platform, Alert as RNAlert, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { C, S, R, F, SH } from '../lib/theme';
import { fmt, fmtD, uid, td } from '../lib/helpers';
import { dStore, pStore } from '../lib/storage';
import { Delivery, TrackingPoint, Project } from '../lib/types';
import Empty from '../components/EmptyState';
import FF from '../components/FormField';

const W = Dimensions.get('window').width;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LIVE MAP VISUALIZATION (Pure RN — no native map needed)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function LiveTrackMap({ delivery }: { delivery: Delivery }) {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const truckAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    // Animate truck position based on progress
    const progress = delivery.status === 'delivered' ? 1 :
      delivery.status === 'in-transit' ? 0.3 + Math.random() * 0.5 :
      delivery.status === 'picked-up' ? 0.1 : 0;
    Animated.spring(truckAnim, { toValue: progress, useNativeDriver: false, friction: 8 }).start();
  }, [delivery.status]);

  const isActive = delivery.status === 'in-transit' || delivery.status === 'picked-up';
  const isDone = delivery.status === 'delivered';
  const trackW = W - 80;

  const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });
  const truckLeft = truckAnim.interpolate({ inputRange: [0, 1], outputRange: [0, trackW - 36] });

  return (
    <View style={ms.container}>
      {/* Map-like background */}
      <View style={ms.mapBg}>
        <View style={ms.gridLine} />
        <View style={[ms.gridLine, { top: '33%' }]} />
        <View style={[ms.gridLine, { top: '66%' }]} />
        <View style={[ms.gridLineV, { left: '25%' }]} />
        <View style={[ms.gridLineV, { left: '50%' }]} />
        <View style={[ms.gridLineV, { left: '75%' }]} />
      </View>

      {/* Route line */}
      <View style={ms.routeWrap}>
        <View style={ms.routeLine}>
          <View style={[ms.routeFill, { width: isDone ? '100%' : isActive ? '60%' : '0%' }]} />
        </View>

        {/* Pickup dot */}
        <View style={[ms.dot, ms.pickupDot]}>
          <Ionicons name="cube" size={14} color="#FFF" />
        </View>

        {/* Destination dot */}
        <View style={[ms.dot, ms.destDot, isDone && { backgroundColor: C.ok }]}>
          <Ionicons name="location" size={14} color="#FFF" />
        </View>

        {/* Animated truck */}
        {(isActive || isDone) && (
          <Animated.View style={[ms.truck, { left: truckLeft }]}>
            {isActive && (
              <Animated.View style={[ms.pulse, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />
            )}
            <View style={[ms.truckInner, isDone && { backgroundColor: C.ok }]}>
              <Ionicons name={isDone ? 'checkmark' : 'car'} size={16} color="#FFF" />
            </View>
          </Animated.View>
        )}
      </View>

      {/* Labels */}
      <View style={ms.labels}>
        <View style={ms.labelItem}>
          <Text style={ms.labelTitle}>Pickup</Text>
          <Text style={ms.labelAddr} numberOfLines={1}>{delivery.pickupAddress || 'Supplier'}</Text>
        </View>
        <View style={[ms.labelItem, { alignItems: 'flex-end' }]}>
          <Text style={ms.labelTitle}>Destination</Text>
          <Text style={ms.labelAddr} numberOfLines={1}>{delivery.destAddress || 'Site'}</Text>
        </View>
      </View>
    </View>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TRACKING TIMELINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function TrackingTimeline({ delivery }: { delivery: Delivery }) {
  const steps = [
    { key: 'ordered', label: 'Order Placed', icon: 'document-text' as const, done: true, time: delivery.createdAt },
    { key: 'picked', label: 'Picked Up', icon: 'cube' as const, done: !!delivery.pickedUpAt || delivery.status === 'in-transit' || delivery.status === 'delivered', time: delivery.pickedUpAt },
    { key: 'transit', label: 'In Transit', icon: 'car' as const, done: delivery.status === 'in-transit' || delivery.status === 'delivered', time: delivery.status === 'in-transit' ? delivery.lastUpdated : undefined, active: delivery.status === 'in-transit' },
    { key: 'delivered', label: 'Delivered', icon: 'checkmark-circle' as const, done: delivery.status === 'delivered', time: delivery.deliveredAt },
  ];

  return (
    <View style={tl.container}>
      {steps.map((step, i) => (
        <View key={step.key} style={tl.step}>
          <View style={tl.lineCol}>
            <View style={[tl.circle, step.done && tl.circleDone, step.active && tl.circleActive]}>
              <Ionicons name={step.icon} size={14} color={step.done ? '#FFF' : step.active ? '#FFF' : C.text3} />
            </View>
            {i < steps.length - 1 && (
              <View style={[tl.line, step.done && tl.lineDone, step.active && tl.lineActive]} />
            )}
          </View>
          <View style={tl.content}>
            <Text style={[tl.label, step.done && tl.labelDone, step.active && tl.labelActive]}>{step.label}</Text>
            {step.time ? (
              <Text style={tl.time}>{new Date(step.time).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
            ) : null}
            {step.active && delivery.etaMinutes ? (
              <View style={tl.etaBadge}>
                <Ionicons name="time" size={12} color={C.priAccent} />
                <Text style={tl.etaText}>ETA: {delivery.etaMinutes} min ({delivery.distanceKm?.toFixed(1)} km)</Text>
              </View>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GPS TRAIL LOG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function GPSTrail({ points }: { points: TrackingPoint[] }) {
  if (points.length === 0) return null;
  const eventIcons: Record<string, any> = { pickup: 'cube', checkpoint: 'flag', arrived: 'location', delivered: 'checkmark-circle', location: 'navigate' };
  const eventColors: Record<string, string> = { pickup: C.priAccent, checkpoint: C.gold, arrived: C.purple, delivered: C.ok, location: C.text2 };

  return (
    <View style={gps.container}>
      <Text style={gps.title}>GPS Trail ({points.length} points)</Text>
      {points.slice(0, 20).map((p, i) => (
        <View key={p.id || i} style={gps.row}>
          <View style={[gps.dot, { backgroundColor: eventColors[p.event] || C.text3 }]}>
            <Ionicons name={eventIcons[p.event] || 'navigate'} size={10} color="#FFF" />
          </View>
          <View style={gps.info}>
            <Text style={gps.event}>{p.event.toUpperCase()}{p.note ? ` — ${p.note}` : ''}</Text>
            <Text style={gps.addr}>{p.address || `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`}</Text>
            <Text style={gps.meta}>{p.speedKmh > 0 ? `${p.speedKmh.toFixed(0)} km/h · ` : ''}{new Date(p.recordedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN SCREEN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function DeliveriesScreen() {
  const [dels, setDels] = useState<Delivery[]>([]);
  const [projs, setProjs] = useState<Project[]>([]);
  const [filter, setFilter] = useState('all');
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showSimGPS, setShowSimGPS] = useState(false);
  const [sel, setSel] = useState<Delivery | null>(null);
  const [form, setForm] = useState({
    materialName: '', supplier: '', quantity: '', unit: 'Tons', projectId: '', expectedDate: '',
    driverName: '', driverPhone: '', vehicleNumber: '',
    pickupAddress: '', destAddress: '',
    pickupLat: '', pickupLng: '', destLat: '', destLng: '',
  });
  const [gpsForm, setGpsForm] = useState({ lat: '', lng: '', address: '', speed: '35', event: 'location' });

  const load = useCallback(async () => {
    const [d, p] = await Promise.all([dStore.all(), pStore.all()]);
    setDels(d); setProjs(p);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered = filter === 'all' ? dels : dels.filter(d => d.status === filter);

  const resetForm = () => setForm({ materialName: '', supplier: '', quantity: '', unit: 'Tons', projectId: '', expectedDate: '', driverName: '', driverPhone: '', vehicleNumber: '', pickupAddress: '', destAddress: '', pickupLat: '', pickupLng: '', destLat: '', destLng: '' });

  const handleAdd = async () => {
    if (!form.materialName.trim()) return;
    const d: Delivery = {
      id: uid(), materialId: '', materialName: form.materialName.trim(),
      supplier: form.supplier.trim(), quantity: parseFloat(form.quantity) || 0,
      unit: form.unit || 'Units', expectedDate: form.expectedDate,
      status: 'expected', geoLat: undefined, geoLng: undefined, geoAddress: '',
      projectId: form.projectId || (projs.length > 0 ? projs[0].id : ''),
      driverName: form.driverName.trim(), driverPhone: form.driverPhone.trim(),
      vehicleNumber: form.vehicleNumber.trim(),
      pickupLat: parseFloat(form.pickupLat) || undefined,
      pickupLng: parseFloat(form.pickupLng) || undefined,
      pickupAddress: form.pickupAddress.trim(),
      destLat: parseFloat(form.destLat) || undefined,
      destLng: parseFloat(form.destLng) || undefined,
      destAddress: form.destAddress.trim(),
      currentLat: undefined, currentLng: undefined,
      etaMinutes: undefined, distanceKm: undefined,
      lastUpdated: undefined, pickedUpAt: undefined, deliveredAt: undefined,
      trackingPoints: [],
      createdAt: new Date().toISOString(),
    };
    // Calc initial distance
    if (d.pickupLat && d.destLat && d.pickupLng && d.destLng) {
      const R2 = 6371;
      const dLat = (d.destLat - d.pickupLat) * Math.PI / 180;
      const dLng = (d.destLng - d.pickupLng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(d.pickupLat * Math.PI / 180) * Math.cos(d.destLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      d.distanceKm = parseFloat((R2 * 2 * Math.asin(Math.sqrt(a))).toFixed(2));
      d.etaMinutes = Math.max(1, Math.round((d.distanceKm / 30) * 60));
    }
    await dStore.add(d);
    resetForm(); setShowAdd(false); load();
  };

  const handleStatusChange = async (d: Delivery, newStatus: string) => {
    const now = new Date().toISOString();
    const updated = { ...d, status: newStatus as any, lastUpdated: now };
    if (newStatus === 'in-transit' || newStatus === 'picked-up') {
      updated.pickedUpAt = now;
      updated.currentLat = d.pickupLat;
      updated.currentLng = d.pickupLng;
      const tp: TrackingPoint = { id: uid(), lat: d.pickupLat || 0, lng: d.pickupLng || 0, address: d.pickupAddress, speedKmh: 0, heading: 0, batteryPct: 100, event: 'pickup', note: 'Material picked up', recordedAt: now };
      updated.trackingPoints = [...(d.trackingPoints || []), tp];
    }
    if (newStatus === 'delivered') {
      updated.deliveredAt = now;
      updated.currentLat = d.destLat;
      updated.currentLng = d.destLng;
      updated.etaMinutes = 0;
      updated.distanceKm = 0;
      const tp: TrackingPoint = { id: uid(), lat: d.destLat || 0, lng: d.destLng || 0, address: d.destAddress, speedKmh: 0, heading: 0, batteryPct: 100, event: 'delivered', note: 'Delivered at site', recordedAt: now };
      updated.trackingPoints = [...(d.trackingPoints || []), tp];
    }
    await dStore.upd(updated);
    setSel(updated);
    load();
  };

  const handleSimGPS = async () => {
    if (!sel || !gpsForm.lat || !gpsForm.lng) return;
    const lat = parseFloat(gpsForm.lat); const lng = parseFloat(gpsForm.lng);
    const speed = parseFloat(gpsForm.speed) || 30;
    const now = new Date().toISOString();
    const tp: TrackingPoint = { id: uid(), lat, lng, address: gpsForm.address, speedKmh: speed, heading: 0, batteryPct: Math.floor(70 + Math.random() * 30), event: gpsForm.event as any, note: '', recordedAt: now };
    const updated = { ...sel, currentLat: lat, currentLng: lng, geoLat: lat, geoLng: lng, geoAddress: gpsForm.address, lastUpdated: now, trackingPoints: [...(sel.trackingPoints || []), tp] };
    // Recalc ETA
    if (sel.destLat && sel.destLng) {
      const R2 = 6371;
      const dLat2 = (sel.destLat - lat) * Math.PI / 180;
      const dLng2 = (sel.destLng - lng) * Math.PI / 180;
      const a2 = Math.sin(dLat2 / 2) ** 2 + Math.cos(lat * Math.PI / 180) * Math.cos(sel.destLat * Math.PI / 180) * Math.sin(dLng2 / 2) ** 2;
      updated.distanceKm = parseFloat((R2 * 2 * Math.asin(Math.sqrt(a2))).toFixed(2));
      updated.etaMinutes = Math.max(1, Math.round((updated.distanceKm / speed) * 60));
    }
    await dStore.upd(updated);
    setSel(updated);
    setGpsForm({ lat: '', lng: '', address: '', speed: '35', event: 'location' });
    setShowSimGPS(false);
    load();
  };

  const handleDel = (d: Delivery) => RNAlert.alert('Delete', `Delete this delivery?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { await dStore.del(d.id); setShowDetail(false); load(); } }]);

  const statusCfg: Record<string, { color: string; bg: string; icon: any; label: string }> = {
    expected: { color: C.info, bg: C.infoL, icon: 'time', label: 'Expected' },
    'picked-up': { color: C.gold, bg: C.warnL, icon: 'cube', label: 'Picked Up' },
    'in-transit': { color: C.priAccent, bg: '#DBEAFE', icon: 'car', label: 'In Transit' },
    delivered: { color: C.ok, bg: C.okL, icon: 'checkmark-circle', label: 'Delivered' },
    cancelled: { color: C.err, bg: C.errL, icon: 'close-circle', label: 'Cancelled' },
  };

  const renderDelivery = ({ item }: { item: Delivery }) => {
    const cfg = statusCfg[item.status] || statusCfg.expected;
    const isLive = item.status === 'in-transit' || item.status === 'picked-up';
    return (
      <TouchableOpacity style={[st.card, SH.md, isLive && { borderLeftWidth: 3, borderLeftColor: C.priAccent }]} onPress={() => { setSel(item); setShowDetail(true); }}>
        <View style={st.cardH}>
          <View style={[st.cardIcon, { backgroundColor: cfg.bg }]}><Ionicons name={cfg.icon} size={20} color={cfg.color} /></View>
          <View style={{ flex: 1 }}>
            <Text style={st.cardName}>{item.materialName}</Text>
            <Text style={st.cardSub}>{item.supplier} · {item.quantity} {item.unit}</Text>
          </View>
          <View style={[st.statusBadge, { backgroundColor: cfg.bg }]}>
            {isLive && <View style={st.liveDot} />}
            <Text style={[st.statusText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>
        {isLive && (
          <View style={st.liveRow}>
            <View style={st.liveItem}><Ionicons name="time" size={14} color={C.priAccent} /><Text style={st.liveText}>ETA: {item.etaMinutes || '?'} min</Text></View>
            <View style={st.liveItem}><Ionicons name="navigate" size={14} color={C.priAccent} /><Text style={st.liveText}>{item.distanceKm?.toFixed(1) || '?'} km</Text></View>
            {item.driverName ? <View style={st.liveItem}><Ionicons name="person" size={14} color={C.text2} /><Text style={st.liveText}>{item.driverName}</Text></View> : null}
            {item.vehicleNumber ? <View style={st.liveItem}><Ionicons name="car" size={14} color={C.text2} /><Text style={st.liveText}>{item.vehicleNumber}</Text></View> : null}
          </View>
        )}
        <View style={st.cardFoot}>
          <Text style={st.footText}>{projs.find(p => p.id === item.projectId)?.name || '-'}</Text>
          <Text style={st.footText}>{item.expectedDate ? fmtD(item.expectedDate) : '-'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <View style={st.hdr}>
        <View style={st.hdrTop}>
          <View><Text style={st.title}>Deliveries</Text><Text style={st.sub}>{dels.length} total · {dels.filter(d => d.status === 'in-transit').length} live</Text></View>
          <TouchableOpacity style={[st.addBtn, SH.md]} onPress={() => setShowAdd(true)}><Ionicons name="add" size={22} color="#FFF" /></TouchableOpacity>
        </View>
      </View>

      {dels.length > 0 && (
        <FlatList horizontal data={['all', 'in-transit', 'expected', 'delivered', 'cancelled']} keyExtractor={i => i} renderItem={({ item }) => {
          const cnt = item === 'all' ? dels.length : dels.filter(d => d.status === item).length;
          const isLive = item === 'in-transit';
          return (
            <TouchableOpacity style={[st.fChip, filter === item && st.fChipA, isLive && filter !== item && { borderColor: C.priAccent, borderWidth: 1 }]} onPress={() => setFilter(item)}>
              {isLive && <View style={[st.liveDotSm, filter === item && { backgroundColor: '#FFF' }]} />}
              <Text style={[st.fChipT, filter === item && st.fChipTA]}>{item === 'all' ? 'All' : item === 'in-transit' ? 'Live' : item.charAt(0).toUpperCase() + item.slice(1)} ({cnt})</Text>
            </TouchableOpacity>
          );
        }} showsHorizontalScrollIndicator={false} contentContainerStyle={st.chipRow} />
      )}

      <FlatList data={filtered} keyExtractor={i => i.id} renderItem={renderDelivery} contentContainerStyle={st.list} showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Empty icon="car-outline" title="No Deliveries" message="Track material deliveries with live GPS." actionLabel="Add Delivery" onAction={() => setShowAdd(true)} />} />

      {/* ━━━ DETAIL MODAL with LIVE TRACKING ━━━ */}
      <Modal visible={showDetail} animationType="slide" transparent>
        <View style={st.mo}><View style={[st.mc, SH.lg]}>{sel && (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={st.mh}>
              <View style={{ flex: 1 }}>
                <Text style={st.mt}>{sel.materialName}</Text>
                <Text style={st.mSub}>{sel.supplier} · {sel.quantity} {sel.unit}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDetail(false)}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity>
            </View>

            {/* Status Badge */}
            <View style={st.detailStatusRow}>
              <View style={[st.statusBadge, { backgroundColor: (statusCfg[sel.status] || statusCfg.expected).bg }]}>
                {(sel.status === 'in-transit') && <View style={st.liveDot} />}
                <Ionicons name={(statusCfg[sel.status] || statusCfg.expected).icon} size={14} color={(statusCfg[sel.status] || statusCfg.expected).color} />
                <Text style={[st.statusText, { color: (statusCfg[sel.status] || statusCfg.expected).color }]}>{(statusCfg[sel.status] || statusCfg.expected).label}</Text>
              </View>
              {sel.vehicleNumber ? <View style={st.vehBadge}><Ionicons name="car" size={12} color={C.text2} /><Text style={st.vehText}>{sel.vehicleNumber}</Text></View> : null}
            </View>

            {/* LIVE MAP VISUALIZATION */}
            <LiveTrackMap delivery={sel} />

            {/* ETA + Distance Card */}
            {(sel.status === 'in-transit' || sel.status === 'picked-up') && (
              <View style={[st.etaCard, SH.sm]}>
                <View style={st.etaItem}><Ionicons name="time" size={24} color={C.priAccent} /><Text style={st.etaVal}>{sel.etaMinutes || '—'}</Text><Text style={st.etaLabel}>min ETA</Text></View>
                <View style={st.etaDivider} />
                <View style={st.etaItem}><Ionicons name="navigate" size={24} color={C.purple} /><Text style={st.etaVal}>{sel.distanceKm?.toFixed(1) || '—'}</Text><Text style={st.etaLabel}>km left</Text></View>
                <View style={st.etaDivider} />
                <View style={st.etaItem}><Ionicons name="speedometer" size={24} color={C.gold} /><Text style={st.etaVal}>{sel.trackingPoints?.length > 0 ? sel.trackingPoints[sel.trackingPoints.length - 1].speedKmh.toFixed(0) : '—'}</Text><Text style={st.etaLabel}>km/h</Text></View>
              </View>
            )}

            {/* TRACKING TIMELINE */}
            <TrackingTimeline delivery={sel} />

            {/* Driver Info */}
            {sel.driverName ? (
              <View style={[st.driverCard, SH.sm]}>
                <View style={st.driverAvatar}><Ionicons name="person" size={22} color="#FFF" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={st.driverName}>{sel.driverName}</Text>
                  {sel.driverPhone ? <Text style={st.driverPhone}>{sel.driverPhone}</Text> : null}
                </View>
                {sel.driverPhone ? <TouchableOpacity style={st.callBtn}><Ionicons name="call" size={18} color={C.ok} /></TouchableOpacity> : null}
              </View>
            ) : null}

            {/* GPS Trail */}
            {sel.trackingPoints && sel.trackingPoints.length > 0 && (
              <GPSTrail points={[...sel.trackingPoints].reverse()} />
            )}

            {/* Action Buttons */}
            <View style={st.actRow}>
              {sel.status === 'expected' && (
                <TouchableOpacity style={[st.actBtn, { backgroundColor: C.priAccent }]} onPress={() => handleStatusChange(sel, 'in-transit')}>
                  <Ionicons name="car" size={18} color="#FFF" /><Text style={st.actText}>Mark Picked Up</Text>
                </TouchableOpacity>
              )}
              {sel.status === 'in-transit' && (
                <>
                  <TouchableOpacity style={[st.actBtn, { backgroundColor: C.purple }]} onPress={() => setShowSimGPS(true)}>
                    <Ionicons name="navigate" size={18} color="#FFF" /><Text style={st.actText}>Send GPS</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[st.actBtn, { backgroundColor: C.ok }]} onPress={() => handleStatusChange(sel, 'delivered')}>
                    <Ionicons name="checkmark" size={18} color="#FFF" /><Text style={st.actText}>Delivered</Text>
                  </TouchableOpacity>
                </>
              )}
              <TouchableOpacity style={[st.actBtn, { backgroundColor: C.err }]} onPress={() => handleDel(sel)}>
                <Ionicons name="trash" size={18} color="#FFF" /><Text style={st.actText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}</View></View>
      </Modal>

      {/* ━━━ SIMULATE GPS PING MODAL ━━━ */}
      <Modal visible={showSimGPS} animationType="slide" transparent>
        <KeyboardAvoidingView style={st.mo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[st.mc, SH.lg]}>
            <View style={st.mh}><Text style={st.mt}>Send GPS Location</Text><TouchableOpacity onPress={() => setShowSimGPS(false)}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity></View>
            <Text style={st.gpsHint}>Enter driver's current GPS coordinates. In production, this is sent automatically by the driver app every 30 seconds.</Text>
            <View style={{ flexDirection: 'row', gap: S.md }}>
              <View style={{ flex: 1 }}><FF label="Latitude *" placeholder="19.9975" keyboardType="numeric" value={gpsForm.lat} onChangeText={v => setGpsForm(f => ({ ...f, lat: v }))} /></View>
              <View style={{ flex: 1 }}><FF label="Longitude *" placeholder="73.7898" keyboardType="numeric" value={gpsForm.lng} onChangeText={v => setGpsForm(f => ({ ...f, lng: v }))} /></View>
            </View>
            <FF label="Address" placeholder="Near location" value={gpsForm.address} onChangeText={v => setGpsForm(f => ({ ...f, address: v }))} />
            <View style={{ flexDirection: 'row', gap: S.md }}>
              <View style={{ flex: 1 }}><FF label="Speed (km/h)" placeholder="35" keyboardType="numeric" value={gpsForm.speed} onChangeText={v => setGpsForm(f => ({ ...f, speed: v }))} /></View>
              <View style={{ flex: 1 }}>
                <Text style={st.fLabel}>Event</Text>
                <View style={{ flexDirection: 'row', gap: S.xs, flexWrap: 'wrap' }}>
                  {['location', 'checkpoint'].map(e => (
                    <TouchableOpacity key={e} style={[st.evBtn, gpsForm.event === e && st.evBtnA]} onPress={() => setGpsForm(f => ({ ...f, event: e }))}>
                      <Text style={[st.evBtnT, gpsForm.event === e && { color: '#FFF' }]}>{e}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            <TouchableOpacity style={[st.subBtn, (!gpsForm.lat || !gpsForm.lng) && { opacity: 0.4 }]} onPress={handleSimGPS} disabled={!gpsForm.lat || !gpsForm.lng}>
              <Ionicons name="navigate" size={20} color="#FFF" /><Text style={st.subText}>Push GPS Ping</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ━━━ ADD DELIVERY MODAL ━━━ */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <KeyboardAvoidingView style={st.mo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[st.mc, SH.lg]}><ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={st.mh}><Text style={st.mt}>New Delivery</Text><TouchableOpacity onPress={() => { resetForm(); setShowAdd(false); }}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity></View>
            <FF label="Material Name *" placeholder="e.g. OPC Cement 50kg" value={form.materialName} onChangeText={v => setForm(f => ({ ...f, materialName: v }))} />
            <View style={{ flexDirection: 'row', gap: S.md }}>
              <View style={{ flex: 2 }}><FF label="Supplier" placeholder="Supplier" value={form.supplier} onChangeText={v => setForm(f => ({ ...f, supplier: v }))} /></View>
              <View style={{ flex: 1 }}><FF label="Qty" placeholder="0" keyboardType="numeric" value={form.quantity} onChangeText={v => setForm(f => ({ ...f, quantity: v }))} /></View>
              <View style={{ flex: 1 }}><FF label="Unit" placeholder="Tons" value={form.unit} onChangeText={v => setForm(f => ({ ...f, unit: v }))} /></View>
            </View>
            <FF label="Expected Date (YYYY-MM-DD)" placeholder="2025-02-20" value={form.expectedDate} onChangeText={v => setForm(f => ({ ...f, expectedDate: v }))} />
            <Text style={st.secLabel}>Driver Details</Text>
            <FF label="Driver Name" placeholder="Driver name" value={form.driverName} onChangeText={v => setForm(f => ({ ...f, driverName: v }))} />
            <View style={{ flexDirection: 'row', gap: S.md }}>
              <View style={{ flex: 1 }}><FF label="Phone" placeholder="Phone" keyboardType="phone-pad" value={form.driverPhone} onChangeText={v => setForm(f => ({ ...f, driverPhone: v }))} /></View>
              <View style={{ flex: 1 }}><FF label="Vehicle No." placeholder="MH 15 XX 1234" value={form.vehicleNumber} onChangeText={v => setForm(f => ({ ...f, vehicleNumber: v }))} /></View>
            </View>
            <Text style={st.secLabel}>Pickup Location</Text>
            <FF label="Pickup Address" placeholder="Supplier address" value={form.pickupAddress} onChangeText={v => setForm(f => ({ ...f, pickupAddress: v }))} />
            <View style={{ flexDirection: 'row', gap: S.md }}>
              <View style={{ flex: 1 }}><FF label="Lat" placeholder="19.9975" keyboardType="numeric" value={form.pickupLat} onChangeText={v => setForm(f => ({ ...f, pickupLat: v }))} /></View>
              <View style={{ flex: 1 }}><FF label="Lng" placeholder="73.7898" keyboardType="numeric" value={form.pickupLng} onChangeText={v => setForm(f => ({ ...f, pickupLng: v }))} /></View>
            </View>
            <Text style={st.secLabel}>Destination (Site)</Text>
            <FF label="Destination Address" placeholder="Site address" value={form.destAddress} onChangeText={v => setForm(f => ({ ...f, destAddress: v }))} />
            <View style={{ flexDirection: 'row', gap: S.md }}>
              <View style={{ flex: 1 }}><FF label="Lat" placeholder="20.0063" keyboardType="numeric" value={form.destLat} onChangeText={v => setForm(f => ({ ...f, destLat: v }))} /></View>
              <View style={{ flex: 1 }}><FF label="Lng" placeholder="73.7621" keyboardType="numeric" value={form.destLng} onChangeText={v => setForm(f => ({ ...f, destLng: v }))} /></View>
            </View>
            {projs.length > 0 && <><Text style={st.secLabel}>Project</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: S.md }}>{projs.map(p => <TouchableOpacity key={p.id} style={[st.projChip, form.projectId === p.id && st.projChipA, { marginRight: S.sm }]} onPress={() => setForm(f => ({ ...f, projectId: p.id }))}><Text style={[st.projChipT, form.projectId === p.id && { color: '#FFF' }]} numberOfLines={1}>{p.name}</Text></TouchableOpacity>)}</ScrollView></>}
            <TouchableOpacity style={[st.subBtn, !form.materialName.trim() && { opacity: 0.4 }]} onPress={handleAdd} disabled={!form.materialName.trim()}>
              <Ionicons name="checkmark" size={20} color="#FFF" /><Text style={st.subText}>Create Delivery</Text>
            </TouchableOpacity>
          </ScrollView></View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ━━━ STYLES ━━━
const ms = StyleSheet.create({
  container: { backgroundColor: '#EEF2FF', borderRadius: R.lg, padding: S.lg, marginBottom: S.lg, overflow: 'hidden' },
  mapBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  gridLine: { position: 'absolute', top: '50%', left: 0, right: 0, height: 1, backgroundColor: 'rgba(99,102,241,0.08)' },
  gridLineV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(99,102,241,0.08)' },
  routeWrap: { height: 50, justifyContent: 'center', marginVertical: S.md },
  routeLine: { height: 4, backgroundColor: '#CBD5E1', borderRadius: 2, marginHorizontal: 18 },
  routeFill: { height: 4, backgroundColor: C.priAccent, borderRadius: 2 },
  dot: { position: 'absolute', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', top: 11 },
  pickupDot: { left: 4, backgroundColor: C.priAccent },
  destDot: { right: 4, backgroundColor: '#94A3B8' },
  truck: { position: 'absolute', top: 7, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  truckInner: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.priAccent, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  pulse: { position: 'absolute', width: 32, height: 32, borderRadius: 16, backgroundColor: C.priAccent },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  labelItem: {},
  labelTitle: { fontSize: F.xs, fontWeight: '700', color: C.priAccent, textTransform: 'uppercase', letterSpacing: 0.5 },
  labelAddr: { fontSize: F.sm, color: C.text2, maxWidth: 140, marginTop: 2 },
});

const tl = StyleSheet.create({
  container: { marginBottom: S.lg },
  step: { flexDirection: 'row', minHeight: 60 },
  lineCol: { width: 36, alignItems: 'center' },
  circle: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.brdL, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  circleDone: { backgroundColor: C.ok },
  circleActive: { backgroundColor: C.priAccent },
  line: { width: 3, flex: 1, backgroundColor: C.brdL, marginVertical: 2 },
  lineDone: { backgroundColor: C.ok },
  lineActive: { backgroundColor: C.priAccent },
  content: { flex: 1, paddingLeft: S.md, paddingBottom: S.lg },
  label: { fontSize: F.md, fontWeight: '600', color: C.text3 },
  labelDone: { color: C.ok },
  labelActive: { color: C.priAccent },
  time: { fontSize: F.xs, color: C.text2, marginTop: 2 },
  etaBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.infoL, borderRadius: R.sm, paddingHorizontal: S.sm, paddingVertical: 3, marginTop: S.xs, alignSelf: 'flex-start', gap: 4 },
  etaText: { fontSize: F.xs, fontWeight: '600', color: C.priAccent },
});

const gps = StyleSheet.create({
  container: { backgroundColor: C.brdL, borderRadius: R.lg, padding: S.lg, marginBottom: S.lg },
  title: { fontSize: F.md, fontWeight: '700', color: C.text, marginBottom: S.md },
  row: { flexDirection: 'row', marginBottom: S.md },
  dot: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: S.md, marginTop: 2 },
  info: { flex: 1 },
  event: { fontSize: F.sm, fontWeight: '700', color: C.text, textTransform: 'capitalize' },
  addr: { fontSize: F.xs, color: C.text2, marginTop: 1 },
  meta: { fontSize: F.xs, color: C.text3, marginTop: 1 },
});

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  hdr: { padding: S.lg, paddingBottom: S.sm },
  hdrTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: F.t1, fontWeight: '900', color: C.pri },
  sub: { fontSize: F.sm, color: C.text2, marginTop: 2 },
  addBtn: { width: 42, height: 42, borderRadius: R.md, backgroundColor: C.priAccent, alignItems: 'center', justifyContent: 'center' },
  chipRow: { paddingHorizontal: S.lg, paddingVertical: S.sm, gap: S.sm },
  fChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.lg, paddingVertical: 7, borderRadius: R.full, backgroundColor: C.card, borderWidth: 1, borderColor: C.brd, gap: 4 },
  fChipA: { backgroundColor: C.priAccent, borderColor: C.priAccent },
  fChipT: { fontSize: F.sm, color: C.text2, fontWeight: '600' },
  fChipTA: { color: '#FFF' },
  liveDotSm: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.priAccent },
  list: { padding: S.lg, paddingTop: S.sm },
  card: { backgroundColor: C.card, borderRadius: R.lg, padding: S.lg, marginBottom: S.lg },
  cardH: { flexDirection: 'row', alignItems: 'center', marginBottom: S.sm },
  cardIcon: { width: 40, height: 40, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', marginRight: S.md },
  cardName: { fontSize: F.lg, fontWeight: '700', color: C.text },
  cardSub: { fontSize: F.sm, color: C.text2, marginTop: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: S.sm, paddingVertical: 4, borderRadius: R.full, gap: 4 },
  statusText: { fontSize: F.xs, fontWeight: '700' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.priAccent },
  liveRow: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md, marginBottom: S.sm, paddingLeft: 52 },
  liveItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveText: { fontSize: F.sm, fontWeight: '600', color: C.text2 },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.brdL, paddingTop: S.sm },
  footText: { fontSize: F.xs, color: C.text3 },
  mo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  mc: { backgroundColor: C.card, borderTopLeftRadius: R.xxl, borderTopRightRadius: R.xxl, padding: S.xl, maxHeight: '94%' },
  mh: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: S.lg },
  mt: { fontSize: F.xxl, fontWeight: '800', color: C.text },
  mSub: { fontSize: F.md, color: C.text2, marginTop: 2 },
  detailStatusRow: { flexDirection: 'row', gap: S.sm, marginBottom: S.lg, flexWrap: 'wrap' },
  vehBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.brdL, borderRadius: R.full, paddingHorizontal: S.sm, paddingVertical: 4, gap: 4 },
  vehText: { fontSize: F.xs, fontWeight: '600', color: C.text2 },
  etaCard: { flexDirection: 'row', backgroundColor: C.card, borderRadius: R.lg, padding: S.lg, marginBottom: S.lg, borderWidth: 1, borderColor: C.brdL },
  etaItem: { flex: 1, alignItems: 'center' },
  etaDivider: { width: 1, backgroundColor: C.brdL },
  etaVal: { fontSize: F.xxl, fontWeight: '800', color: C.text, marginTop: S.xs },
  etaLabel: { fontSize: F.xs, color: C.text2, marginTop: 2 },
  driverCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: R.lg, padding: S.lg, marginBottom: S.lg, borderWidth: 1, borderColor: C.brdL },
  driverAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.priAccent, alignItems: 'center', justifyContent: 'center', marginRight: S.md },
  driverName: { fontSize: F.lg, fontWeight: '700', color: C.text },
  driverPhone: { fontSize: F.sm, color: C.text2, marginTop: 2 },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.okL, alignItems: 'center', justifyContent: 'center' },
  actRow: { flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' },
  actBtn: { flex: 1, minWidth: 100, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: S.md, borderRadius: R.md, gap: 6 },
  actText: { fontSize: F.md, fontWeight: '600', color: '#FFF' },
  gpsHint: { fontSize: F.sm, color: C.text2, lineHeight: 20, marginBottom: S.lg, backgroundColor: C.infoL, padding: S.md, borderRadius: R.md },
  fLabel: { fontSize: F.sm, fontWeight: '600', color: C.text, marginBottom: S.xs },
  evBtn: { paddingHorizontal: S.md, paddingVertical: S.xs, borderRadius: R.full, backgroundColor: C.brdL },
  evBtnA: { backgroundColor: C.priAccent },
  evBtnT: { fontSize: F.xs, fontWeight: '600', color: C.text2 },
  secLabel: { fontSize: F.md, fontWeight: '700', color: C.priAccent, marginTop: S.lg, marginBottom: S.sm },
  projChip: { paddingHorizontal: S.md, paddingVertical: 6, borderRadius: R.full, backgroundColor: C.brdL },
  projChipA: { backgroundColor: C.priAccent },
  projChipT: { fontSize: F.sm, color: C.text2, fontWeight: '500' },
  subBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.priAccent, borderRadius: R.md, padding: S.lg, marginTop: S.lg, gap: S.sm },
  subText: { fontSize: F.lg, fontWeight: '700', color: '#FFF' },
});
