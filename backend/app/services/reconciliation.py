from typing import List, Dict
from ..models.models import Invoice, Transaction


def reconcile_invoices(invoices: List[Invoice], transactions: List[Transaction]) -> Dict:
    matched_ids = []
    unmatched_ids = []
    completed = [t for t in transactions if t.tx_type == "payment" and t.status == "completed"]
    used = set()
    for inv in invoices:
        if inv.status == "paid":
            matched_ids.append(inv.id)
            continue
        found = False
        for tx in completed:
            if tx.id in used:
                continue
            if inv.total > 0 and abs(tx.amount - inv.total) / inv.total <= 0.01:
                inv_words = set(inv.party_name.lower().split())
                tx_words = set(tx.payee.lower().split())
                if inv_words & tx_words:
                    matched_ids.append(inv.id)
                    used.add(tx.id)
                    found = True
                    break
        if not found:
            unmatched_ids.append(inv.id)
    return {
        "total_invoices": len(invoices),
        "matched": len(matched_ids),
        "unmatched": len(unmatched_ids),
        "matched_ids": matched_ids,
        "unmatched_ids": unmatched_ids,
    }
