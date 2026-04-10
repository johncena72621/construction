import os

SECRET_KEY = os.getenv("SECRET_KEY", "CHANGE_ME_IN_PRODUCTION_use_openssl_rand_hex_32")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./buildpro.db")

# Railway provides DATABASE_URL in the format `postgresql://...`
# but SQLAlchemy async requires `postgresql+asyncpg://...`
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
elif DATABASE_URL.startswith("postgresql://") and not DATABASE_URL.startswith("postgresql+asyncpg://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# AI keys — leave blank, user fills later
AI_PROVIDER = os.getenv("AI_PROVIDER", "")  # openai | gemini | custom
AI_API_KEY = os.getenv("AI_API_KEY", "")
AI_ENDPOINT = os.getenv("AI_ENDPOINT", "")

# UPI config — leave blank, user fills later
UPI_MERCHANT_ID = os.getenv("UPI_MERCHANT_ID", "")
UPI_MERCHANT_NAME = os.getenv("UPI_MERCHANT_NAME", "Samarth Developers")
UPI_VPA = os.getenv("UPI_VPA", "")  # e.g. merchant@upi

APP_NAME = "BuildPro API"
APP_VERSION = "3.0.0"

# CORS configuration
# You can input comma-separated origins like: "http://localhost:3000,https://myapp.com"
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")
