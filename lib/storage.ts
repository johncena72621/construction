import AsyncStorage from '@react-native-async-storage/async-storage';
import { Project, Material, MaterialLog, Transaction, Invoice, Worker, Delivery, AppAlert, PaymentConfig } from './types';

const K = {
  PROJECTS: '@bp3_projects', MATERIALS: '@bp3_materials', MATLOGS: '@bp3_matlogs',
  TRANSACTIONS: '@bp3_tx', INVOICES: '@bp3_inv', WORKERS: '@bp3_workers',
  DELIVERIES: '@bp3_del', ALERTS: '@bp3_alerts', COMPANY: '@bp3_co',
  ONBOARDED: '@bp3_onb', INV_CTR: '@bp3_ic', PAY_CFG: '@bp3_pay',
};
async function gl<T>(k: string): Promise<T[]> { try { const r = await AsyncStorage.getItem(k); return r ? JSON.parse(r) : []; } catch { return []; } }
async function sl<T>(k: string, d: T[]) { await AsyncStorage.setItem(k, JSON.stringify(d)); }

export const getCo = async () => (await AsyncStorage.getItem(K.COMPANY)) || '';
export const setCo = async (n: string) => AsyncStorage.setItem(K.COMPANY, n);
export const getOnb = async () => (await AsyncStorage.getItem(K.ONBOARDED)) === '1';
export const setOnb = async (v: boolean) => AsyncStorage.setItem(K.ONBOARDED, v ? '1' : '0');
export const getPayCfg = async (): Promise<PaymentConfig> => { try { const r = await AsyncStorage.getItem(K.PAY_CFG); return r ? JSON.parse(r) : { razorpayKey: '', razorpaySecret: '', upiId: '', bankName: '', accountNumber: '', ifsc: '', accountHolder: '' }; } catch { return { razorpayKey: '', razorpaySecret: '', upiId: '', bankName: '', accountNumber: '', ifsc: '', accountHolder: '' }; } };
export const setPayCfg = async (c: PaymentConfig) => AsyncStorage.setItem(K.PAY_CFG, JSON.stringify(c));
export async function nextInvNum() { const r = await AsyncStorage.getItem(K.INV_CTR); const n = r ? parseInt(r, 10) + 1 : 1; await AsyncStorage.setItem(K.INV_CTR, String(n)); return `INV-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`; }

function crud<T extends { id: string }>(key: string) {
  return {
    all: () => gl<T>(key),
    save: (d: T[]) => sl(key, d),
    add: async (item: T) => { const l = await gl<T>(key); l.unshift(item); await sl(key, l); },
    upd: async (item: T) => { const l = await gl<T>(key); const i = l.findIndex(x => x.id === item.id); if (i >= 0) l[i] = item; await sl(key, l); },
    del: async (id: string) => { const l = await gl<T>(key); await sl(key, l.filter(x => x.id !== id)); },
  };
}
export const pStore = crud<Project>(K.PROJECTS);
export const mStore = crud<Material>(K.MATERIALS);
export const mlStore = crud<MaterialLog>(K.MATLOGS);
export const tStore = crud<Transaction>(K.TRANSACTIONS);
export const iStore = crud<Invoice>(K.INVOICES);
export const wStore = crud<Worker>(K.WORKERS);
export const dStore = crud<Delivery>(K.DELIVERIES);
export const aStore = crud<AppAlert>(K.ALERTS);
export async function clearAll() { await AsyncStorage.multiRemove(Object.values(K)); }
