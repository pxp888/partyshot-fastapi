FROM python:3.12-slim
WORKDIR /code

# Install dependencies
COPY ./requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy everything from your local 'backend' folder
# directly into the current WORKDIR (/code)
COPY ./backend /code/
RUN touch /code/__init__.py

# Now 'main.py' and the 'static' folder are both directly in /code
# No need to change WORKDIR again

# Use 0.0.0.0 so EC2 can route traffic to the container
# CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "main:app", "--bind", "0.0.0.0:8000"]
