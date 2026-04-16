from sqlalchemy import Column, String, Boolean, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.db.base import Base


class Category(Base):
    """Expense category model."""

    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(50), nullable=False)
    icon = Column(String(10), nullable=True)  # Emoji or icon identifier
    color = Column(String(7), nullable=True)  # Hex color code
    is_default = Column(Boolean, default=False)
    budget_amount = Column(Numeric(12, 2), nullable=True)
    budget_currency = Column(String(3), default="USD")

    # Relationships
    user = relationship("User", back_populates="categories")
    expenses = relationship("Expense", back_populates="category")

    def __repr__(self) -> str:
        return f"<Category {self.name}>"


# Default categories to seed for new users
DEFAULT_CATEGORIES = [
    {"name": "Food & Dining", "icon": "🍕", "color": "#FF6B6B"},
    {"name": "Groceries", "icon": "🛒", "color": "#4ECDC4"},
    {"name": "Transportation", "icon": "🚗", "color": "#45B7D1"},
    {"name": "Housing", "icon": "🏠", "color": "#96CEB4"},
    {"name": "Utilities", "icon": "💡", "color": "#FFEAA7"},
    {"name": "Entertainment", "icon": "🎬", "color": "#DDA0DD"},
    {"name": "Shopping", "icon": "🛍️", "color": "#FF85A2"},
    {"name": "Healthcare", "icon": "🏥", "color": "#7FDBFF"},
    {"name": "Education", "icon": "📚", "color": "#B19CD9"},
    {"name": "Personal Care", "icon": "💅", "color": "#FFB347"},
    {"name": "Travel", "icon": "✈️", "color": "#87CEEB"},
    {"name": "Subscriptions", "icon": "📱", "color": "#98D8C8"},
    {"name": "Other", "icon": "📦", "color": "#C0C0C0"},
]
