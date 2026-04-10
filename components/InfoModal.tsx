import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, S, R, F, SH } from '../lib/theme';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  onClose: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  type?: 'success' | 'error' | 'info';
}

export default function InfoModal({ visible, title, message, onClose, icon, type = 'info' }: Props) {
  const color = type === 'success' ? C.ok : type === 'error' ? C.err : C.priAccent;
  const bg = type === 'success' ? C.okL : type === 'error' ? C.errL : C.infoL;
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={st.overlay}>
        <View style={[st.card, SH.lg]}>
          <View style={[st.iconWrap, { backgroundColor: bg }]}>
            <Ionicons name={icon || (type === 'success' ? 'checkmark-circle' : type === 'error' ? 'alert-circle' : 'information-circle')} size={28} color={color} />
          </View>
          <Text style={st.title}>{title}</Text>
          <Text style={st.msg}>{message}</Text>
          <TouchableOpacity style={[st.btn, { backgroundColor: color }]} onPress={onClose} activeOpacity={0.8}>
            <Text style={st.btnT}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: S.xl },
  card: { backgroundColor: C.card, borderRadius: R.xl, padding: S.xxl, width: '100%', maxWidth: 380, alignItems: 'center' },
  iconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: S.lg },
  title: { fontSize: F.xl, fontWeight: '700', color: C.text, marginBottom: S.sm, textAlign: 'center' },
  msg: { fontSize: F.md, color: C.text2, textAlign: 'center', lineHeight: 22, marginBottom: S.xxl },
  btn: { paddingVertical: 14, paddingHorizontal: S.xxxxl, borderRadius: R.md, alignItems: 'center' },
  btnT: { fontSize: F.md, fontWeight: '600', color: '#FFF' },
});
