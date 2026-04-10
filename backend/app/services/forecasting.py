"""AI demand forecasting using scikit-learn linear regression."""
import math
from datetime import date, timedelta
from typing import List, Dict
import numpy as np
from sklearn.linear_model import LinearRegression
from ..models.models import Material, MaterialLog


def forecast_material(material: Material, logs: List[MaterialLog]) -> Dict:
    out_logs = sorted(
        [l for l in logs if l.log_type == "out"],
        key=lambda l: l.date if l.date else date.today()
    )
    daily_rate = material.daily_usage_rate if material.daily_usage_rate > 0 else 0
    trend = "stable"
    confidence = 0.5

    if len(out_logs) >= 5:
        usage_by_day: Dict[date, float] = {}
        for log in out_logs:
            d = log.date if log.date else date.today()
            usage_by_day[d] = usage_by_day.get(d, 0) + log.quantity
        if len(usage_by_day) >= 3:
            sorted_days = sorted(usage_by_day.keys())
            base = sorted_days[0]
            X = np.array([(d - base).days for d in sorted_days]).reshape(-1, 1)
            y = np.array([usage_by_day[d] for d in sorted_days])
            model = LinearRegression()
            model.fit(X, y)
            today_x = (date.today() - base).days
            predicted = max(0, model.predict(np.array([[today_x]]))[0])
            if predicted > 0:
                daily_rate = predicted
            r2 = model.score(X, y)
            confidence = max(0.1, min(0.99, r2))
            slope = model.coef_[0]
            mean_y = np.mean(y) if np.mean(y) > 0 else 1
            if slope > 0.05 * mean_y:
                trend = "increasing"
            elif slope < -0.05 * mean_y:
                trend = "decreasing"
    elif len(out_logs) > 0:
        total_out = sum(l.quantity for l in out_logs)
        span = max(1, (date.today() - out_logs[0].date).days) if out_logs[0].date else 1
        daily_rate = total_out / span if span > 0 else daily_rate
        confidence = 0.3

    if daily_rate > 0:
        days_left = max(0, math.floor(material.current_stock / daily_rate))
        reorder_days = max(0, days_left - 5)
        reorder_date = (date.today() + timedelta(days=reorder_days)).isoformat()
        recommended_qty = math.ceil(daily_rate * 30)
    else:
        days_left = 999
        reorder_date = ""
        recommended_qty = 0

    return {
        "material_id": material.id,
        "material_name": material.name,
        "current_stock": material.current_stock,
        "daily_usage_rate": round(daily_rate, 2),
        "days_left": days_left,
        "reorder_date": reorder_date,
        "recommended_qty": recommended_qty,
        "trend": trend,
        "confidence": round(confidence, 2),
    }


def forecast_all_materials(materials: List[Material], all_logs: List[MaterialLog]) -> List[Dict]:
    logs_by_mat: Dict[str, List[MaterialLog]] = {}
    for log in all_logs:
        logs_by_mat.setdefault(log.material_id, []).append(log)
    return [forecast_material(m, logs_by_mat.get(m.id, [])) for m in materials]
