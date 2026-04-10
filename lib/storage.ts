import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Project, Material, MaterialLog, Transaction, Invoice, Worker, Delivery, AppAlert, PaymentConfig } from './types';

const API_URL = 'https://construction-production-81cf.up.railway.app/api';

const K = {
  PROJECTS: '@bp3_projects', MATERIALS: '@bp3_materials', MATLOGS: '@bp3_matlogs',
  TRANSACTIONS: '@bp3_tx', INVOICES: '@bp3_inv', WORKERS: '@bp3_workers',
  DELIVERIES: '@bp3_del', ALERTS: '@bp3_alerts', COMPANY: '@bp3_co',
  ONBOARDED: '@bp3_onb', INV_CTR: '@bp3_ic', PAY_CFG: '@bp3_pay',
  SYNC_Q: '@bp3_sync_q',
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

// OFFLINE QUEUE
type SyncAction = { type: 'ADD' | 'UPD' | 'DEL'; endpoint: string; data?: any; id?: string };
async function pushQueue(action: SyncAction) {
  const q = await gl<SyncAction>(K.SYNC_Q);
  q.push(action);
  await sl(K.SYNC_Q, q);
  await syncData();
}

export async function syncData() {
  const state = await NetInfo.fetch();
  if (!state.isConnected) return;
  const q = await gl<SyncAction>(K.SYNC_Q);
  if (!q.length) return;
  
  const remain = [];
  for (const action of q) {
    try {
      if (action.type === 'ADD' || action.type === 'UPD') {
        const method = action.type === 'ADD' ? 'POST' : 'PUT';
        const url = action.type === 'ADD' ? `${API_URL}/${action.endpoint}` : `${API_URL}/${action.endpoint}/${action.id}`;
        await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action.data) });
      } else if (action.type === 'DEL') {
        await fetch(`${API_URL}/${action.endpoint}/${action.id}`, { method: 'DELETE' });
      }
    } catch {
      remain.push(action); // Keep in queue if it failed
    }
  }
  await sl(K.SYNC_Q, remain);
}

function crud<T extends { id: string }>(key: string, endpoint: string) {
  return {
    all: async () => {
      try {
        const state = await NetInfo.fetch();
        if (state.isConnected) {
          await syncData(); // Push any offline changes first
          const res = await fetch(`${API_URL}/${endpoint}`);
          if (res.ok) {
            const data = await res.json();
            await sl(key, data);
            return data as T[];
          }
        }
      } catch (e) {}
      return gl<T>(key);
    },
    save: (d: T[]) => sl(key, d),
    add: async (item: T) => { 
      const l = await gl<T>(key); l.unshift(item); await sl(key, l); 
      await pushQueue({ type: 'ADD', endpoint, data: item }); 
    },
    upd: async (item: T) => { 
      const l = await gl<T>(key); const i = l.findIndex(x => x.id === item.id); if (i >= 0) l[i] = item; await sl(key, l); 
      await pushQueue({ type: 'UPD', endpoint, id: item.id, data: item });
    },
    del: async (id: string) => { 
      const l = await gl<T>(key); await sl(key, l.filter(x => x.id !== id)); 
      await pushQueue({ type: 'DEL', endpoint, id });
    },
  };
}

export const pStore = crud<Project>(K.PROJECTS, 'projects');
export const mStore = crud<Material>(K.MATERIALS, 'inventory');
export const mlStore = crud<MaterialLog>(K.MATLOGS, 'inventory/logs');
export const tStore = crud<Transaction>(K.TRANSACTIONS, 'transactions');
export const iStore = crud<Invoice>(K.INVOICES, 'invoices');
export const wStore = crud<Worker>(K.WORKERS, 'workers');
export const dStore = crud<Delivery>(K.DELIVERIES, 'deliveries');
export const aStore = crud<AppAlert>(K.ALERTS, 'alerts');
export async function clearAll() { 
  for (const k of Object.values(K)) {
    await AsyncStorage.removeItem(k);
  }
}
