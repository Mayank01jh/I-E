from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from models import Transaction, User
from routers.auth import get_current_user

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


class TransactionIn(BaseModel):
    amount:   float
    category: str
    type:     str = "EXPENSE"
    date:     Optional[datetime] = None
    notes:    str = ""


class BulkIn(BaseModel):
    transactions: list[TransactionIn]


@router.get("")
async def list_transactions(
    year:     Optional[int] = None,
    month:    Optional[int] = None,
    category: Optional[str] = None,
    type:     Optional[str] = None,
    page:     int = 1,
    limit:    int = 50,
    user: User = Depends(get_current_user),
):
    q: dict = {"user_id": str(user.id)}
    if year:     q["year"]     = year
    if month:    q["month"]    = month
    if category: q["category"] = category
    if type:     q["type"]     = type
    skip  = (page - 1) * limit
    txns  = await Transaction.find(q).sort(-Transaction.date).skip(skip).limit(limit).to_list()
    total = await Transaction.find(q).count()
    return {"transactions": txns, "total": total, "page": page, "limit": limit}


@router.post("", status_code=201)
async def create_transaction(data: TransactionIn, user: User = Depends(get_current_user)):
    d = data.date or datetime.utcnow()
    tx = Transaction(
        user_id=str(user.id),
        amount=data.amount, category=data.category,
        type=data.type, date=d,
        year=d.year, month=d.month, day=d.day,
        notes=data.notes, source="manual",
    )
    await tx.insert()
    return tx


@router.post("/bulk", status_code=201)
async def bulk_insert(payload: BulkIn, user: User = Depends(get_current_user)):
    docs = []
    for d in payload.transactions:
        dt = d.date or datetime.utcnow()
        docs.append(Transaction(
            user_id=str(user.id),
            amount=d.amount, category=d.category, type=d.type,
            date=dt, year=dt.year, month=dt.month, day=dt.day,
            notes=d.notes, source="seeded",
        ))
    await Transaction.insert_many(docs)
    return {"inserted": len(docs)}


# ── IMPORTANT: /purge-month must be defined BEFORE /{id} ──────────────────────
# FastAPI matches routes in declaration order, so the specific literal path
# "/purge-month" must come before the wildcard "/{id}", otherwise
# "purge-month" is silently treated as an object ID and the route never fires.
@router.delete("/purge-month")
async def purge_monthly_data(
    year: int,
    month_name: str,
    user: User = Depends(get_current_user)
):
    """Delete all transactions for the authenticated user in a given month/year."""
    months_map = {
        "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4,  "May": 5,  "Jun": 6,
        "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12,
    }

    month_key = month_name[:3].title() if isinstance(month_name, str) else ""
    month_num = months_map.get(month_key)

    if not month_num:
        try:
            month_num = int(month_name)
        except ValueError:
            pass

    if not month_num or month_num < 1 or month_num > 12:
        raise HTTPException(status_code=400, detail="Invalid month format provided.")

    delete_result = await Transaction.find(
        Transaction.user_id == str(user.id),
        Transaction.year == year,
        Transaction.month == month_num
    ).delete()

    deleted_count = getattr(delete_result, "deleted_count", 0)

    return {
        "status": "success",
        "message": f"Successfully dropped {deleted_count} records for {month_name} {year}.",
        "deleted": deleted_count,
    }


@router.get("/{id}")
async def get_transaction(id: str, user: User = Depends(get_current_user)):
    tx = await Transaction.get(id)
    if not tx:
        raise HTTPException(404, "Not found")
    if tx.user_id != str(user.id):
        raise HTTPException(403, "Access denied")
    return tx


@router.put("/{id}")
async def update_transaction(id: str, data: TransactionIn, user: User = Depends(get_current_user)):
    tx = await Transaction.get(id)
    if not tx:
        raise HTTPException(404, "Not found")
    if tx.user_id != str(user.id):
        raise HTTPException(403, "Access denied")
    tx.amount   = data.amount
    tx.category = data.category
    tx.type     = data.type
    tx.notes    = data.notes
    if data.date:
        tx.date  = data.date
        tx.year  = data.date.year
        tx.month = data.date.month
        tx.day   = data.date.day
    await tx.save()
    return tx


@router.delete("/{id}")
async def delete_transaction(id: str, user: User = Depends(get_current_user)):
    tx = await Transaction.get(id)
    if not tx:
        raise HTTPException(404, "Not found")
    if tx.user_id != str(user.id):
        raise HTTPException(403, "Access denied")
    await tx.delete()
    return {"message": "Deleted"}
