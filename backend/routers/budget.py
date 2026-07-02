from typing import Optional, Dict
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from models import Budget, DEFAULT_BUDGET_LIMITS, User
from routers.auth import get_current_user

router = APIRouter(prefix="/api/budget", tags=["budget"])


class BudgetIn(BaseModel):
    baseline:   Optional[float] = 0.0
    categories: Optional[Dict[str, float]] = None


@router.get("")
async def list_budgets(user: User = Depends(get_current_user)):
    return await Budget.find(Budget.user_id == str(user.id)).sort(-Budget.year, -Budget.month).to_list()


@router.get("/{year}/{month}")
async def get_budget(year: int, month: int, user: User = Depends(get_current_user)):
    budget = await Budget.find_one(Budget.year == year, Budget.month == month, Budget.user_id == str(user.id))
    if not budget:
        budget = Budget(user_id=str(user.id), year=year, month=month, baseline=0.0, categories=dict(DEFAULT_BUDGET_LIMITS))
        await budget.insert()
    return budget


@router.put("/{year}/{month}")
async def update_budget(year: int, month: int, data: BudgetIn, user: User = Depends(get_current_user)):
    budget = await Budget.find_one(Budget.year == year, Budget.month == month, Budget.user_id == str(user.id))
    if not budget:
        budget = Budget(user_id=str(user.id), year=year, month=month, baseline=0.0)
        await budget.insert()
    if data.baseline is not None:
        budget.baseline = data.baseline
    if data.categories is not None:
        budget.categories = data.categories
    await budget.save()
    return budget
