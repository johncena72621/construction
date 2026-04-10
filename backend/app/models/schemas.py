from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

# Auth
class UserCreate(BaseModel):
    email: str; password: str; full_name: str = ""; role: str = "engineer"; company_name: str = ""
class UserLogin(BaseModel):
    email: str; password: str
class UserOut(BaseModel):
    id: str; email: str; full_name: str; role: str; company_name: str; is_active: bool; created_at: datetime
    class Config: from_attributes = True
class Token(BaseModel):
    access_token: str; token_type: str = "bearer"; user: UserOut

# Project
class PhaseCreate(BaseModel):
    name: str; budget: float = 0
class PhaseOut(BaseModel):
    id: str; name: str; budget: float; spent: float; status: str
    class Config: from_attributes = True
class PhaseUpdate(BaseModel):
    name: Optional[str] = None; budget: Optional[float] = None; spent: Optional[float] = None; status: Optional[str] = None
class ProjectCreate(BaseModel):
    name: str; location: str = ""; description: str = ""; budget: float = 0; start_date: Optional[date] = None; end_date: Optional[date] = None
class ProjectUpdate(BaseModel):
    name: Optional[str] = None; location: Optional[str] = None; description: Optional[str] = None; status: Optional[str] = None; budget: Optional[float] = None; spent: Optional[float] = None; start_date: Optional[date] = None; end_date: Optional[date] = None
class ProjectOut(BaseModel):
    id: str; name: str; location: str; description: str; status: str; budget: float; spent: float; start_date: Optional[date]; end_date: Optional[date]; owner_id: str; created_at: datetime; phases: List[PhaseOut] = []
    class Config: from_attributes = True

# Material
class MaterialCreate(BaseModel):
    project_id: str; name: str; category: str = ""; unit: str = "Units"; current_stock: float = 0; min_stock: float = 0; max_stock: float = 0; unit_price: float = 0; supplier: str = ""; daily_usage_rate: float = 0
class MaterialUpdate(BaseModel):
    name: Optional[str] = None; category: Optional[str] = None; unit: Optional[str] = None; current_stock: Optional[float] = None; min_stock: Optional[float] = None; max_stock: Optional[float] = None; unit_price: Optional[float] = None; supplier: Optional[str] = None; daily_usage_rate: Optional[float] = None
class MaterialOut(BaseModel):
    id: str; project_id: str; name: str; category: str; unit: str; current_stock: float; min_stock: float; max_stock: float; unit_price: float; supplier: str; daily_usage_rate: float; qr_code: str; last_restocked: Optional[date]; created_at: datetime
    class Config: from_attributes = True

# Material Log
class MaterialLogCreate(BaseModel):
    material_id: str; log_type: str; quantity: float; note: str = ""; logged_by: str = ""; geo_lat: Optional[float] = None; geo_lng: Optional[float] = None; geo_address: str = ""
class MaterialLogOut(BaseModel):
    id: str; material_id: str; log_type: str; quantity: float; date: date; note: str; logged_by: str; geo_lat: Optional[float]; geo_lng: Optional[float]; geo_address: str; created_at: datetime
    class Config: from_attributes = True

# Transaction
class TransactionCreate(BaseModel):
    project_id: str; tx_type: str = "payment"; category: str = "labor"; amount: float; description: str = ""; status: str = "completed"; payee: str = ""; method: str = "bank"; date: Optional[date] = None
class TransactionUpdate(BaseModel):
    tx_type: Optional[str] = None; category: Optional[str] = None; amount: Optional[float] = None; description: Optional[str] = None; status: Optional[str] = None; payee: Optional[str] = None; method: Optional[str] = None
class TransactionOut(BaseModel):
    id: str; project_id: str; tx_type: str; category: str; amount: float; date: date; description: str; status: str; payee: str; method: str; upi_ref: str; created_at: datetime
    class Config: from_attributes = True

# Invoice
class InvoiceItemCreate(BaseModel):
    description: str; quantity: float = 0; unit: str = "Units"; unit_price: float = 0
class InvoiceItemOut(BaseModel):
    id: str; description: str; quantity: float; unit: str; unit_price: float; total: float
    class Config: from_attributes = True
class InvoiceCreate(BaseModel):
    project_id: str; inv_type: str = "supplier"; party_name: str; party_contact: str = ""; due_date: Optional[date] = None; items: List[InvoiceItemCreate] = []
class InvoiceUpdate(BaseModel):
    status: Optional[str] = None; party_name: Optional[str] = None; party_contact: Optional[str] = None; due_date: Optional[date] = None
