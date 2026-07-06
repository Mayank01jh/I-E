from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from models import SavingsGoal, User
from routers.auth import get_current_user

router = APIRouter(prefix="/api/goals", tags=["goals"])


class GoalIn(BaseModel):
    title: str
    target_amount: float
    current_amount: Optional[float] = 0.0
    target_date: Optional[datetime] = None
    category: Optional[str] = "Savings"


class ContributeIn(BaseModel):
    amount: float


@router.get("")
async def list_goals(user: User = Depends(get_current_user)):
    return await SavingsGoal.find(SavingsGoal.user_id == str(user.id)).sort(-SavingsGoal.created_at).to_list()


@router.post("", status_code=201)
async def create_goal(data: GoalIn, user: User = Depends(get_current_user)):
    goal = SavingsGoal(
        user_id=str(user.id),
        title=data.title,
        target_amount=data.target_amount,
        current_amount=data.current_amount,
        target_date=data.target_date,
        category=data.category
    )
    await goal.insert()
    return goal


@router.delete("/{goal_id}")
async def delete_goal(goal_id: str, user: User = Depends(get_current_user)):
    goal = await SavingsGoal.get(goal_id)
    if not goal or goal.user_id != str(user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Savings goal not found"
        )
    await goal.delete()
    return {"status": "success"}


@router.put("/{goal_id}/contribute")
async def contribute_to_goal(goal_id: str, data: ContributeIn, user: User = Depends(get_current_user)):
    goal = await SavingsGoal.get(goal_id)
    if not goal or goal.user_id != str(user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Savings goal not found"
        )
    goal.current_amount += data.amount
    await goal.save()
    return goal
