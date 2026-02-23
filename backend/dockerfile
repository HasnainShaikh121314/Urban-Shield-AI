FROM python:3.10-slim

WORKDIR /app

# Install system dependencies (for sentence-transformers, FAISS, etc.)
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your application
COPY . .

# Hugging Face expects the app to listen on port 7860
ENV PORT=7860

# Run with gunicorn
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:7860", "api:app"]
