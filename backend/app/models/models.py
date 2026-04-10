import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from ..database import Base

def _uid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=_uid)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, default="")
    role = Column(String, default="engineer")
    company_name = Column(String, default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class Project(Base):
    __tablename__ = "projects"
    id = Column(String, primary_key=True, default=_uid)
    name = Column(String, nullable=False)
    location = Column(String, default="")
    description = Column(Text, default="")
    status = Column(String, default="active")
    budget = Column(Float, default=0)
    spent = Column(Float, default=0)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    owner_id = Column(String, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    phases = relationship("ProjectPhase", back_populates="project", cascade="all, delete-orphan")
    materials = relationship("Material", back_populates="project", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="project", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="project", cascade="all, delete-orphan")
    workers = relationship("Worker", back_populates="project", cascade="all, delete-orphan")
    deliveries = relationship("Delivery", back_populates="project", cascade="all, delete-orphan")

class ProjectPhase(Base):
    __tablename__ = "project_phases"
    id = Column(String, primary_key=True, default=_uid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"))
    name = Column(String, nullable=False)
    budget = Column(Float, default=0)
    spent = Column(Float, default=0)
    status = Column(String, default="pending")
    project = relationship("Project", back_populates="phases")

class Material(Base):
    __tablename__ = "materials"
    id = Column(String, primary_key=True, default=_uid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"))
    name = Column(String, nullable=False)
    category = Column(String, default="")
    unit = Column(String, default="Units")
    current_stock = Column(Float, default=0)
    min_stock = Column(Float, default=0)
    max_stock = Column(Float, default=0)
    unit_price = Column(Float, default=0)
    supplier = Column(String, default="")
    daily_usage_rate = Column(Float, default=0)
    qr_code = Column(String, default="")
    last_restocked = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    project = relationship("Project", back_populates="materials")
    logs = relationship("MaterialLog", back_populates="material", cascade="all, delete-orphan")

class MaterialLog(Base):
    __tablename__ = "material_logs"
    id = Column(String, primary_key=True, default=_uid)
    material_id = Column(String, ForeignKey("materials.id", ondelete="CASCADE"))
    log_type = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    date = Column(Date, default=date.today)
    note = Column(Text, default="")
    logged_by = Column(String, default="")
    geo_lat = Column(Float, nullable=True)
    geo_lng = Column(Float, nullable=True)
    geo_address = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    material = relationship("Material", back_populates="logs")

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(String, primary_key=True, default=_uid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"))
    tx_type = Column(String, nullable=False)
    category = Column(String, default="labor")
    amount = Column(Float, nullable=False)
    date = Column(Date, default=date.today)
    description = Column(Text, default="")
    status = Column(String, default="completed")
    payee = Column(String, default="")
    method = Column(String, default="bank")
    upi_ref = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    project = relationship("Project", back_populates="transactions")

class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(String, primary_key=True, default=_uid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"))
    invoice_number = Column(String, unique=True, nullable=False)
    inv_type = Column(String, default="supplier")
    amount = Column(Float, default=0)
    tax = Column(Float, default=0)
    total = Column(Float, default=0)
    date = Column(Date, default=date.today)
    due_date = Column(Date, nullable=True)
    status = Column(String, default="pending")
    party_name = Column(String, default="")
    party_contact = Column(String, default="")
    reconciled = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    project = relationship("Project", back_populates="invoices")
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")

class InvoiceItem(Base):
    __tablename__ = "invoice_items"
    id = Column(String, primary_key=True, default=_uid)
    invoice_id = Column(String, ForeignKey("invoices.id", ondelete="CASCADE"))
    description = Column(String, default="")
    quantity = Column(Float, default=0)
    unit = Column(String, default="Units")
    unit_price = Column(Float, default=0)
    total = Column(Float, default=0)
    invoice = relationship("Invoice", back_populates="items")

class Worker(Base):
    __tablename__ = "workers"
    id = Column(String, primary_key=True, default=_uid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"))
    name = Column(String, nullable=False)
    role = Column(String, default="")
    pay_type = Column(String, default="weekly")
    rate = Column(Float, default=0)
    phone = Column(String, default="")
    upi_id = Column(String, default="")
    join_date = Column(Date, nullable=True)
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    project = relationship("Project", back_populates="workers")

class Delivery(Base):
    __tablename__ = "deliveries"
    id = Column(String, primary_key=True, default=_uid)
    project_id = Column(String, ForeignKey("projects.id", ondelete="CASCADE"))
    material_id = Column(String, ForeignKey("materials.id", ondelete="SET NULL"), nullable=True)
    material_name = Column(String, default="")
    supplier = Column(String, default="")
    quantity = Column(Float, default=0)
    unit = Column(String, default="Units")
    expected_date = Column(Date, nullable=True)
    status = Column(String, default="expected")
    geo_lat = Column(Float, nullable=True)
    geo_lng = Column(Float, nullable=True)
    geo_address = Column(String, default="")
    # Live tracking fields
    driver_name = Column(String, default="")
    driver_phone = Column(String, default="")
    vehicle_number = Column(String, default="")
    pickup_lat = Column(Float, nullable=True)
    pickup_lng = Column(Float, nullable=True)
    pickup_address = Column(String, default="")
    dest_lat = Column(Float, nullable=True)
    dest_lng = Column(Float, nullable=True)
    dest_address = Column(String, default="")
    current_lat = Column(Float, nullable=True)
    current_lng = Column(Float, nullable=True)
    eta_minutes = Column(Integer, nullable=True)
    distance_km = Column(Float, nullable=True)
    last_updated = Column(DateTime, nullable=True)
    picked_up_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    project = relationship("Project", back_populates="deliveries")
    tracking_points = relationship("DeliveryTrackingPoint", cascade="all, delete-orphan")

class DeliveryTrackingPoint(Base):
    """GPS breadcrumb for live delivery tracking — like Amazon/Flipkart."""
    __tablename__ = "delivery_tracking_points"
    id = Column(String, primary_key=True, default=_uid)
    delivery_id = Column(String, ForeignKey("deliveries.id", ondelete="CASCADE"))
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    address = Column(String, default="")
    speed_kmh = Column(Float, default=0)
    heading = Column(Float, default=0)          # 0-360 degrees
    battery_pct = Column(Integer, default=100)
    event = Column(String, default="location")  # location, pickup, checkpoint, arrived, delivered
    note = Column(String, default="")
    recorded_at = Column(DateTime, default=datetime.utcnow)

class UPIPayment(Base):
    __tablename__ = "upi_payments"
    id = Column(String, primary_key=True, default=_uid)
    transaction_id = Column(String, ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True)
    payee_name = Column(String, default="")
    payee_upi = Column(String, default="")
    payer_upi = Column(String, default="")
    amount = Column(Float, nullable=False)
    upi_ref = Column(String, default="")
    status = Column(String, default="initiated")  # initiated, success, failed
    deep_link = Column(Text, default="")
    qr_data = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
