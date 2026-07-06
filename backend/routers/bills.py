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


# ── Remind ────────────────────────────────────────────────────
@router.post("/remind/{bill_id}")
async def remind_bill(bill_id: str, user=Depends(get_current_user)):
    bill = await UpcomingBill.get(bill_id)
    if not bill or bill.user_id != str(user.id):
        raise HTTPException(status_code=404, detail="Bill not found")

    if not user.email and not user.whatsapp:
        raise HTTPException(
            status_code=400,
            detail="No contact methods configured. Please set your Email or WhatsApp in Profile Settings."
        )

    due_str = bill.due_date.strftime("%Y-%m-%d") if bill.due_date else "N/A"

    email_res = None
    if user.email:
        from routers.alerts import send_email_alert
        subject = f"Reminder: Bill Due - {bill.title}"
        html = f"""
        <h3>Upcoming Bill Reminder</h3>
        <p>Your bill <strong>{bill.title}</strong> is due.</p>
        <ul>
            <li><strong>Amount:</strong> {bill.amount}</li>
            <li><strong>Due Date:</strong> {due_str}</li>
            <li><strong>Category:</strong> {bill.category}</li>
        </ul>
        <p>Please pay it soon or mark it as paid in your dashboard.</p>
        """
        email_res = send_email_alert(user.email, subject, html)

    whatsapp_res = None
    if user.whatsapp:
        from routers.alerts import send_whatsapp_alert
        msg = f"Reminder: Your bill '{bill.title}' of {bill.amount} is due on {due_str}."
        whatsapp_res = send_whatsapp_alert(user.whatsapp, msg)

    return {
        "message": "Reminders processed",
        "email_status": email_res,
        "whatsapp_status": whatsapp_res
    }

