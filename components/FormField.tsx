import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { C, S, R, F } from '../lib/theme';

interface Props extends TextInputProps {
  label: string;
  err?: string;
  hint?: string;
  inputType?: 'text' | 'name' | 'phone' | 'number' | 'currency' | 'date';
  maxLen?: number;
}

// Only digits
const onlyDigits = (v: string) => v.replace(/[^0-9]/g, '');
// Only digits + one decimal point
const onlyNumber = (v: string) => {
  let r = v.replace(/[^0-9.]/g, '');
  const parts = r.split('.');
  if (parts.length > 2) r = parts[0] + '.' + parts.slice(1).join('');
  return r;
};
// Only letters, spaces, dots, hyphens (for names)
const onlyName = (v: string) => v.replace(/[^a-zA-Z\s.\-']/g, '');
// Phone: only digits, max 10
const onlyPhone = (v: string) => v.replace(/[^0-9]/g, '').slice(0, 10);
// Date: auto-format YYYY-MM-DD
const formatDateInput = (v: string) => {
  const d = v.replace(/[^0-9]/g, '');
  if (d.length <= 4) return d;
  if (d.length <= 6) return d.slice(0, 4) + '-' + d.slice(4);
  return d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6, 8);
};

export default function FF({ label, err, hint, inputType, maxLen, onChangeText, style, ...rest }: Props) {
  const [localErr, setLocalErr] = useState('');
  
  const handleChange = (raw: string) => {
    let v = raw;
    let error = '';
    
    switch (inputType) {
      case 'name':
        v = onlyName(raw);
        if (raw !== v) error = 'Only letters allowed';
        break;
      case 'phone':
        v = onlyPhone(raw);
        if (v.length > 0 && v.length < 10 && raw.length >= v.length) error = `${10 - v.length} more digit(s) needed`;
        break;
      case 'number':
      case 'currency':
        v = onlyNumber(raw);
        break;
      case 'date':
        v = formatDateInput(raw);
        if (v.length === 10) {
          const [y, m, d] = v.split('-').map(Number);
          if (m < 1 || m > 12) error = 'Invalid month';
          else if (d < 1 || d > 31) error = 'Invalid day';
          else if (y < 2020 || y > 2099) error = 'Year must be 2020-2099';
        }
        break;
      default:
        break;
    }
    
    if (maxLen && v.length > maxLen) v = v.slice(0, maxLen);
    setLocalErr(error);
    onChangeText?.(v);
  };

  const displayErr = err || localErr;
  const kbType = inputType === 'phone' ? 'phone-pad' as const 
    : (inputType === 'number' || inputType === 'currency') ? 'decimal-pad' as const 
    : inputType === 'date' ? 'number-pad' as const 
    : rest.keyboardType || ('default' as const);

  return (
    <View style={s.c}>
      <Text style={s.l}>{label}</Text>
      <TextInput 
        style={[s.i, displayErr ? s.ie : null, style]} 
        placeholderTextColor={C.text3} 
        keyboardType={kbType}
        maxLength={inputType === 'phone' ? 10 : inputType === 'date' ? 10 : maxLen}
        onChangeText={handleChange}
        {...rest} 
      />
      {hint && !displayErr ? <Text style={s.h}>{hint}</Text> : null}
      {displayErr ? <Text style={s.e}>{displayErr}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  c: { marginBottom: S.lg },
  l: { fontSize: F.sm, fontWeight: '600', color: C.text, marginBottom: 6, letterSpacing: 0.3 },
  i: { backgroundColor: C.brdL, borderRadius: R.md, paddingHorizontal: S.lg, paddingVertical: 14, fontSize: F.md, color: C.text, borderWidth: 1.5, borderColor: 'transparent' },
  ie: { borderColor: C.err },
  e: { fontSize: F.xs, color: C.err, marginTop: 4 },
  h: { fontSize: F.xs, color: C.text3, marginTop: 4 },
});
