from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends
from models import Transaction, Budget, User
from routers.auth import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


async def calculate_monthly_baseline(year: Optional[int], month: Optional[int], user_id: str) -> float:
    match_filter = {"user_id": user_id, "type": "INCOME"}
    if year:
        match_filter["year"] = year
    if month:
        match_filter["month"] = month

    pipeline = [
        {"$match": match_filter},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    result = await Transaction.aggregate(pipeline).to_list()
    total_income = result[0]["total"] if result else 0.0

    if total_income == 0.0 and year and month:
        budget = await Budget.find_one(Budget.year == year, Budget.month == month, Budget.user_id == user_id)
        if budget:
            total_income = budget.baseline or 0.0

    return total_income


@router.get("/monthly")
async def monthly(year: Optional[int] = None, month: Optional[int] = None, user: User = Depends(get_current_user)):
    match_filter: dict = {"user_id": str(user.id), "type": "EXPENSE"}
    if year:  match_filter["year"]  = year
    if month: match_filter["month"] = month

    pipeline = [
        {"$match": match_filter},
        {"$group": {"_id": "$category", "total": {"$sum": "$amount"}, "count": {"$sum": 1}}},
        {"$sort": {"total": -1}},
    ]
    result = await Transaction.aggregate(pipeline).to_list()
    total_spent = sum(r["total"] for r in result)

    baseline = await calculate_monthly_baseline(year, month, str(user.id))

    # Fetch categories for this user (both default and custom) to map name to color
    from models import Category
    categories = await Category.find({"$or": [{"user_id": str(user.id)}, {"is_default": True}]}).to_list()
    cat_colors = {cat.name.strip().lower(): cat.color for cat in categories}

    by_category_list = []
    for r in result:
        cat_name = r["_id"]
        cat_key = cat_name.strip().lower() if cat_name else ""
        color = cat_colors.get(cat_key, "#64748b")
        by_category_list.append({
            "category": cat_name,
            "total": r["total"],
            "count": r["count"],
            "color": color
        })

    return {
        "year": year,
        "month": month,
        "baseline": baseline,
        "totalSpent": total_spent,
        "totalSaved": max(0, baseline - total_spent),
        "savingsRate": round(((baseline - total_spent) / baseline) * 100, 1) if baseline > 0 else 0.0,
        "byCategory": by_category_list,
    }


@router.get("/yearly")
async def yearly(year: Optional[int] = None, user: User = Depends(get_current_user)):
    y = year or datetime.utcnow().year
    pipeline = [
        {"$match": {"user_id": str(user.id), "year": y, "type": "EXPENSE"}},
        {"$group": {"_id": {"month": "$month", "category": "$category"}, "total": {"$sum": "$amount"}}},
        {"$sort": {"_id.month": 1}},
    ]
    result = await Transaction.aggregate(pipeline).to_list()
    monthly: dict = {m: {"month": m, "total": 0.0, "categories": {}} for m in range(1, 13)}
    for r in result:
        m = r["_id"]["month"]
        monthly[m]["total"] += r["total"]
        monthly[m]["categories"][r["_id"]["category"]] = r["total"]
    return {"year": y, "monthly": list(monthly.values())}


@router.get("/trends")
async def trends(user: User = Depends(get_current_user)):
    now = datetime.utcnow()
    points = []
    for i in range(5, -1, -1):
        m = now.month - i
        y = now.year
        while m <= 0:
            m += 12
            y -= 1
        pipeline = [
            {"$match": {"user_id": str(user.id), "year": y, "month": m, "type": "EXPENSE"}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
        ]
        agg = await Transaction.aggregate(pipeline).to_list()
        points.append({"year": y, "month": m, "total": agg[0]["total"] if agg else 0.0})
    return points


@router.get("/savings-rate")
async def savings_rate(year: Optional[int] = None, month: Optional[int] = None, user: User = Depends(get_current_user)):
    now = datetime.utcnow()
    y = year or now.year
    m = month or now.month
    pipeline = [
        {"$match": {"user_id": str(user.id), "year": y, "month": m, "type": "EXPENSE"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    agg = await Transaction.aggregate(pipeline).to_list()
    spent = agg[0]["total"] if agg else 0.0

    baseline = await calculate_monthly_baseline(y, m, str(user.id))
    saved = max(0, baseline - spent)
    return {
        "year": y,
        "month": m,
        "baseline": baseline,
        "spent": spent,
        "saved": saved,
        "savingsRate": round((saved / baseline) * 100, 1) if baseline > 0 else 0.0,
    }


@router.get("/check-budget")
async def check_budget(user: User = Depends(get_current_user)):
    from routers.alerts import send_whatsapp_alert
    
    now = datetime.utcnow()
    pipeline = [
        {"$match": {"user_id": str(user.id), "year": now.year, "month": now.month, "type": "EXPENSE"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
    ]
    agg = await Transaction.aggregate(pipeline).to_list()
    spent = agg[0]["total"] if agg else 0.0
    
    baseline = await calculate_monthly_baseline(now.year, now.month, str(user.id))
    if baseline == 0.0:
        baseline = 15000.0
        
    if spent > baseline:
        overrun = spent - baseline
        alert_msg = (
            f"⚠️ CRITICAL BUDGET ALERT: Total monthly spending has reached ₹{spent:,.2f}, "
            f"exceeding your ₹{baseline:,.2f} baseline by ₹{overrun:,.2f}!"
        )
        send_whatsapp_alert("+919999999999", alert_msg)
        return {"status": "OVER_BUDGET", "spent": spent, "baseline": baseline, "overrun": overrun}
        
    return {"status": "STABLE", "spent": spent, "baseline": baseline}