class InvoiceOut(BaseModel):
    id: str; project_id: str; invoice_number: str; inv_type: str; amount: float; tax: float; total: float; date: date; due_date: Optional[date]; status: str; party_name: str; party_contact: str; reconciled: bool; created_at: datetime; items: List[InvoiceItemOut] = []
    class Config: from_attributes = True

# Worker
class WorkerCreate(BaseModel):
    project_id: str; name: str; role: str = ""; pay_type: str = "weekly"; rate: float = 0; phone: str = ""; upi_id: str = ""
class WorkerUpdate(BaseModel):
    name: Optional[str] = None; role: Optional[str] = None; pay_type: Optional[str] = None; rate: Optional[float] = None; phone: Optional[str] = None; upi_id: Optional[str] = None; status: Optional[str] = None
class WorkerOut(BaseModel):
    id: str; project_id: str; name: str; role: str; pay_type: str; rate: float; phone: str; upi_id: str; join_date: Optional[date]; status: str; created_at: datetime
    class Config: from_attributes = True

# Delivery — full live GPS tracking like Amazon/Flipkart
class DeliveryCreate(BaseModel):
    project_id: str; material_id: Optional[str] = None; material_name: str = ""; supplier: str = ""; quantity: float = 0; unit: str = "Units"; expected_date: Optional[date] = None
    driver_name: str = ""; driver_phone: str = ""; vehicle_number: str = ""
    pickup_lat: Optional[float] = None; pickup_lng: Optional[float] = None; pickup_address: str = ""
    dest_lat: Optional[float] = None; dest_lng: Optional[float] = None; dest_address: str = ""

class DeliveryUpdate(BaseModel):
    status: Optional[str] = None; driver_name: Optional[str] = None; driver_phone: Optional[str] = None; vehicle_number: Optional[str] = None
    eta_minutes: Optional[int] = None; distance_km: Optional[float] = None

class TrackingPointCreate(BaseModel):
    lat: float; lng: float; address: str = ""; speed_kmh: float = 0; heading: float = 0; battery_pct: int = 100
    event: str = "location"  # location, pickup, checkpoint, arrived, delivered
    note: str = ""

class TrackingPointOut(BaseModel):
    id: str; delivery_id: str; lat: float; lng: float; address: str; speed_kmh: float; heading: float; battery_pct: int; event: str; note: str; recorded_at: datetime
    class Config: from_attributes = True

class DeliveryOut(BaseModel):
    id: str; project_id: str; material_id: Optional[str]; material_name: str; supplier: str; quantity: float; unit: str; expected_date: Optional[date]; status: str
    driver_name: str; driver_phone: str; vehicle_number: str
    pickup_lat: Optional[float]; pickup_lng: Optional[float]; pickup_address: str
    dest_lat: Optional[float]; dest_lng: Optional[float]; dest_address: str
    current_lat: Optional[float]; current_lng: Optional[float]
    eta_minutes: Optional[int]; distance_km: Optional[float]
    last_updated: Optional[datetime]; picked_up_at: Optional[datetime]; delivered_at: Optional[datetime]
    geo_lat: Optional[float]; geo_lng: Optional[float]; geo_address: str
    created_at: datetime
    tracking_points: List[TrackingPointOut] = []
    class Config: from_attributes = True

# UPI
class UPIPaymentCreate(BaseModel):
    payee_name: str; payee_upi: str; amount: float; note: str = ""; project_id: Optional[str] = None
class UPIPaymentOut(BaseModel):
    id: str; payee_name: str; payee_upi: str; payer_upi: str; amount: float; upi_ref: str; status: str; deep_link: str; qr_data: str; created_at: datetime
    class Config: from_attributes = True
class UPICallbackData(BaseModel):
    payment_id: str; upi_ref: str; status: str  # success, failed

# Analytics
class ForecastOut(BaseModel):
    material_id: str; material_name: str; current_stock: float; daily_usage_rate: float; days_left: int; reorder_date: str; recommended_qty: float; trend: str; confidence: float
class ReconciliationOut(BaseModel):
    total_invoices: int; matched: int; unmatched: int; matched_ids: List[str]; unmatched_ids: List[str]
class DashboardOut(BaseModel):
    total_projects: int; active_projects: int; total_budget: float; total_spent: float; total_remaining: float; pending_payments: float; total_workers: int; total_materials: int; low_stock_count: int; overdue_invoices: int; weekly_payroll: float; monthly_payroll: float
class AlertOut(BaseModel):
    id: str; project_id: Optional[str]; alert_type: str; title: str; message: str; severity: str; is_read: bool; created_at: datetime
    class Config: from_attributes = True
