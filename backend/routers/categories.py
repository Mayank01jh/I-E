from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from models import Category, DEFAULT_CATEGORIES, User
from routers.auth import get_current_user

from typing import Optional

router = APIRouter(prefix="/api/categories", tags=["categories"])


class CategoryIn(BaseModel):
    name:  str
    icon:  str = "📌"
    color: str = "#64748b"
    type:  str = "EXPENSE"  # EXPENSE | INCOME


@router.get("")
async def list_categories(type: Optional[str] = None, user: User = Depends(get_current_user)):
    query = {"$or": [{"user_id": str(user.id)}, {"is_default": True}]}
    if type:
        query = {
            "$and": [
                {"$or": [{"user_id": str(user.id)}, {"is_default": True}]},
                {"type": type}
            ]
        }
    categories = await Category.find(query).sort(Category.name).to_list()
    
    # Deduplicate categories by name (case-insensitive), prioritizing user-defined custom categories
    seen = {}
    for cat in categories:
        name_lower = cat.name.strip().lower()
        if name_lower not in seen or (not cat.is_default and seen[name_lower].is_default):
            seen[name_lower] = cat
            
    return sorted(seen.values(), key=lambda c: c.name)


@router.post("", status_code=201)
async def create_category(data: CategoryIn, user: User = Depends(get_current_user)):
    existing = await Category.find_one(
        Category.name == data.name.strip(),
        Category.type == data.type,
        {"$or": [{"user_id": str(user.id)}, {"is_default": True}]}
    )
    if existing:
        raise HTTPException(409, "Category already exists")
    cat = Category(
        user_id=str(user.id),
        name=data.name.strip(),
        icon=data.icon,
        color=data.color,
        is_default=False,
        type=data.type,
    )
    await cat.insert()
    return cat


@router.put("/{id}")
async def update_category(id: str, data: CategoryIn, user: User = Depends(get_current_user)):
    cat = await Category.get(id)
    if not cat:
        raise HTTPException(404, "Not found")
    if cat.is_default:
        raise HTTPException(403, "Cannot edit default categories")
    if cat.user_id != str(user.id):
        raise HTTPException(403, "Access denied")
    
    cat.name  = data.name.strip()
    cat.icon  = data.icon
    cat.color = data.color
    cat.type  = data.type
    await cat.save()
    return cat


@router.delete("/{id}")
async def delete_category(id: str, user: User = Depends(get_current_user)):
    cat = await Category.get(id)
    if not cat:
        raise HTTPException(404, "Not found")
    if cat.is_default:
        raise HTTPException(403, "Cannot delete default categories")
    if cat.user_id != str(user.id):
        raise HTTPException(403, "Access denied")
    await cat.delete()
    return {"message": "Deleted"}
