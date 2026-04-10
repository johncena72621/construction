import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, S, R, F, SH } from '../lib/theme';
import { parseQR } from '../lib/helpers';
import { mStore } from '../lib/storage';
import { Material } from '../lib/types';
import InfoModal from '../components/InfoModal';

export default function ScannerScreen({ navigation }: any) {
  const [scanInfo, setScanInfo] = useState<{ visible: boolean; title: string; message: string; type: 'success' | 'error' | 'info' }>({ visible: false, title: '', message: '', type: 'info' });
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState<Material | null>(null);
  const [scanning, setScanning] = useState(false);
  const [hasPerm, setHasPerm] = useState(false);
  const [CameraView, setCameraView] = useState<any>(null);

  useEffect(() => {
    // Dynamically import camera to avoid web crashes
    if (Platform.OS !== 'web') {
      try {
        const cam = require('expo-camera');
        if (cam.CameraView) {
          setCameraView(() => cam.CameraView);
          cam.Camera?.requestCameraPermissionsAsync?.().then((r: any) => setHasPerm(r?.status === 'granted'));
        }
      } catch {}
    }
  }, []);

  const handleBarcode = async (data: string) => {
    setScanning(false);
    await lookupMaterial(data);
  };

  const lookupMaterial = async (code: string) => {
    const mats = await mStore.all();
    // Try QR format first
    const parsed = parseQR(code);
    let found: Material | undefined;
    if (parsed) {
      found = mats.find(m => m.id === parsed.id);
    }
    // Fallback: search by qrCode field or id
    if (!found) {
      found = mats.find(m => m.qrCode === code || m.id === code || m.name.toLowerCase() === code.toLowerCase());
    }
    if (found) {
      setResult(found);
    } else {
      setScanInfo({ visible: true, title: 'Not Found', message: `No material matches "${code.slice(0, 30)}". Add it first in Inventory.`, type: 'error' });
    }
  };

  const handleManualSearch = () => {
    if (manualCode.trim()) lookupMaterial(manualCode.trim());
  };

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <View style={st.hdr}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.back}><Ionicons name="arrow-back" size={24} color={C.text} /></TouchableOpacity>
        <Text style={st.title}>QR / Barcode Scanner</Text>
      </View>

      {scanning && CameraView && hasPerm ? (
        <View style={st.camWrap}>
          <CameraView
            style={st.cam}
            barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39'] }}
            onBarcodeScanned={(e: any) => { if (e?.data) handleBarcode(e.data); }}
          />
          <View style={st.overlay}>
            <View style={st.scanBox}>
              <View style={[st.corner, st.tl]} />
              <View style={[st.corner, st.tr]} />
              <View style={[st.corner, st.bl]} />
              <View style={[st.corner, st.br]} />
            </View>
            <Text style={st.scanHint}>Point camera at QR code or barcode</Text>
          </View>
          <TouchableOpacity style={st.closeBtn} onPress={() => setScanning(false)}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={st.content}>
          {/* Camera Scan Button */}
          <TouchableOpacity
            style={[st.scanMainBtn, SH.lg]}
            onPress={() => {
              if (Platform.OS === 'web') {
                setScanInfo({ visible: true, title: 'Camera', message: 'Camera scanning works on mobile devices. Use manual entry below.', type: 'info' });
              } else if (!hasPerm) {
                setScanInfo({ visible: true, title: 'Permission', message: 'Camera permission is required. Please grant access in settings.', type: 'info' });
              } else {
                setScanning(true); setResult(null);
              }
            }}
            activeOpacity={0.85}
          >
            <View style={st.scanIconBig}><Ionicons name="scan" size={40} color="#FFF" /></View>
            <Text style={st.scanMainT}>Tap to Scan</Text>
            <Text style={st.scanMainS}>QR Code, Barcode, or Material Tag</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={st.divRow}><View style={st.divLine} /><Text style={st.divText}>OR</Text><View style={st.divLine} /></View>

          {/* Manual Entry */}
          <View style={[st.manualBox, SH.sm]}>
            <Text style={st.manualLabel}>Manual Lookup</Text>
            <View style={st.manualRow}>
              <TextInput style={st.manualInput} placeholder="Enter QR code, ID, or material name" placeholderTextColor={C.text3} value={manualCode} onChangeText={setManualCode} returnKeyType="search" onSubmitEditing={handleManualSearch} />
              <TouchableOpacity style={st.manualBtn} onPress={handleManualSearch}><Ionicons name="search" size={20} color="#FFF" /></TouchableOpacity>
            </View>
          </View>

          {/* Result */}
          {result && (
            <View style={[st.resultCard, SH.md]}>
              <View style={st.resH}>
                <View style={[st.resIcon, { backgroundColor: result.currentStock <= result.minStock ? C.errL : C.okL }]}>
                  <Ionicons name="cube" size={24} color={result.currentStock <= result.minStock ? C.err : C.ok} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.resName}>{result.name}</Text>
                  <Text style={st.resSub}>{result.category} \u2022 {result.supplier || 'No supplier'}</Text>
                </View>
                {result.currentStock <= result.minStock && <View style={st.lowTag}><Text style={st.lowTagT}>LOW</Text></View>}
              </View>
              <View style={st.resGrid}>
                {[['Stock', `${result.currentStock} ${result.unit}`, result.currentStock <= result.minStock ? C.err : C.text],
                  ['Unit Price', `\u20B9${result.unitPrice}`, C.text],
                  ['Daily Use', `${result.dailyUsageRate} ${result.unit}/d`, C.text],
                  ['Days Left', result.dailyUsageRate > 0 ? `~${Math.floor(result.currentStock / result.dailyUsageRate)}d` : '-', result.dailyUsageRate > 0 && result.currentStock / result.dailyUsageRate < 7 ? C.err : C.ok],
                ].map(([l, v, c], i) => <View key={i} style={st.resItem}><Text style={st.resLabel}>{l as string}</Text><Text style={[st.resVal, { color: c as string }]}>{v as string}</Text></View>)}
              </View>
              <View style={st.resQR}><Ionicons name="qr-code" size={16} color={C.text3} /><Text style={st.resQRT}>{result.qrCode || result.id}</Text></View>
              <TouchableOpacity style={st.resBtn} onPress={() => { setResult(null); navigation.navigate('Inventory'); }} activeOpacity={0.8}>
                <Text style={st.resBtnT}>View in Inventory</Text><Ionicons name="arrow-forward" size={16} color={C.priAccent} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
      <InfoModal visible={scanInfo.visible} title={scanInfo.title} message={scanInfo.message} type={scanInfo.type} onClose={() => setScanInfo(prev => ({ ...prev, visible: false }))} />
    </SafeAreaView>
  );
}
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  hdr: { flexDirection: 'row', alignItems: 'center', padding: S.xl, paddingBottom: S.md },
  back: { marginRight: S.md },
  title: { fontSize: F.xxl, fontWeight: '800', color: C.pri },
  content: { flex: 1, padding: S.xl },
  camWrap: { flex: 1, position: 'relative' },
  cam: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  scanBox: { width: 240, height: 240, position: 'relative' },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: C.priAccent, borderWidth: 3 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 12 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 12 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 12 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 12 },
  scanHint: { color: '#FFF', fontSize: F.md, fontWeight: '600', marginTop: S.xxl, textShadowColor: '#000', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  closeBtn: { position: 'absolute', top: S.xl, right: S.xl, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  scanMainBtn: { backgroundColor: C.priAccent, borderRadius: R.xl, padding: S.xxxl, alignItems: 'center', marginBottom: S.xxl },
  scanIconBig: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: S.lg },
  scanMainT: { fontSize: F.xxl, fontWeight: '800', color: '#FFF' },
  scanMainS: { fontSize: F.sm, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  divRow: { flexDirection: 'row', alignItems: 'center', marginBottom: S.xxl },
  divLine: { flex: 1, height: 1, backgroundColor: C.brd },
  divText: { fontSize: F.sm, color: C.text3, marginHorizontal: S.lg, fontWeight: '600' },
  manualBox: { backgroundColor: C.card, borderRadius: R.lg, padding: S.lg, marginBottom: S.xxl },
  manualLabel: { fontSize: F.sm, fontWeight: '600', color: C.text2, marginBottom: S.sm },
  manualRow: { flexDirection: 'row', gap: S.sm },
  manualInput: { flex: 1, backgroundColor: C.brdL, borderRadius: R.md, paddingHorizontal: S.lg, paddingVertical: 12, fontSize: F.md, color: C.text },
  manualBtn: { width: 44, height: 44, borderRadius: R.md, backgroundColor: C.priAccent, alignItems: 'center', justifyContent: 'center' },
  resultCard: { backgroundColor: C.card, borderRadius: R.lg, padding: S.xl },
  resH: { flexDirection: 'row', alignItems: 'center', marginBottom: S.lg },
  resIcon: { width: 48, height: 48, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', marginRight: S.md },
  resName: { fontSize: F.xl, fontWeight: '700', color: C.text },
  resSub: { fontSize: F.sm, color: C.text3, marginTop: 2 },
  lowTag: { backgroundColor: C.errL, borderRadius: R.sm, paddingHorizontal: 8, paddingVertical: 3 },
  lowTagT: { fontSize: F.xs, fontWeight: '800', color: C.err },
  resGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: S.md, marginBottom: S.lg },
  resItem: { width: '47%', backgroundColor: C.brdL, borderRadius: R.sm, padding: S.md },
  resLabel: { fontSize: F.xs, color: C.text3, textTransform: 'uppercase', letterSpacing: 0.5 },
  resVal: { fontSize: F.lg, fontWeight: '700', marginTop: 2 },
  resQR: { flexDirection: 'row', alignItems: 'center', gap: S.sm, marginBottom: S.lg },
  resQRT: { fontSize: F.sm, color: C.text3, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  resBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.priAccent, borderRadius: R.md, paddingVertical: S.md, gap: S.sm },
  resBtnT: { fontSize: F.md, fontWeight: '600', color: C.priAccent },
});
