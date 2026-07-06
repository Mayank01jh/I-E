from datetime import datetime
from typing import Optional, Dict
from beanie import Document
from pydantic import Field, EmailStr

# ──────────────────────────────────────────────────────────────
# Default categories seeded from MY EXPENSES.xlsx
# ──────────────────────────────────────────────────────────────
DEFAULT_CATEGORIES = [
    {"name": "Rent/mortgage", "icon": "🏠", "color": "#6366f1", "is_default": True, "type": "EXPENSE"},
    {"name": "Electricity",    "icon": "⚡", "color": "#f59e0b", "is_default": True, "type": "EXPENSE"},
    {"name": "Shoes",          "icon": "👟", "color": "#ec4899", "is_default": True, "type": "EXPENSE"},
    {"name": "Cafeteria",      "icon": "☕", "color": "#8b5cf6", "is_default": True, "type": "EXPENSE"},
    {"name": "Groceries",      "icon": "🛒", "color": "#10b981", "is_default": True, "type": "EXPENSE"},
    {"name": "Tour",           "icon": "✈️", "color": "#3b82f6", "is_default": True, "type": "EXPENSE"},
    {"name": "Auto expenses",  "icon": "🚗", "color": "#f97316", "is_default": True, "type": "EXPENSE"},
    {"name": "Books & prints", "icon": "📚", "color": "#14b8a6", "is_default": True, "type": "EXPENSE"},
    {"name": "Spotify",        "icon": "🎵", "color": "#22c55e", "is_default": True, "type": "EXPENSE"},
    {"name": "Sip",            "icon": "🧃", "color": "#a855f7", "is_default": True, "type": "EXPENSE"},
    {"name": "Personal care",  "icon": "💆", "color": "#f43f5e", "is_default": True, "type": "EXPENSE"},
    {"name": "Entertainment",  "icon": "🎮", "color": "#0ea5e9", "is_default": True, "type": "EXPENSE"},
    {"name": "Miscellaneous",  "icon": "📦", "color": "#64748b", "is_default": True, "type": "EXPENSE"},
    
    # Income categories
    {"name": "Salary",         "icon": "💼", "color": "#10b981", "is_default": True, "type": "INCOME"},
    {"name": "Freelance",      "icon": "💻", "color": "#0ea5e9", "is_default": True, "type": "INCOME"},
    {"name": "Investments",    "icon": "📈", "color": "#3b82f6", "is_default": True, "type": "INCOME"},
    {"name": "Gifts",          "icon": "🎁", "color": "#ec4899", "is_default": True, "type": "INCOME"},
    {"name": "Others (Income)","icon": "💰", "color": "#f59e0b", "is_default": True, "type": "INCOME"},
]

DEFAULT_BUDGET_LIMITS = {
    "Rent/mortgage": 4500, "Electricity": 0,   "Shoes": 0,
    "Cafeteria": 1408,     "Groceries": 1000,  "Tour": 0,
    "Auto expenses": 0,    "Books & prints": 0, "Spotify": 0,
    "Sip": 0,              "Personal care": 0, "Entertainment": 0,
    "Miscellaneous": 0,
}


class User(Document):
    username:      str
    password_hash: str
    email:         Optional[str] = None
    whatsapp:      Optional[str] = None
    created_at:    datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"
        indexes = ["username"]


class DebtRecord(Document):
    user_id:           Optional[str] = None
    person_name:       str
    contact_email:     str = ""
    contact_whatsapp:  str = ""   # Format: +91XXXXXXXXXX
    amount:            float = Field(..., gt=0)
    type:              str = "LENT"  # LENT | BORROWED
    due_date:          datetime = Field(default_factory=datetime.utcnow)
    is_settled:        bool = False
    notes:             Optional[str] = None
    created_at:        datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "debts"
        indexes = ["user_id"]


class UpcomingBill(Document):
    user_id:    Optional[str] = None
    title:      str
    amount:     float
    category:   str = "Miscellaneous"
    due_date:   datetime = Field(default_factory=datetime.utcnow)
    is_paid:    bool = False
    recurring:  bool = False   # monthly recurring flag
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "upcoming_bills"
        indexes = ["user_id"]


class SavingsGoal(Document):
    user_id:        Optional[str] = None
    title:          str
    target_amount:  float
    current_amount: float = 0.0
    target_date:    Optional[datetime] = None
    category:       str = "Savings"
    created_at:     datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "savings_goals"
        indexes = ["user_id"]


class Transaction(Document):
    user_id:  Optional[str] = None
    amount:   float
    category: str
    type:     str = "EXPENSE"        # EXPENSE | INCOME
    date:     datetime = Field(default_factory=datetime.utcnow)
    year:     Optional[int] = None
    month:    Optional[int] = None
    day:      Optional[int] = None
    notes:    str = ""
    source:   str = "manual"        # manual | seeded

    class Settings:
        name = "transactions"
        indexes = [
            "user_id",
            [
                ("user_id", 1),
                ("year", -1),
                ("month", -1),
            ]
        ]


class Category(Document):
    user_id:    Optional[str] = None
    name:       str
    icon:       str = "📌"
    color:      str = "#64748b"
    is_default: bool = False
    type:       str = "EXPENSE"       # EXPENSE | INCOME

    class Settings:
        name = "categories"
        indexes = [
            "user_id",
            "is_default",
            [
                ("user_id", 1),
                ("name", 1),
            ]
        ]


class Budget(Document):
    user_id:    Optional[str] = None
    year:       int
    month:      int
    baseline:   float = 0.0
    categories: Dict[str, float] = {}

    class Settings:
        name = "budgets"
        indexes = [
            [
                ("user_id", 1),
                ("year", -1),
                ("month", -1),
            ]
        ]
