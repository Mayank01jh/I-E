import math
from pathlib import Path
from datetime import datetime
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
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


@router.post("/upload")
async def upload_file(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    filename = file.filename.lower()
    contents = await file.read()
    
    import io
    
    if filename.endswith(".csv"):
        try:
            df = pd.read_csv(io.BytesIO(contents))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse CSV file: {str(e)}")
    elif filename.endswith((".xlsx", ".xls")):
        try:
            df = pd.read_excel(io.BytesIO(contents), sheet_name=0)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse Excel file: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload a .csv or .xlsx file.")

    transactions: list[Transaction] = []
    has_amount_col = any("amount" in str(col).lower() for col in df.columns)
    
    if has_amount_col:
        col_map = {}
        for col in df.columns:
            c_lower = str(col).lower()
            if "amount" in c_lower:
                col_map["amount"] = col
            elif "category" in c_lower:
                col_map["category"] = col
            elif "type" in c_lower:
                col_map["type"] = col
            elif "date" in c_lower:
                col_map["date"] = col
            elif "note" in c_lower:
                col_map["notes"] = col
        
        if "amount" not in col_map:
            raise HTTPException(status_code=400, detail="Missing required 'amount' column in spreadsheet.")
            
        for _, row in df.iterrows():
            try:
                amt = float(row[col_map["amount"]])
                if math.isnan(amt) or amt == 0:
                    continue
            except (ValueError, TypeError):
                continue
                
            cat = str(row[col_map["category"]]) if "category" in col_map and not pd.isna(row[col_map["category"]]) else "Miscellaneous"
            if not cat or cat == "nan" or cat.strip() == "":
                cat = "Miscellaneous"
                
            tx_type = str(row[col_map["type"]]).upper().strip() if "type" in col_map and not pd.isna(row[col_map["type"]]) else "EXPENSE"
            if tx_type not in ["EXPENSE", "INCOME"]:
                tx_type = "EXPENSE"
                
            dt_val = row[col_map["date"]] if "date" in col_map else None
            dt = datetime.utcnow()
            if dt_val and not pd.isna(dt_val):
                try:
                    if isinstance(dt_val, datetime):
                        dt = dt_val
                    else:
                        dt = pd.to_datetime(dt_val)
                except Exception:
                    pass
            
            notes = str(row[col_map["notes"]]) if "notes" in col_map and not pd.isna(row[col_map["notes"]]) else ""
            if notes == "nan":
                notes = ""
                
            transactions.append(Transaction(
                user_id=str(user.id),
                amount=amt,
                category=cat,
                type=tx_type,
                date=dt,
                year=dt.year,
                month=dt.month,
                day=dt.day,
                notes=notes,
                source="uploaded",
            ))
    else:
        try:
            raw = pd.read_excel(io.BytesIO(contents), header=None) if filename.endswith((".xlsx", ".xls")) else pd.read_csv(io.BytesIO(contents), header=None)
            year_row = raw.iloc[1]
            month_row = raw.iloc[2]
            
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
                    notes=f"Uploaded spreadsheet income ({meta['month_name']} {meta['year']})",
                    source="uploaded",
                ))
                
            for row_idx in range(4, len(raw)):
                row = raw.iloc[row_idx]
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
                        notes=f"Uploaded spreadsheet ({meta['month_name']} {meta['year']})",
                        source="uploaded",
                    ))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Matrix layout parsing failed: {str(e)}")
            
    if not transactions:
        return {"message": "No transactions found or parsed.", "inserted": 0}
        
    await Transaction.find(Transaction.source == "uploaded", Transaction.user_id == str(user.id)).delete()
    await Transaction.insert_many(transactions)
    
    return {
        "message": f"Successfully imported {len(transactions)} transactions.",
        "inserted": len(transactions)
    }

