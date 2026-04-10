import React from 'react';
import { View } from 'react-native';
import { C, R } from '../lib/theme';
export default function PB({ progress = 0, h = 6, color, bg }: { progress: number; h?: number; color?: string; bg?: string }) {
  const p = Math.min(Math.max(progress, 0), 1);
  const c = color || (p > 0.9 ? C.err : p > 0.7 ? C.warn : C.priAccent);
  return <View style={{ height: h, borderRadius: R.full, backgroundColor: bg || C.brdL, overflow: 'hidden', width: '100%' }}><View style={{ height: h, borderRadius: R.full, backgroundColor: c, width: `${p * 100}%` }} /></View>;
}
