import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { C, S, R, F, SH } from '../lib/theme';
import { getCo, setCo, clearAll, setOnb, pStore, mStore, tStore, iStore, wStore, dStore } from '../lib/storage';
import { fmt, fmtD } from '../lib/helpers';
import { Project, Material, Transaction, Invoice, Worker, Delivery } from '../lib/types';
import FF from '../components/FormField';
import ConfirmModal from '../components/ConfirmModal';
import InfoModal from '../components/InfoModal';

function toCSV(headers: string[], rows: any[][]): string {
  const escape = (v: any) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
}

export default function Settings({ onReset }: { onReset?: () => void }) {
  const [co, setCoState] = useState('');
  const [editCo, setEditCo] = useState(false);
  const [coInput, setCoInput] = useState('');
  const [stats, setStats] = useState({ projects: 0, materials: 0, transactions: 0, invoices: 0, workers: 0, deliveries: 0 });
  const [allData, setAllData] = useState<{ p: Project[]; m: Material[]; t: Transaction[]; i: Invoice[]; w: Worker[]; d: Delivery[] }>({ p: [], m: [], t: [], i: [], w: [], d: [] });

  // Modal states
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showExportPicker, setShowExportPicker] = useState(false);
  const [showInfo, setShowInfo] = useState<{ visible: boolean; title: string; message: string; type: 'success' | 'error' | 'info' }>({ visible: false, title: '', message: '', type: 'info' });

  const load = useCallback(async () => {
    const name = await getCo();
    setCoState(name);
    setCoInput(name);
    const [p, m, t, i, w, d] = await Promise.all([pStore.all(), mStore.all(), tStore.all(), iStore.all(), wStore.all(), dStore.all()]);
    setStats({ projects: p.length, materials: m.length, transactions: t.length, invoices: i.length, workers: w.length, deliveries: d.length });
    setAllData({ p, m, t, i, w, d });
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const saveCo = async () => {
    if (coInput.trim()) {
      await setCo(coInput.trim());
      setCoState(coInput.trim());
    }
    setEditCo(false);
  };

  const doReset = async () => {
    setShowResetConfirm(false);
    try {
      await clearAll();
      await setOnb(false);
      onReset?.();
    } catch (e) {
      setShowInfo({ visible: true, title: 'Error', message: 'Failed to reset data. Please try again.', type: 'error' });
    }
  };

  const exportJSON = async () => {
    setShowExportPicker(false);
    try {
      const data = { exportDate: new Date().toISOString(), company: co, projects: allData.p, materials: allData.m, transactions: allData.t, invoices: allData.i, workers: allData.w, deliveries: allData.d };
      const json = JSON.stringify(data, null, 2);
      
      const fileUri = `${(FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory}BuildPro_Export_${new Date().toISOString().split('T')[0]}.json`;
      await FileSystem.writeAsStringAsync(fileUri, json);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        await Share.share({ message: json, title: 'BuildPro Data' });
      }
    } catch {
      setShowInfo({ visible: true, title: 'Error', message: 'Could not export limit data.', type: 'error' });
    }
  };

  const exportCSV = async (type: 'projects' | 'materials' | 'transactions' | 'invoices' | 'workers' | 'deliveries') => {
    setShowExportPicker(false);
    try {
      let csv = '';
      switch (type) {
        case 'projects':
          csv = toCSV(
            ['Name', 'Location', 'Status', 'Budget', 'Spent', 'Start Date', 'End Date', 'Description', 'Phases'],
            allData.p.map(p => [p.name, p.location, p.status, p.budget, p.spent, p.startDate, p.endDate, p.description, p.phases.map(ph => `${ph.name}(${ph.status})`).join('; ')])
          );
          break;
        case 'materials':
          csv = toCSV(
            ['Name', 'Category', 'Unit', 'Stock', 'Min Stock', 'Max Stock', 'Unit Price', 'Supplier', 'Daily Usage', 'QR Code', 'Last Restocked'],
            allData.m.map(m => [m.name, m.category, m.unit, m.currentStock, m.minStock, m.maxStock, m.unitPrice, m.supplier, m.dailyUsageRate, m.qrCode, m.lastRestocked])
          );
          break;
        case 'transactions':
          csv = toCSV(
            ['Date', 'Type', 'Category', 'Payee', 'Amount', 'Status', 'Method', 'Description'],
            allData.t.map(t => [t.date, t.type, t.category, t.payee, t.amount, t.status, t.method, t.description])
          );
          break;
        case 'invoices':
          csv = toCSV(
            ['Invoice #', 'Date', 'Due Date', 'Type', 'Party', 'Contact', 'Amount', 'Tax', 'Total', 'Status', 'Reconciled', 'Items'],
            allData.i.map(i => [i.invoiceNumber, i.date, i.dueDate, i.type, i.partyName, i.partyContact, i.amount, i.tax, i.total, i.status, i.reconciled ? 'Yes' : 'No', i.items.map(it => `${it.description}x${it.quantity}`).join('; ')])
          );
          break;
        case 'workers':
          csv = toCSV(
            ['Name', 'Role', 'Pay Type', 'Rate', 'Phone', 'Status', 'Join Date'],
            allData.w.map(w => [w.name, w.role, w.type, w.rate, w.phone, w.status, w.joinDate])
          );
          break;
        case 'deliveries':
          csv = toCSV(
            ['Material', 'Supplier', 'Quantity', 'Unit', 'Expected Date', 'Status', 'Geo Address'],
            allData.d.map(d => [d.materialName, d.supplier, d.quantity, d.unit, d.expectedDate, d.status, d.geoAddress || ''])
          );
          break;
      }
      
      const filename = `BuildPro_${type}_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = `${(FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory}${filename}`;
      await (FileSystem as any).writeAsStringAsync(fileUri, csv);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { UTI: 'public.comma-separated-values-text', mimeType: 'text/csv' });
      } else {
        await Share.share({ message: csv, title: filename });
      }
    } catch {
      setShowInfo({ visible: true, title: 'Error', message: 'Could not export data.', type: 'error' });
    }
  };

  const exportFullCSV = async () => {
    setShowExportPicker(false);
    try {
      let full = '=== PROJECTS ===\n';
      full += toCSV(['Name', 'Location', 'Status', 'Budget', 'Spent'], allData.p.map(p => [p.name, p.location, p.status, p.budget, p.spent]));
      full += '\n\n=== MATERIALS ===\n';
      full += toCSV(['Name', 'Category', 'Stock', 'Min', 'Unit Price', 'Supplier'], allData.m.map(m => [m.name, m.category, m.currentStock, m.minStock, m.unitPrice, m.supplier]));
      full += '\n\n=== TRANSACTIONS ===\n';
      full += toCSV(['Date', 'Type', 'Payee', 'Amount', 'Status', 'Method'], allData.t.map(t => [t.date, t.type, t.payee, t.amount, t.status, t.method]));
      full += '\n\n=== INVOICES ===\n';
      full += toCSV(['Invoice #', 'Party', 'Total', 'Status', 'Due'], allData.i.map(i => [i.invoiceNumber, i.partyName, i.total, i.status, i.dueDate]));
      full += '\n\n=== WORKERS ===\n';
      full += toCSV(['Name', 'Role', 'Type', 'Rate', 'Status'], allData.w.map(w => [w.name, w.role, w.type, w.rate, w.status]));
      full += '\n\n=== DELIVERIES ===\n';
      full += toCSV(['Material', 'Supplier', 'Qty', 'Status'], allData.d.map(d => [d.materialName, d.supplier, d.quantity, d.status]));

      const filename = `BuildPro_FullReport_${new Date().toISOString().split('T')[0]}.txt`;
      const fileUri = `${(FileSystem as any).documentDirectory || (FileSystem as any).cacheDirectory}${filename}`;
      await (FileSystem as any).writeAsStringAsync(fileUri, full);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/plain' });
      } else {
        await Share.share({ message: full, title: filename });
      }
    } catch {
      setShowInfo({ visible: true, title: 'Error', message: 'Could not export full data report.', type: 'error' });
    }
  };

  const totalRecords = stats.projects + stats.materials + stats.transactions + stats.invoices + stats.workers + stats.deliveries;

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <ScrollView contentContainerStyle={st.cc} showsVerticalScrollIndicator={false}>
        <Text style={st.title}>Settings</Text>

        {/* Company Profile */}
        <View style={[st.card, SH.md]}>
          <View style={st.cH}>
            <Ionicons name="business" size={18} color={C.priAccent} />
            <Text style={st.cT}>Company Profile</Text>
          </View>
          {editCo ? (
            <View>
              <FF label="Company Name" placeholder="Enter company name" value={coInput} onChangeText={setCoInput} />
              <View style={{ flexDirection: 'row', gap: S.sm }}>
                <TouchableOpacity style={[st.actionBtn, { backgroundColor: C.priAccent, flex: 1 }]} onPress={saveCo}>
                  <Ionicons name="checkmark" size={16} color="#FFF" /><Text style={st.actionBtnT}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[st.actionBtn, { backgroundColor: C.brdL, flex: 1 }]} onPress={() => { setCoInput(co); setEditCo(false); }}>
                  <Text style={[st.actionBtnT, { color: C.text2 }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={st.coRow} onPress={() => setEditCo(true)} activeOpacity={0.7}>
              <View>
                <Text style={st.coN}>{co || 'Tap to set company name'}</Text>
                <Text style={st.coSub}>Tap to edit</Text>
              </View>
              <Ionicons name="create-outline" size={20} color={C.priAccent} />
            </TouchableOpacity>
          )}
        </View>

        {/* Data Overview */}
        <View style={[st.card, SH.md]}>
          <View style={st.cH}>
            <Ionicons name="server" size={18} color={C.priAccent} />
            <Text style={st.cT}>Data Overview</Text>
          </View>
          <View style={st.statsGrid}>
            {[
              { label: 'Projects', value: stats.projects, icon: 'business' as const, color: C.priAccent },
              { label: 'Materials', value: stats.materials, icon: 'cube' as const, color: C.gold },
              { label: 'Transactions', value: stats.transactions, icon: 'card' as const, color: C.ok },
              { label: 'Invoices', value: stats.invoices, icon: 'document-text' as const, color: C.purple },
              { label: 'Workers', value: stats.workers, icon: 'people' as const, color: C.info },
              { label: 'Deliveries', value: stats.deliveries, icon: 'car' as const, color: C.warn },
            ].map((item, idx) => (
              <View key={idx} style={st.statItem}>
                <Ionicons name={item.icon} size={18} color={item.color} />
                <Text style={st.statVal}>{item.value}</Text>
                <Text style={st.statLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
          <View style={st.totalRow}>
            <Text style={st.totalLabel}>Total Records</Text>
            <Text style={st.totalVal}>{totalRecords}</Text>
          </View>
        </View>

        {/* Export Data */}
        <View style={[st.card, SH.md]}>
          <View style={st.cH}>
            <Ionicons name="download" size={18} color={C.ok} />
            <Text style={st.cT}>Export & Backup</Text>
          </View>
          <Text style={st.hint}>Export your data in different formats. Share via email, WhatsApp, or save to files.</Text>

          <TouchableOpacity style={[st.exportBtn, { backgroundColor: C.priAccent }]} onPress={exportJSON} activeOpacity={0.85}>
            <Ionicons name="code-slash" size={18} color="#FFF" />
            <View style={{ flex: 1 }}>
              <Text style={st.exportBtnT}>Export as JSON</Text>
              <Text style={st.exportBtnS}>Full data backup, importable format</Text>
            </View>
            <Ionicons name="share-outline" size={18} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>

          <TouchableOpacity style={[st.exportBtn, { backgroundColor: C.ok }]} onPress={exportFullCSV} activeOpacity={0.85}>
            <Ionicons name="document-text" size={18} color="#FFF" />
            <View style={{ flex: 1 }}>
              <Text style={st.exportBtnT}>Export Full Report (CSV)</Text>
              <Text style={st.exportBtnS}>All data in one file, opens in Excel</Text>
            </View>
            <Ionicons name="share-outline" size={18} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>

          <Text style={[st.hint, { marginTop: S.lg, marginBottom: S.sm }]}>Export individual tables as CSV (Excel-compatible):</Text>
          <View style={st.csvGrid}>
            {[
              { label: 'Projects', key: 'projects' as const, icon: 'business' as const, count: stats.projects },
              { label: 'Materials', key: 'materials' as const, icon: 'cube' as const, count: stats.materials },
              { label: 'Transactions', key: 'transactions' as const, icon: 'card' as const, count: stats.transactions },
              { label: 'Invoices', key: 'invoices' as const, icon: 'document-text' as const, count: stats.invoices },
              { label: 'Workers', key: 'workers' as const, icon: 'people' as const, count: stats.workers },
              { label: 'Deliveries', key: 'deliveries' as const, icon: 'car' as const, count: stats.deliveries },
            ].map((item) => (
              <TouchableOpacity key={item.key} style={st.csvBtn} onPress={() => exportCSV(item.key)} activeOpacity={0.8} disabled={item.count === 0}>
                <Ionicons name={item.icon} size={16} color={item.count > 0 ? C.priAccent : C.text3} />
                <Text style={[st.csvBtnT, item.count === 0 && { color: C.text3 }]}>{item.label}</Text>
                <Text style={st.csvBtnC}>{item.count}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* About */}
        <View style={[st.card, SH.md]}>
          <View style={st.cH}>
            <Ionicons name="information-circle" size={18} color={C.priAccent} />
            <Text style={st.cT}>About</Text>
          </View>
          <Text style={st.about}>BuildPro v3.0</Text>
          <Text style={st.aboutS}>Construction Management Platform</Text>
          <Text style={st.aboutS}>Inventory • Payments • Invoices • Analytics</Text>
          <Text style={st.aboutS}>QR Tracking • AI Forecasting • Geo-Deliveries</Text>
        </View>

        {/* Danger Zone */}
        <View style={[st.card, SH.md, { borderWidth: 1, borderColor: C.errL }]}>
          <View style={st.cH}>
            <Ionicons name="warning" size={18} color={C.err} />
            <Text style={[st.cT, { color: C.err }]}>Danger Zone</Text>
          </View>
          <Text style={st.hint}>This will permanently delete all data including projects, materials, transactions, invoices, workers, and deliveries.</Text>
          <TouchableOpacity style={st.resetBtn} onPress={() => setShowResetConfirm(true)} activeOpacity={0.8}>
            <Ionicons name="trash" size={18} color={C.err} />
            <Text style={st.resetT}>Reset All Data</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        visible={showResetConfirm}
        title="Reset All Data?"
        message={`This will permanently delete all ${totalRecords} records including projects, materials, transactions, invoices, workers, and deliveries.\n\nThis action cannot be undone.`}
        confirmText="Delete Everything"
        cancelText="Cancel"
        destructive
        icon="trash"
        onConfirm={doReset}
        onCancel={() => setShowResetConfirm(false)}
      />

      {/* Info Modal */}
      <InfoModal
        visible={showInfo.visible}
        title={showInfo.title}
        message={showInfo.message}
        type={showInfo.type}
        onClose={() => setShowInfo(prev => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  cc: { padding: S.xl },
  title: { fontSize: F.t1, fontWeight: '900', color: C.pri, marginBottom: S.xl },
  card: { backgroundColor: C.card, borderRadius: R.lg, padding: S.lg, marginBottom: S.lg },
  cH: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginBottom: S.md },
  cT: { fontSize: F.lg, fontWeight: '700', color: C.text },
  coRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.brdL, borderRadius: R.md, padding: S.lg },
  coN: { fontSize: F.xxl, fontWeight: '800', color: C.priAccent },
  coSub: { fontSize: F.xs, color: C.text3, marginTop: 2 },
  hint: { fontSize: F.sm, color: C.text3, lineHeight: 20, marginBottom: S.md },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md },
  statItem: { width: '30%', backgroundColor: C.brdL, borderRadius: R.md, padding: S.md, alignItems: 'center' },
  statVal: { fontSize: F.xl, fontWeight: '800', color: C.text, marginTop: S.xs },
  statLabel: { fontSize: F.xs, color: C.text3, marginTop: 2 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: S.lg, paddingTop: S.md, borderTopWidth: 1, borderTopColor: C.brdL },
  totalLabel: { fontSize: F.md, fontWeight: '600', color: C.text2 },
  totalVal: { fontSize: F.xl, fontWeight: '800', color: C.priAccent },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: R.md, paddingVertical: 14, gap: S.sm },
  actionBtnT: { fontSize: F.md, fontWeight: '600', color: '#FFF' },
  exportBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: R.md, padding: S.lg, gap: S.md, marginBottom: S.md },
  exportBtnT: { fontSize: F.md, fontWeight: '600', color: '#FFF' },
  exportBtnS: { fontSize: F.xs, color: 'rgba(255,255,255,0.7)', marginTop: 1 },
  csvGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.sm },
  csvBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.brdL, borderRadius: R.md, paddingVertical: S.md, paddingHorizontal: S.md, gap: S.sm, width: '48%' },
  csvBtnT: { fontSize: F.sm, fontWeight: '600', color: C.text, flex: 1 },
  csvBtnC: { fontSize: F.xs, fontWeight: '700', color: C.text3, backgroundColor: C.card, borderRadius: R.sm, paddingHorizontal: 6, paddingVertical: 2 },
  about: { fontSize: F.lg, fontWeight: '700', color: C.text },
  aboutS: { fontSize: F.md, color: C.text3, marginTop: 4 },
  resetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.errL, borderRadius: R.md, paddingVertical: 14, gap: S.sm },
  resetT: { fontSize: F.md, fontWeight: '600', color: C.err },
});
