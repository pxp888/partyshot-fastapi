# fargate_notes/Dockerfile
FROM python:3.12-slim

# Set environment variables for Python
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on

WORKDIR /app

# Install system dependencies (e.g., for psycopg2)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy backend code
COPY backend/ /app/

# Expose the port FastAPI runs on
EXPOSE 8000

# Use uvicorn directly for better debugging
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
