import math
from pathlib import Path
from datetime import datetime
from fastapi import APIRouter, Depends
import pandas as pd
from models import Transaction, User
from routers.auth import get_current_user

router = APIRouter(prefix="/api/seed", tags=["seed"])

XLSX_PATH = Path(__file__).parent.parent.parent / "MY EXPENSES.xlsx"

MONTH_MAP = {
    "January": 1, "February": 2, "March": 3,    "April": 4,
    "May": 5,     "June": 6,     "July": 7,      "August": 8,
    "September": 9, "October": 10, "November": 11, "December": 12,
}
SKIP_ROWS = {"Total Yearly Saving", "Total Yearly Expenses", "Money", "Item", "Saved", "MONTHLY EXPENSES"}


@router.get("/status")
async def seed_status(user: User = Depends(get_current_user)):
    count = await Transaction.find(Transaction.source == "seeded", Transaction.user_id == str(user.id)).count()
    return {"seeded": count > 0, "count": count}


@router.post("/run")
async def run_seed(user: User = Depends(get_current_user)):
    if not XLSX_PATH.exists():
        return {"error": f"MY EXPENSES.xlsx not found at {XLSX_PATH}", "inserted": 0}

    raw = pd.read_excel(str(XLSX_PATH), sheet_name=0, header=None)
    year_row  = raw.iloc[1]
    month_row = raw.iloc[2]

    # Build column → {year, month} metadata
    col_meta: dict = {}
    current_year = None
    for col in range(1, len(year_row)):
        val = year_row.iloc[col]
        if val is not None and not (isinstance(val, float) and math.isnan(val)):
            try:
                current_year = int(val)
            except (ValueError, TypeError):
                pass
        month_name = month_row.iloc[col]
        if isinstance(month_name, str) and month_name in MONTH_MAP:
            col_meta[col] = {"year": current_year, "month": MONTH_MAP[month_name], "month_name": month_name}

    transactions: list[Transaction] = []

    # Parse Money row (row index 3) as INCOME transactions under "Salary" category
    money_row = raw.iloc[3]
    for col, meta in col_meta.items():
        if col >= len(money_row):
            continue
        try:
            amount = float(money_row.iloc[col])
        except (TypeError, ValueError):
            continue
        if math.isnan(amount) or amount == 0:
            continue
        
        date = datetime(meta["year"], meta["month"], 1)
        transactions.append(Transaction(
            user_id=str(user.id),
            amount=amount, category="Salary", type="INCOME",
            date=date, year=meta["year"], month=meta["month"], day=1,
            notes=f"Seeded from spreadsheet income ({meta['month_name']} {meta['year']})",
            source="seeded",
        ))

    # Parse subsequent rows as EXPENSE transactions
    for row_idx in range(4, len(raw)):
        row      = raw.iloc[row_idx]
        category = str(row.iloc[0]).strip() if row.iloc[0] is not None else ""
        if not category or category in SKIP_ROWS or category == "nan":
            continue

        for col, meta in col_meta.items():
            if col >= len(row):
                continue
            try:
                amount = float(row.iloc[col])
            except (TypeError, ValueError):
                continue
            if math.isnan(amount) or amount == 0:
                continue

            date = datetime(meta["year"], meta["month"], 1)
            transactions.append(Transaction(
                user_id=str(user.id),
                amount=amount, category=category, type="EXPENSE",
                date=date, year=meta["year"], month=meta["month"], day=1,
                notes=f"Seeded from spreadsheet ({meta['month_name']} {meta['year']})",
                source="seeded",
            ))

    if not transactions:
        return {"message": "No data found in spreadsheet", "inserted": 0}

    # Idempotent: clear old seeded rows first for this user
    await Transaction.find(Transaction.source == "seeded", Transaction.user_id == str(user.id)).delete()
    await Transaction.insert_many(transactions)

    return {
        "message": f"✅ Successfully seeded {len(transactions)} transactions from MY EXPENSES.xlsx",
        "inserted": len(transactions),
        "sample": [
            {"category": t.category, "amount": t.amount, "year": t.year, "month": t.month}
            for t in transactions[:5]
        ],
    }
