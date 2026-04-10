from datetime import date
from typing import List, Dict
from ..models.models import Project, Material, Invoice, Transaction, Delivery


def _fmt(n: float) -> str:
    if n >= 1e7: return f"\u20B9{n/1e7:.2f} Cr"
    if n >= 1e5: return f"\u20B9{n/1e5:.2f} L"
    if n >= 1e3: return f"\u20B9{n/1e3:.1f}K"
    return f"\u20B9{n:,.0f}"


def generate_alerts(projects, materials, invoices, transactions, deliveries) -> List[Dict]:
    alerts = []
    today = date.today()

    for m in materials:
        if m.current_stock <= m.min_stock and m.min_stock > 0:
            sev = "critical" if m.current_stock <= m.min_stock * 0.5 else "warning"
            dm = ""
            if m.daily_usage_rate > 0:
                dm = f" ~{int(m.current_stock / m.daily_usage_rate)} days left."
            alerts.append({"alert_type": "low-stock", "title": f"Low Stock: {m.name}", "message": f"{m.current_stock} {m.unit} left (min: {m.min_stock}).{dm}", "severity": sev, "project_id": m.project_id})
        if m.daily_usage_rate > 0 and m.current_stock > m.min_stock:
            dl = int(m.current_stock / m.daily_usage_rate)
            if 0 < dl <= 7:
                alerts.append({"alert_type": "ai-insight", "title": f"Depletion: {m.name}", "message": f"Runs out in ~{dl} days at {m.daily_usage_rate} {m.unit}/day.", "severity": "info", "project_id": m.project_id})

    for p in projects:
        if p.budget > 0 and p.status == "active":
            pct = p.spent / p.budget
            if pct >= 0.9:
                alerts.append({"alert_type": "budget-overrun", "title": f"Budget: {p.name}", "message": f"{pct*100:.1f}% used ({_fmt(p.spent)} of {_fmt(p.budget)}).", "severity": "critical" if pct >= 1 else "warning", "project_id": p.id})

    for inv in invoices:
        if inv.status in ("pending", "overdue") and inv.due_date and inv.due_date < today:
            od = (today - inv.due_date).days
            alerts.append({"alert_type": "payment-due", "title": f"Overdue: {inv.invoice_number}", "message": f"{inv.party_name} - {_fmt(inv.total)} overdue {od}d.", "severity": "critical" if od > 15 else "warning", "project_id": inv.project_id})

    pend = [t for t in transactions if t.status == "pending"]
    if pend:
        tot = sum(t.amount for t in pend)
        alerts.append({"alert_type": "payment-due", "title": f"{len(pend)} Pending Payment(s)", "message": f"Total: {_fmt(tot)}.", "severity": "critical" if len(pend) > 5 else "info", "project_id": None})

    for d in deliveries:
        if d.status in ("expected", "in-transit"):
            geo = f" @ {d.geo_address}" if d.geo_address else ""
            alerts.append({"alert_type": "delivery", "title": f"Delivery: {d.material_name}", "message": f"{d.quantity} {d.unit} from {d.supplier}. Expected {d.expected_date}.{geo}", "severity": "info", "project_id": d.project_id})

    return alerts
