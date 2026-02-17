# 1. Use an official Python base image
FROM python:3.12-slim
# Use the root as the context
WORKDIR /code

# Copy requirements from the backend folder
COPY ./requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend code (which includes your static/ folder)
COPY ./backend /code/backend
RUN touch /code/backend/__init__.py

# Set the working directory to where your main.py is
WORKDIR /code/backend

# Start FastAPI (telling it where to find the app)
CMD ["uvicorn", "main:app", "--host", "192.168.0.225", "--port", "8000"]
