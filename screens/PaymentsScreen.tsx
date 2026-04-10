import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { C, S, R, F, SH } from '../lib/theme';
import { fmt, fmtD, uid, today } from '../lib/helpers';
import { tStore, pStore, wStore } from '../lib/storage';
import { Transaction, Project, Worker } from '../lib/types';
import Empty from '../components/EmptyState';
import FF from '../components/FormField';
import PickerModal from '../components/PickerModal';
import ConfirmModal from '../components/ConfirmModal';
import InfoModal from '../components/InfoModal';

export default function Payments() {
  const [tab, setTab] = useState<'tx' | 'pay'>('tx');
  const [flt, setFlt] = useState('all');
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [wks, setWks] = useState<Worker[]>([]);
  const [projs, setProjs] = useState<Project[]>([]);
  
  const [showTx, setShowTx] = useState(false);
  const [showW, setShowW] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [payTarget, setPayTarget] = useState({ name: '', amount: '', upiId: '' });
  const [tf, setTf] = useState({ payee: '', amount: '', description: '', category: 'labor', type: 'payment', method: 'bank', projectId: '', status: 'completed' });
  const [wf, setWf] = useState({ name: '', role: '', type: 'weekly', rate: '', phone: '', upiId: '', projectId: '' });
  // Picker states
  const [showCatPick, setShowCatPick] = useState(false);
  const [showMethodPick, setShowMethodPick] = useState(false);
  const [showStatusPick, setShowStatusPick] = useState(false);
  const [showProjPick, setShowProjPick] = useState(false);
  const [showPayTypePick, setShowPayTypePick] = useState(false);
  const [showWProjPick, setShowWProjPick] = useState(false);

  const load = useCallback(async () => { const [t, p, w] = await Promise.all([tStore.all(), pStore.all(), wStore.all()]); setTxs(t); setProjs(p); setWks(w); }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const fTx = flt === 'all' ? txs : txs.filter(t => t.category === flt);
  const paid = txs.filter(t => t.status === 'completed' && t.type === 'payment').reduce((s, t) => s + t.amount, 0);
  const pend = txs.filter(t => t.status === 'pending').reduce((s, t) => s + t.amount, 0);
  const recv = txs.filter(t => t.type === 'receipt').reduce((s, t) => s + t.amount, 0);
  const catIc: Record<string, any> = { labor: 'people', material: 'cube', supplier: 'business', equipment: 'construct', overhead: 'receipt' };

  // Update project spent when adding a completed payment
  const updateProjectSpent = async (projectId: string, amount: number, isPayment: boolean) => {
    if (!projectId) return;
    const allP = await pStore.all();
    const proj = allP.find(p => p.id === projectId);
    if (!proj) return;
    const newSpent = isPayment ? proj.spent + amount : Math.max(0, proj.spent - amount);
    await pStore.upd({ ...proj, spent: newSpent });
  };

  const [payInfo, setPayInfo] = useState<{ visible: boolean; title: string; message: string; type: 'success' | 'error' | 'info' }>({ visible: false, title: '', message: '', type: 'info' });
  const [showBankConfirm, setShowBankConfirm] = useState(false);
  const [bankConfirmData, setBankConfirmData] = useState({ name: '', amount: '' });

  const addTx = async () => {
    if (!tf.payee.trim() || !tf.amount.trim()) { setPayInfo({ visible: true, title: 'Required', message: 'Payee and Amount are required.', type: 'error' }); return; }
    const amt = Number(tf.amount);
    if (isNaN(amt) || amt <= 0) { setPayInfo({ visible: true, title: 'Error', message: 'Enter a valid amount greater than 0.', type: 'error' }); return; }
    const projId = tf.projectId || (projs.length > 0 ? projs[0].id : '');
    await tStore.add({ id: uid(), type: tf.type as any, category: tf.category as any, amount: amt, date: today(), description: tf.description.trim(), projectId: projId, status: tf.status as any, payee: tf.payee.trim(), method: tf.method as any, createdAt: new Date().toISOString() });
    // Sync project cost
    if (tf.type === 'payment' && tf.status === 'completed') {
      await updateProjectSpent(projId, amt, true);
    }
    setTf({ payee: '', amount: '', description: '', category: 'labor', type: 'payment', method: 'bank', projectId: '', status: 'completed' });
    setShowTx(false); load();
  };

  const addW = async () => {
    if (!wf.name.trim()) return;
    await wStore.add({ id: uid(), name: wf.name.trim(), role: wf.role.trim(), type: wf.type as any, rate: parseFloat(wf.rate) || 0, projectId: wf.projectId || (projs.length > 0 ? projs[0].id : ''), phone: wf.phone.trim(), joinDate: today(), status: 'active', upiId: wf.upiId.trim(), createdAt: new Date().toISOString() });
    setWf({ name: '', role: '', type: 'weekly', rate: '', phone: '', upiId: '', projectId: '' }); setShowW(false); load();
  };

  const initiateUPIPayment = async (name: string, amount: string, upiId: string) => {
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) { setPayInfo({ visible: true, title: 'Error', message: 'Enter a valid amount.', type: 'error' }); return; }
    if (!upiId) { setPayInfo({ visible: true, title: 'Error', message: 'UPI ID is required. Add it in worker details or enter manually.', type: 'error' }); return; }
    const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${amt}&cu=INR&tn=${encodeURIComponent('BuildPro Payment - ' + name)}`;
    try {
      const supported = await Linking.canOpenURL(upiUrl);
      if (supported) {
        await Linking.openURL(upiUrl);
      } else {
        // Fallback: show manual transfer info
        // Fallback: auto-record on web
        const projId = projs.length > 0 ? projs[0].id : '';
        await tStore.add({ id: uid(), type: 'payment', category: 'labor', amount: amt, date: today(), description: `UPI Payment to ${name}`, projectId: projId, status: 'completed', payee: name, method: 'upi', createdAt: new Date().toISOString() });
        await updateProjectSpent(projId, amt, true);
        load();
        setPayInfo({ visible: true, title: 'Payment Recorded', message: `UPI app not available. Payment of ₹${amt} to ${name} recorded as completed.`, type: 'success' });
      }
    } catch {
      const projId2 = projs.length > 0 ? projs[0].id : '';
      await tStore.add({ id: uid(), type: 'payment', category: 'labor', amount: amt, date: today(), description: `Payment to ${name}`, projectId: projId2, status: 'completed', payee: name, method: 'upi', createdAt: new Date().toISOString() });
      await updateProjectSpent(projId2, amt, true);
      load();
      setPayInfo({ visible: true, title: 'Payment Recorded', message: `Payment of ₹${amt} to ${name} recorded.`, type: 'success' });
    }
    setShowPay(false);
  };

  const recordCashPayment = async (name: string, amount: string) => {
    const amt = Number(amount);
    if (!amt || amt <= 0 || isNaN(amt)) { setPayInfo({ visible: true, title: 'Error', message: 'Enter a valid amount greater than 0.', type: 'error' }); return; }
    const projId = projs.length > 0 ? projs[0].id : '';
    await tStore.add({ id: uid(), type: 'payment' as const, category: 'labor' as const, amount: amt, date: today(), description: `Cash payment to ${name}`, projectId: projId, status: 'completed' as const, payee: name, method: 'cash' as const, createdAt: new Date().toISOString() });
    await updateProjectSpent(projId, amt, true);
    setShowPay(false);
    await load();
    setPayInfo({ visible: true, title: 'Payment Recorded ✓', message: `₹${amt.toLocaleString('en-IN')} cash payment to ${name} has been recorded and marked as completed.`, type: 'success' });
  };

  const openPayWorker = (w: Worker) => {
    setPayTarget({ name: w.name, amount: String(w.rate), upiId: w.upiId || '' });
    setShowPay(true);
  };

  const catOptions = [
    { value: 'labor', label: 'Labor', icon: 'people' },
    { value: 'material', label: 'Material', icon: 'cube' },
    { value: 'supplier', label: 'Supplier', icon: 'business' },
    { value: 'equipment', label: 'Equipment', icon: 'construct' },
    { value: 'overhead', label: 'Overhead', icon: 'receipt' },
  ];
  const methodOptions = [
    { value: 'cash', label: 'Cash', icon: 'cash' },
    { value: 'bank', label: 'Bank Transfer', icon: 'business' },
    { value: 'upi', label: 'UPI', icon: 'phone-portrait' },
    { value: 'cheque', label: 'Cheque', icon: 'document' },
  ];
  const statusOptions = [
    { value: 'completed', label: 'Completed', icon: 'checkmark-circle' },
    { value: 'pending', label: 'Pending', icon: 'time' },
  ];
  const payTypeOptions = [
    { value: 'daily', label: 'Daily', icon: 'today' },
    { value: 'weekly', label: 'Weekly', icon: 'calendar' },
    { value: 'monthly', label: 'Monthly', icon: 'calendar-outline' },
  ];
  const projOptions = projs.map(p => ({ value: p.id, label: p.name, icon: 'business' }));

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <View style={st.hdr}><Text style={st.title}>Payments</Text><TouchableOpacity style={[st.addB, SH.md]} onPress={() => tab === 'tx' ? setShowTx(true) : setShowW(true)} activeOpacity={0.8}><Ionicons name="add" size={22} color="#FFF" /></TouchableOpacity></View>
      {(txs.length > 0 || wks.length > 0) && <View style={st.sumR}><View style={[st.sC, SH.sm]}><Ionicons name="arrow-up" size={14} color={C.err} /><Text style={st.sV}>{fmt(paid)}</Text><Text style={st.sL}>Paid</Text></View><View style={[st.sC, SH.sm]}><Ionicons name="time" size={14} color={C.warn} /><Text style={[st.sV, { color: C.warn }]}>{fmt(pend)}</Text><Text style={st.sL}>Pending</Text></View><View style={[st.sC, SH.sm]}><Ionicons name="arrow-down" size={14} color={C.ok} /><Text style={[st.sV, { color: C.ok }]}>{fmt(recv)}</Text><Text style={st.sL}>Received</Text></View></View>}
      <View style={st.tabR}><TouchableOpacity style={[st.tabB, tab === 'tx' && st.tabA]} onPress={() => setTab('tx')}><Text style={[st.tabT, tab === 'tx' && st.tabTA]}>Transactions</Text></TouchableOpacity><TouchableOpacity style={[st.tabB, tab === 'pay' && st.tabA]} onPress={() => setTab('pay')}><Text style={[st.tabT, tab === 'pay' && st.tabTA]}>Payroll</Text></TouchableOpacity></View>
      {tab === 'tx' ? (
        <FlatList data={fTx} keyExtractor={i => i.id} contentContainerStyle={st.list} showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Empty icon="card-outline" title="No Transactions" msg="Record your first payment." btn="Record" onBtn={() => setShowTx(true)} />}
          renderItem={({ item }) => { const proj = projs.find(p => p.id === item.projectId); return (
            <View style={[st.txC, SH.sm]}><View style={[st.txI, { backgroundColor: item.type === 'receipt' ? C.okL : C.priAccent + '12' }]}><Ionicons name={item.type === 'receipt' ? 'arrow-down' : catIc[item.category] || 'card'} size={16} color={item.type === 'receipt' ? C.ok : C.priAccent} /></View><View style={{ flex: 1 }}><Text style={st.txD} numberOfLines={1}>{item.description || item.payee}</Text><Text style={st.txM}>{item.payee} {proj ? `\u2022 ${proj.name} ` : ''}\u2022 {fmtD(item.date)} \u2022 {item.method.toUpperCase()}</Text></View><View style={{ alignItems: 'flex-end' }}><Text style={[st.txA, { color: item.type === 'receipt' ? C.ok : C.text }]}>{item.type === 'receipt' ? '+' : '-'}{fmt(item.amount)}</Text><View style={[st.stB, { backgroundColor: item.status === 'completed' ? C.okL : C.warnL }]}><Text style={[st.stT, { color: item.status === 'completed' ? C.ok : C.warn }]}>{item.status}</Text></View></View></View>
          ); }} />
      ) : (
        <FlatList data={wks} keyExtractor={i => i.id} contentContainerStyle={st.list} showsVerticalScrollIndicator={false}
          ListHeaderComponent={wks.length > 0 ? <View style={st.payRow}><View style={[st.payC, SH.sm]}><Text style={st.payT}>Weekly</Text><Text style={st.payA}>{fmt(wks.filter(w => w.type === 'weekly').reduce((s, w) => s + w.rate, 0))}</Text></View><View style={[st.payC, SH.sm]}><Text style={st.payT}>Monthly</Text><Text style={st.payA}>{fmt(wks.filter(w => w.type === 'monthly').reduce((s, w) => s + w.rate, 0))}</Text></View></View> : null}
          ListEmptyComponent={<Empty icon="people-outline" title="No Workers" msg="Add workers to manage payroll." btn="Add Worker" onBtn={() => setShowW(true)} />}
          renderItem={({ item }) => <View style={[st.wC, SH.sm]}><View style={st.wAv}><Text style={st.wIn}>{item.name.charAt(0)}</Text></View><View style={{ flex: 1 }}><Text style={st.wN}>{item.name}</Text><Text style={st.wR}>{item.role} \u2022 {item.type}</Text>{item.upiId ? <Text style={st.wUpi}><Ionicons name="phone-portrait" size={10} color={C.purple} /> {item.upiId}</Text> : null}</View><View style={{ alignItems: 'flex-end', gap: 4 }}><Text style={st.wRt}>{fmt(item.rate)}<Text style={st.wPer}>/{item.type === 'daily' ? 'd' : item.type === 'weekly' ? 'wk' : 'mo'}</Text></Text><TouchableOpacity style={st.payBtn} onPress={() => openPayWorker(item)} activeOpacity={0.8}><Ionicons name="send" size={12} color="#FFF" /><Text style={st.payBtnT}>Pay</Text></TouchableOpacity></View></View>} />
      )}

      {/* UPI Pay Modal */}
      <Modal visible={showPay} animationType="slide" transparent><View style={st.mo}><View style={[st.mc, SH.lg]}>
        <View style={st.mhh}><Text style={st.mtt}>Send Payment</Text><TouchableOpacity onPress={() => setShowPay(false)}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity></View>
        <View style={[st.payCard, SH.sm]}><View style={st.payIcon}><Ionicons name="send" size={28} color={C.priAccent} /></View><Text style={st.payName}>{payTarget.name}</Text></View>
        <FF label="Amount (\u20B9) *" placeholder="Enter amount" inputType="currency" value={payTarget.amount} onChangeText={v => setPayTarget(f => ({ ...f, amount: v }))} />
        <FF label="UPI ID *" placeholder="name@upi or phone@paytm" value={payTarget.upiId} onChangeText={v => setPayTarget(f => ({ ...f, upiId: v }))} />
        <Text style={st.payMethods}>Payment Methods</Text>
        <TouchableOpacity style={[st.pmBtn, { backgroundColor: '#5F259F' }]} onPress={() => initiateUPIPayment(payTarget.name, payTarget.amount, payTarget.upiId)} activeOpacity={0.85}>
          <Ionicons name="phone-portrait" size={18} color="#FFF" /><Text style={st.pmBtnT}>Pay via UPI (GPay/PhonePe/Paytm)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.pmBtn, { backgroundColor: C.priAccent }]} onPress={() => { setBankConfirmData({ name: payTarget.name, amount: payTarget.amount }); setShowBankConfirm(true); }} activeOpacity={0.85}>
          <Ionicons name="business" size={18} color="#FFF" /><Text style={st.pmBtnT}>Bank Transfer (NEFT/RTGS)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.pmBtn, { backgroundColor: C.ok }]} onPress={() => recordCashPayment(payTarget.name, payTarget.amount)} activeOpacity={0.85}>
          <Ionicons name="cash" size={18} color="#FFF" /><Text style={st.pmBtnT}>Record Cash Payment</Text>
        </TouchableOpacity>
      </View></View></Modal>

      {/* Add Tx with Picker Modals */}
      <Modal visible={showTx} animationType="slide" transparent><KeyboardAvoidingView style={st.mo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View style={[st.mc, SH.lg]}><ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={st.mhh}><Text style={st.mtt}>Record Transaction</Text><TouchableOpacity onPress={() => setShowTx(false)}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity></View>
        <View style={{ flexDirection: 'row', gap: S.sm, marginBottom: S.lg }}>{['payment', 'receipt'].map(t => <TouchableOpacity key={t} style={[st.togB, tf.type === t && st.togA]} onPress={() => setTf(f => ({ ...f, type: t }))}><Text style={[st.togT, tf.type === t && st.togTA]}>{t === 'payment' ? 'Payment' : 'Receipt'}</Text></TouchableOpacity>)}</View>
        <FF label="Payee *" placeholder="Name" inputType="name" value={tf.payee} onChangeText={v => setTf(f => ({ ...f, payee: v }))} />
        <FF label="Amount (\u20B9) *" placeholder="Enter amount" inputType="currency" value={tf.amount} onChangeText={v => setTf(f => ({ ...f, amount: v }))} />
        <FF label="Description" placeholder="Details" value={tf.description} onChangeText={v => setTf(f => ({ ...f, description: v }))} />

        <Text style={st.fl}>Category</Text>
        <TouchableOpacity style={st.pickerBtn} onPress={() => setShowCatPick(true)}>
          <Ionicons name={catIc[tf.category] || 'ellipse'} size={16} color={C.priAccent} />
          <Text style={st.pickerBtnT}>{tf.category.charAt(0).toUpperCase() + tf.category.slice(1)}</Text>
          <Ionicons name="chevron-down" size={16} color={C.text3} />
        </TouchableOpacity>

        <Text style={st.fl}>Method</Text>
        <TouchableOpacity style={st.pickerBtn} onPress={() => setShowMethodPick(true)}>
          <Ionicons name={methodOptions.find(m => m.value === tf.method)?.icon as any || 'card'} size={16} color={C.priAccent} />
          <Text style={st.pickerBtnT}>{tf.method.toUpperCase()}</Text>
          <Ionicons name="chevron-down" size={16} color={C.text3} />
        </TouchableOpacity>

        <Text style={st.fl}>Status</Text>
        <TouchableOpacity style={st.pickerBtn} onPress={() => setShowStatusPick(true)}>
          <Ionicons name={tf.status === 'completed' ? 'checkmark-circle' : 'time'} size={16} color={tf.status === 'completed' ? C.ok : C.warn} />
          <Text style={st.pickerBtnT}>{tf.status.charAt(0).toUpperCase() + tf.status.slice(1)}</Text>
          <Ionicons name="chevron-down" size={16} color={C.text3} />
        </TouchableOpacity>

        {projs.length > 0 && <>
          <Text style={st.fl}>Project</Text>
          <TouchableOpacity style={st.pickerBtn} onPress={() => setShowProjPick(true)}>
            <Ionicons name="business" size={16} color={C.priAccent} />
            <Text style={st.pickerBtnT}>{projs.find(p => p.id === tf.projectId)?.name || 'Select Project'}</Text>
            <Ionicons name="chevron-down" size={16} color={C.text3} />
          </TouchableOpacity>
        </>}

        <TouchableOpacity style={[st.subBtn, (!tf.payee.trim() || !tf.amount) && { opacity: 0.4 }]} onPress={addTx}><Text style={st.subT}>Record Transaction</Text></TouchableOpacity>
      </ScrollView></View></KeyboardAvoidingView></Modal>

      {/* Add Worker with Picker */}
      <Modal visible={showW} animationType="slide" transparent><KeyboardAvoidingView style={st.mo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View style={[st.mc, SH.lg]}><ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={st.mhh}><Text style={st.mtt}>Add Worker</Text><TouchableOpacity onPress={() => setShowW(false)}><Ionicons name="close" size={24} color={C.text} /></TouchableOpacity></View>
        <FF label="Name *" placeholder="Worker name" inputType="name" value={wf.name} onChangeText={v => setWf(f => ({ ...f, name: v }))} />
        <FF label="Role" placeholder="e.g. Mason" inputType="name" value={wf.role} onChangeText={v => setWf(f => ({ ...f, role: v }))} />

        <Text style={st.fl}>Pay Type</Text>
        <TouchableOpacity style={st.pickerBtn} onPress={() => setShowPayTypePick(true)}>
          <Ionicons name="calendar" size={16} color={C.priAccent} />
          <Text style={st.pickerBtnT}>{wf.type.charAt(0).toUpperCase() + wf.type.slice(1)}</Text>
          <Ionicons name="chevron-down" size={16} color={C.text3} />
        </TouchableOpacity>

        <FF label={`Rate (\u20B9/${wf.type === 'daily' ? 'day' : wf.type === 'weekly' ? 'week' : 'month'})`} placeholder="Rate" inputType="currency" value={wf.rate} onChangeText={v => setWf(f => ({ ...f, rate: v }))} />
        <FF label="Phone (10 digits)" placeholder="9876543210" inputType="phone" value={wf.phone} onChangeText={v => setWf(f => ({ ...f, phone: v }))} hint="10-digit mobile number" />
        <FF label="UPI ID (for direct payment)" placeholder="name@upi" value={wf.upiId} onChangeText={v => setWf(f => ({ ...f, upiId: v }))} />

        {projs.length > 0 && <>
          <Text style={st.fl}>Assign to Project</Text>
          <TouchableOpacity style={st.pickerBtn} onPress={() => setShowWProjPick(true)}>
            <Ionicons name="business" size={16} color={C.priAccent} />
            <Text style={st.pickerBtnT}>{projs.find(p => p.id === wf.projectId)?.name || 'Select Project'}</Text>
            <Ionicons name="chevron-down" size={16} color={C.text3} />
          </TouchableOpacity>
        </>}

        <TouchableOpacity style={[st.subBtn, !wf.name.trim() && { opacity: 0.4 }]} onPress={addW}><Text style={st.subT}>Add Worker</Text></TouchableOpacity>
      </ScrollView></View></KeyboardAvoidingView></Modal>

      {/* All Picker Modals */}
      <PickerModal visible={showCatPick} onClose={() => setShowCatPick(false)} title="Select Category" options={catOptions} selected={tf.category} onSelect={v => setTf(f => ({ ...f, category: v }))} />
      <PickerModal visible={showMethodPick} onClose={() => setShowMethodPick(false)} title="Payment Method" options={methodOptions} selected={tf.method} onSelect={v => setTf(f => ({ ...f, method: v }))} />
      <PickerModal visible={showStatusPick} onClose={() => setShowStatusPick(false)} title="Status" options={statusOptions} selected={tf.status} onSelect={v => setTf(f => ({ ...f, status: v }))} />
      <PickerModal visible={showProjPick} onClose={() => setShowProjPick(false)} title="Select Project" options={projOptions} selected={tf.projectId} onSelect={v => setTf(f => ({ ...f, projectId: v }))} />
      <PickerModal visible={showPayTypePick} onClose={() => setShowPayTypePick(false)} title="Pay Type" options={payTypeOptions} selected={wf.type} onSelect={v => setWf(f => ({ ...f, type: v }))} />
      <PickerModal visible={showWProjPick} onClose={() => setShowWProjPick(false)} title="Assign to Project" options={projOptions} selected={wf.projectId} onSelect={v => setWf(f => ({ ...f, projectId: v }))} />
      <InfoModal visible={payInfo.visible} title={payInfo.title} message={payInfo.message} type={payInfo.type} onClose={() => setPayInfo(prev => ({ ...prev, visible: false }))} />
      <ConfirmModal visible={showBankConfirm} title="Bank Transfer" message={`Transfer ₹${bankConfirmData.amount} to ${bankConfirmData.name}\n\nConfigure bank details in Settings > Payment Config.`} confirmText="Record as Paid" cancelText="Cancel" icon="card" onConfirm={async () => { const amt = parseFloat(bankConfirmData.amount) || 0; if (amt > 0) { const projId = projs.length > 0 ? projs[0].id : ''; await tStore.add({ id: uid(), type: 'payment', category: 'labor', amount: amt, date: today(), description: `Bank transfer to ${bankConfirmData.name}`, projectId: projId, status: 'completed', payee: bankConfirmData.name, method: 'bank', createdAt: new Date().toISOString() }); await updateProjectSpent(projId, amt, true); load(); } setShowBankConfirm(false); setShowPay(false); }} onCancel={() => setShowBankConfirm(false)} />
    </SafeAreaView>
  );
}
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg }, hdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: S.xl, paddingBottom: S.md }, title: { fontSize: F.t1, fontWeight: '900', color: C.pri }, addB: { width: 42, height: 42, borderRadius: R.md, backgroundColor: C.priAccent, alignItems: 'center', justifyContent: 'center' },
  sumR: { flexDirection: 'row', paddingHorizontal: S.xl, gap: S.sm, marginBottom: S.md }, sC: { flex: 1, backgroundColor: C.card, borderRadius: R.md, padding: S.md, alignItems: 'center' }, sV: { fontSize: F.md, fontWeight: '800', color: C.text, marginTop: 4 }, sL: { fontSize: F.xs, color: C.text3, marginTop: 2 },
  tabR: { flexDirection: 'row', paddingHorizontal: S.xl, marginBottom: S.md, gap: S.sm }, tabB: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: R.md, backgroundColor: C.card }, tabA: { backgroundColor: C.pri }, tabT: { fontSize: F.md, fontWeight: '600', color: C.text2 }, tabTA: { color: '#FFF' },
  list: { padding: S.xl, paddingTop: S.sm },
  txC: { flexDirection: 'row', backgroundColor: C.card, borderRadius: R.md, padding: S.md, marginBottom: S.sm, alignItems: 'flex-start' }, txI: { width: 36, height: 36, borderRadius: R.sm, alignItems: 'center', justifyContent: 'center', marginRight: S.md }, txD: { fontSize: F.md, fontWeight: '500', color: C.text }, txM: { fontSize: F.xs, color: C.text3, marginTop: 1 }, txA: { fontSize: F.md, fontWeight: '700' }, stB: { borderRadius: R.sm, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 }, stT: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  wC: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: R.md, padding: S.md, marginBottom: S.sm }, wAv: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.priAccent, alignItems: 'center', justifyContent: 'center', marginRight: S.md }, wIn: { fontSize: F.lg, fontWeight: '700', color: '#FFF' }, wN: { fontSize: F.md, fontWeight: '600', color: C.text }, wR: { fontSize: F.sm, color: C.text3, marginTop: 1 }, wUpi: { fontSize: F.xs, color: C.purple, marginTop: 2 }, wRt: { fontSize: F.lg, fontWeight: '700', color: C.priAccent }, wPer: { fontSize: F.xs, color: C.text3, fontWeight: '500' },
  payBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.ok, borderRadius: R.sm, paddingHorizontal: 10, paddingVertical: 5, gap: 4 }, payBtnT: { fontSize: F.xs, fontWeight: '700', color: '#FFF' },
  payRow: { flexDirection: 'row', gap: S.md, marginBottom: S.lg }, payC: { flex: 1, backgroundColor: C.card, borderRadius: R.md, padding: S.lg, alignItems: 'center' }, payT: { fontSize: F.sm, color: C.text3 }, payA: { fontSize: F.xl, fontWeight: '800', color: C.priAccent, marginTop: 4 },
  mo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }, mc: { backgroundColor: C.card, borderTopLeftRadius: R.xxl, borderTopRightRadius: R.xxl, padding: S.xxl, maxHeight: '92%' }, mhh: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: S.xxl }, mtt: { fontSize: F.xxl, fontWeight: '800', color: C.pri },
  payCard: { backgroundColor: C.brdL, borderRadius: R.lg, padding: S.xxl, alignItems: 'center', marginBottom: S.xxl }, payIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.priAccent + '15', alignItems: 'center', justifyContent: 'center', marginBottom: S.sm }, payName: { fontSize: F.xl, fontWeight: '700', color: C.text },
  payMethods: { fontSize: F.sm, fontWeight: '600', color: C.text2, marginBottom: S.md, marginTop: S.sm },
  pmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: R.md, paddingVertical: 14, gap: S.sm, marginBottom: S.sm }, pmBtnT: { fontSize: F.md, fontWeight: '600', color: '#FFF' },
  fl: { fontSize: F.sm, fontWeight: '600', color: C.text2, marginBottom: 6, marginTop: S.md },
  togB: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: R.md, backgroundColor: C.brdL }, togA: { backgroundColor: C.priAccent }, togT: { fontSize: F.md, fontWeight: '600', color: C.text2 }, togTA: { color: '#FFF' },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.brdL, borderRadius: R.md, paddingHorizontal: S.lg, paddingVertical: 14, gap: S.sm, marginBottom: S.sm },
  pickerBtnT: { flex: 1, fontSize: F.md, fontWeight: '500', color: C.text },
  subBtn: { alignItems: 'center', backgroundColor: C.priAccent, borderRadius: R.md, paddingVertical: 16, marginTop: S.lg }, subT: { fontSize: F.lg, fontWeight: '700', color: '#FFF' },
});
