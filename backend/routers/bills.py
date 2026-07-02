"""
Upcoming Bills Router — /api/bills
"""
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from models import UpcomingBill
from routers.auth import get_current_user

router = APIRouter(prefix="/api/bills", tags=["bills"])


class BillIn(BaseModel):
    title:     str
    amount:    float
    category:  str = "Miscellaneous"
    due_date:  Optional[str] = None
    recurring: bool = False


# ── List ──────────────────────────────────────────────────────
@router.get("")
async def list_bills(user=Depends(get_current_user)):
    docs = await UpcomingBill.find(UpcomingBill.user_id == str(user.id)).to_list()
    return [
        {
            "_id":       str(b.id),
            "title":     b.title,
            "amount":    b.amount,
            "category":  b.category,
            "due_date":  b.due_date.isoformat() if b.due_date else None,
            "is_paid":   b.is_paid,
            "recurring": b.recurring,
        }
        for b in docs
    ]


# ── Create ────────────────────────────────────────────────────
@router.post("", status_code=201)
async def create_bill(body: BillIn, user=Depends(get_current_user)):
    due = datetime.fromisoformat(body.due_date) if body.due_date else datetime.utcnow()
    bill = UpcomingBill(
        user_id=str(user.id),
        title=body.title,
        amount=body.amount,
        category=body.category,
        due_date=due,
        recurring=body.recurring,
    )
    await bill.insert()
    return {"_id": str(bill.id), "message": "Bill created"}


# ── Toggle paid ───────────────────────────────────────────────
@router.put("/{bill_id}/pay")
async def toggle_paid(bill_id: str, user=Depends(get_current_user)):
    bill = await UpcomingBill.get(bill_id)
    if not bill or bill.user_id != str(user.id):
        raise HTTPException(status_code=404, detail="Not found")
    bill.is_paid = not bill.is_paid
    await bill.save()
    return {"is_paid": bill.is_paid}


# ── Delete ────────────────────────────────────────────────────
@router.delete("/{bill_id}")
async def delete_bill(bill_id: str, user=Depends(get_current_user)):
    bill = await UpcomingBill.get(bill_id)
    if not bill or bill.user_id != str(user.id):
        raise HTTPException(status_code=404, detail="Not found")
    await bill.delete()
    return {"message": "Deleted"}
