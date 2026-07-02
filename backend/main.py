"""
Expense Dashboard — FastAPI Backend
====================================
Microservice-style routers mounted on a single FastAPI app:
  /api/transactions  — CRUD for daily expenses
  /api/categories    — Default + custom category management
  /api/analytics     — Monthly/yearly aggregations & trends
  /api/budget        — Per-month category budget limits
  /api/seed          — Import MY EXPENSES.xlsx → MongoDB Atlas
"""
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

# Load .env from project root (one level up from backend/)
load_dotenv(dotenv_path=Path(__file__).parent.parent / ".env")

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME     = os.getenv("DB_NAME", "expense_db")
PORT        = int(os.getenv("BACKEND_PORT", 8000))

# Add backend/ to path so routers can import models
sys.path.insert(0, str(Path(__file__).parent))

from models import Transaction, Category, Budget, User, DebtRecord, UpcomingBill, DEFAULT_CATEGORIES
from routers import transactions, categories, analytics, budget, seed, auth, debts, bills


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Startup ───────────────────────────────────────────────
    # Apply runtime patch to prevent MotorDatabase TypeError in Beanie 2.1.0 initialization
    AsyncIOMotorClient.append_metadata = lambda *args, **kwargs: None
    
    # Apply compatibility patches for Beanie + Motor 3.x aggregation cursors
    from beanie.odm.queries.aggregation import AggregationQuery
    from beanie.odm.queries.find import FindMany
    from beanie.odm.utils.projection import get_projection

    async def patched_aggregation_get_cursor(self):
        aggregation_pipeline = self.get_aggregation_pipeline()
        return self.document_model.get_pymongo_collection().aggregate(
            aggregation_pipeline, session=self.session, **self.pymongo_kwargs
        )

    AggregationQuery.get_cursor = patched_aggregation_get_cursor

    async def patched_find_many_get_cursor(self):
        if self.fetch_links:
            aggregation_pipeline = self.build_aggregation_pipeline()
            projection = get_projection(self.projection_model)
            if projection is not None:
                aggregation_pipeline.append({"$project": projection})
            return self.document_model.get_pymongo_collection().aggregate(
                aggregation_pipeline,
                session=self.session,
                **self.pymongo_kwargs,
            )
        return self.document_model.get_pymongo_collection().find(
            filter=self.get_filter_query(),
            sort=self.sort_expressions,
            projection=get_projection(self.projection_model),
            skip=self.skip_number,
            limit=self.limit_number,
            session=self.session,
            **self.pymongo_kwargs,
        )

    FindMany.get_cursor = patched_find_many_get_cursor

    original_find_many_count = FindMany.count

    async def patched_find_many_count(self) -> int:
        if self.fetch_links:
            aggregation_pipeline = self.build_aggregation_pipeline()
            aggregation_pipeline.append({"$count": "count"})
            cursor = self.document_model.get_pymongo_collection().aggregate(
                aggregation_pipeline,
                session=self.session,
                **self.pymongo_kwargs,
            )
            result = await cursor.to_list(length=1)
            return result[0]["count"] if result else 0
        return await original_find_many_count(self)

    FindMany.count = patched_find_many_count
    
    print(f"\n[Backend] Connecting to MongoDB Atlas...")
    client = AsyncIOMotorClient(MONGODB_URI)
    await init_beanie(
        database=client[DB_NAME],
        document_models=[Transaction, Category, Budget, User, DebtRecord, UpcomingBill],
    )
    print(f"[Backend] Connected to database: {DB_NAME}")

    # Seed default categories (idempotent)
    for cat in DEFAULT_CATEGORIES:
        existing = await Category.find_one(Category.name == cat["name"], Category.type == cat["type"])
        if not existing:
            await Category(**cat).insert()
    print(f"[Backend] Default categories ready")
    print(f"[Backend] Running at http://localhost:{PORT}\n")

    yield
    # ── Shutdown ──────────────────────────────────────────────
    client.close()


app = FastAPI(
    title="Expense Dashboard API",
    description="Personal finance tracker — FastAPI + MongoDB Atlas",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow Next.js frontend and gateway
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mount routers ─────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(categories.router)
app.include_router(analytics.router)
app.include_router(budget.router)
app.include_router(seed.router)
app.include_router(debts.router)
app.include_router(bills.router)


@app.get("/")
async def root():
    return {
        "name": "Expense Dashboard API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "endpoints": [
            "/api/transactions",
            "/api/categories",
            "/api/analytics",
            "/api/budget",
            "/api/seed",
        ],
    }


@app.get("/health")
async def health():
    return {"status": "OK", "database": DB_NAME}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=PORT,
        reload=True,
        reload_dirs=[str(Path(__file__).parent)],
    )
