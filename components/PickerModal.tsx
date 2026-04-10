import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, S, R, F, SH } from '../lib/theme';

interface Option {
  value: string;
  label: string;
  icon?: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
  title: string;
  options: Option[];
  selected?: string;
}

export default function PickerModal({ visible, onClose, onSelect, title, options, selected }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <TouchableOpacity style={st.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[st.sheet, SH.lg]}>
          <View style={st.handle} />
          <Text style={st.title}>{title}</Text>
          <FlatList
            data={options}
            keyExtractor={i => i.value}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const active = selected === item.value;
              return (
                <TouchableOpacity
                  style={[st.opt, active && st.optActive]}
                  onPress={() => { onSelect(item.value); onClose(); }}
                  activeOpacity={0.7}
                >
                  {item.icon ? (
                    <View style={[st.iconW, active && st.iconWActive]}>
                      <Ionicons name={item.icon as any} size={18} color={active ? '#FFF' : C.text2} />
                    </View>
                  ) : null}
                  <Text style={[st.optT, active && st.optTActive]}>{item.label}</Text>
                  {active && <Ionicons name="checkmark-circle" size={22} color={C.priAccent} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: C.card, borderTopLeftRadius: R.xxl, borderTopRightRadius: R.xxl, padding: S.xxl, paddingTop: S.md, maxHeight: '70%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.brd, alignSelf: 'center', marginBottom: S.lg },
  title: { fontSize: F.xl, fontWeight: '800', color: C.pri, marginBottom: S.lg },
  opt: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: S.md, borderRadius: R.md, marginBottom: S.xs },
  optActive: { backgroundColor: C.priAccent + '10' },
  iconW: { width: 36, height: 36, borderRadius: R.sm, backgroundColor: C.brdL, alignItems: 'center', justifyContent: 'center', marginRight: S.md },
  iconWActive: { backgroundColor: C.priAccent },
  optT: { flex: 1, fontSize: F.lg, fontWeight: '500', color: C.text },
  optTActive: { fontWeight: '700', color: C.priAccent },
});
