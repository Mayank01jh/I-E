"""
Debt / Peer Ledger Router — /api/debts
"""
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from models import DebtRecord
from routers.auth import get_current_user
from routers.alerts import send_whatsapp_alert, send_email_alert

router = APIRouter(prefix="/api/debts", tags=["debts"])


class DebtIn(BaseModel):
    person_name:      str
    contact_email:    str = ""
    contact_whatsapp: str = ""
    amount:           float
    type:             str = "LENT"   # LENT | BORROWED
    due_date:         Optional[str] = None
    notes:            Optional[str] = None


# ── List ──────────────────────────────────────────────────────
@router.get("")
async def list_debts(user=Depends(get_current_user)):
    docs = await DebtRecord.find(DebtRecord.user_id == str(user.id)).to_list()
    return [
        {
            "_id":               str(d.id),
            "person_name":       d.person_name,
            "contact_email":     d.contact_email,
            "contact_whatsapp":  d.contact_whatsapp,
            "amount":            d.amount,
            "type":              d.type,
            "due_date":          d.due_date.isoformat() if d.due_date else None,
            "is_settled":        d.is_settled,
            "notes":             d.notes or "",
            "created_at":        d.created_at.isoformat(),
        }
        for d in docs
    ]


# ── Create ────────────────────────────────────────────────────
@router.post("", status_code=201)
async def create_debt(body: DebtIn, user=Depends(get_current_user)):
    due = datetime.fromisoformat(body.due_date) if body.due_date else datetime.utcnow()
    record = DebtRecord(
        user_id=str(user.id),
        person_name=body.person_name,
        contact_email=body.contact_email,
        contact_whatsapp=body.contact_whatsapp,
        amount=body.amount,
        type=body.type,
        due_date=due,
        notes=body.notes,
    )
    await record.insert()
    return {"_id": str(record.id), "message": "Debt record created"}


# ── Settle toggle ─────────────────────────────────────────────
@router.put("/{debt_id}/settle")
async def settle_debt(debt_id: str, user=Depends(get_current_user)):
    debt = await DebtRecord.get(debt_id)
    if not debt or debt.user_id != str(user.id):
        raise HTTPException(status_code=404, detail="Not found")
    debt.is_settled = not debt.is_settled
    await debt.save()
    return {"is_settled": debt.is_settled}


# ── Delete ────────────────────────────────────────────────────
@router.delete("/{debt_id}")
async def delete_debt(debt_id: str, user=Depends(get_current_user)):
    debt = await DebtRecord.get(debt_id)
    if not debt or debt.user_id != str(user.id):
        raise HTTPException(status_code=404, detail="Not found")
    await debt.delete()
    return {"message": "Deleted"}


# ── Send Reminder ─────────────────────────────────────────────
@router.post("/remind/{debt_id}")
async def send_reminder(debt_id: str, user=Depends(get_current_user)):
    debt = await DebtRecord.get(debt_id)
    if not debt or debt.user_id != str(user.id):
        raise HTTPException(status_code=404, detail="Not found")

    due_str = debt.due_date.strftime("%d %B %Y") if debt.due_date else "soon"

    if debt.type == "LENT":
        msg = (
            f"Hi {debt.person_name}, a gentle reminder about the outstanding "
            f"₹{debt.amount:,.0f} due on {due_str}. Please arrange payment at your earliest convenience."
        )
        subject = "Payment Reminder — I & E"
    else:
        msg = (
            f"Hi {debt.person_name}, confirming I owe you ₹{debt.amount:,.0f} "
            f"scheduled to clear by {due_str}. Thank you for your patience."
        )
        subject = "Account Reconciliation — I & E"

    wa  = send_whatsapp_alert(debt.contact_whatsapp, msg)
    eml = send_email_alert(
        debt.contact_email,
        subject,
        f"<p>{msg}</p><br><small>Sent via I &amp; E Personal Finance Platform</small>",
    )
    return {"whatsapp": wa, "email": eml}
