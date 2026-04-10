export interface Project {
  id: string;
  name: string;
  location: string;
  status: 'active' | 'completed' | 'on-hold';
  budget: number;
  spent: number;
  startDate: string;
  endDate: string;
  phases: ProjectPhase[];
  description: string;
  createdAt: string;
}
export interface ProjectPhase {
  id: string;
  name: string;
  budget: number;
  spent: number;
  status: 'pending' | 'in-progress' | 'completed';
}
export interface Material {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unitPrice: number;
  supplier: string;
  projectId: string;
  lastRestocked: string;
  dailyUsageRate: number;
  qrCode: string;
  createdAt: string;
}
export interface MaterialLog {
  id: string;
  materialId: string;
  type: 'in' | 'out';
  quantity: number;
  date: string;
  note: string;
  loggedBy: string;
  geoLat?: number;
  geoLng?: number;
  geoAddress?: string;
}
export interface Transaction {
  id: string;
  type: 'payment' | 'receipt';
  category: 'labor' | 'material' | 'equipment' | 'overhead' | 'supplier';
  amount: number;
  date: string;
  description: string;
  projectId: string;
  status: 'completed' | 'pending' | 'failed';
  payee: string;
  method: 'cash' | 'bank' | 'upi' | 'cheque' | 'gateway';
  gatewayRef?: string;
  createdAt: string;
}
export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: 'supplier' | 'client' | 'internal';
  amount: number;
  tax: number;
  total: number;
  date: string;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue' | 'draft';
  projectId: string;
  items: InvoiceItem[];
  partyName: string;
  partyContact: string;
  reconciled: boolean;
  paymentLink?: string;
  createdAt: string;
}
export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}
export interface Worker {
  id: string;
  name: string;
  role: string;
  type: 'daily' | 'weekly' | 'monthly';
  rate: number;
  projectId: string;
  phone: string;
  joinDate: string;
  status: 'active' | 'inactive';
  upiId?: string;
  bankAccount?: string;
  createdAt: string;
}
export interface Delivery {
  id: string;
  materialId: string;
  materialName: string;
  supplier: string;
  quantity: number;
  unit: string;
  expectedDate: string;
  status: 'expected' | 'picked-up' | 'in-transit' | 'delivered' | 'cancelled';
  geoLat?: number;
  geoLng?: number;
  geoAddress?: string;
  projectId: string;
  // Live tracking fields
  driverName: string;
  driverPhone: string;
  vehicleNumber: string;
  pickupLat?: number;
  pickupLng?: number;
  pickupAddress: string;
  destLat?: number;
  destLng?: number;
  destAddress: string;
  currentLat?: number;
  currentLng?: number;
  etaMinutes?: number;
  distanceKm?: number;
  lastUpdated?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  trackingPoints: TrackingPoint[];
  createdAt: string;
}

export interface TrackingPoint {
  id: string;
  lat: number;
  lng: number;
  address: string;
  speedKmh: number;
  heading: number;
  batteryPct: number;
  event: 'location' | 'pickup' | 'checkpoint' | 'arrived' | 'delivered';
  note: string;
  recordedAt: string;
}
export interface AppAlert {
  id: string;
  type: 'low-stock' | 'budget-overrun' | 'payment-due' | 'delivery' | 'ai-insight' | 'reconciliation';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  date: string;
  read: boolean;
  projectId?: string;
}
export interface PaymentConfig {
  razorpayKey: string;
  razorpaySecret: string;
  upiId: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  accountHolder: string;
}
