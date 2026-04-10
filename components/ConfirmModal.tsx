import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, S, R, F, SH } from '../lib/theme';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

export default function ConfirmModal({ visible, title, message, confirmText = 'Confirm', cancelText = 'Cancel', destructive = false, onConfirm, onCancel, icon }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={st.overlay}>
        <View style={[st.card, SH.lg]}>
          {icon && (
            <View style={[st.iconWrap, { backgroundColor: destructive ? C.errL : C.infoL }]}>
              <Ionicons name={icon} size={28} color={destructive ? C.err : C.priAccent} />
            </View>
          )}
          <Text style={st.title}>{title}</Text>
          <Text style={st.msg}>{message}</Text>
          <View style={st.btnRow}>
            <TouchableOpacity style={[st.btn, st.cancelBtn]} onPress={onCancel} activeOpacity={0.8}>
              <Text style={st.cancelT}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.btn, { backgroundColor: destructive ? C.err : C.priAccent }]} onPress={onConfirm} activeOpacity={0.8}>
              <Text style={st.confirmT}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
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
  btnRow: { flexDirection: 'row', gap: S.md, width: '100%' },
  btn: { flex: 1, paddingVertical: 14, borderRadius: R.md, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: C.brdL },
  cancelT: { fontSize: F.md, fontWeight: '600', color: C.text2 },
  confirmT: { fontSize: F.md, fontWeight: '600', color: '#FFF' },
});
