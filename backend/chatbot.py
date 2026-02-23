import os
import numpy as np
import faiss
import fitz  # PyMuPDF
from sentence_transformers import SentenceTransformer
from openrouter import OpenRouter
import arabic_reshaper
from bidi.algorithm import get_display
from deep_translator import GoogleTranslator
import time

# -----------------------------
# OpenRouter Client
# -----------------------------
client = OpenRouter(api_key="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")

# -----------------------------
# Load PDF
# -----------------------------
def load_pdf(path):
    doc = fitz.open(path)
    text = ""
    for page in doc:
        text += page.get_text("text") + "\n"
    return text

# -----------------------------
# Detect Urdu
# -----------------------------
def is_urdu(text):
    for char in text:
        if "\u0600" <= char <= "\u06FF":
            return True
    return False

# -----------------------------
# Chunk text
# -----------------------------
def chunk_text(text, chunk_size=500, overlap=100):
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks

# -----------------------------
# Translate Urdu to English
# -----------------------------
translator = GoogleTranslator(source='ur', target='en')

def translate_to_english(text, chunk_size=2000, retries=3, delay=2):
    reshaped_text = get_display(arabic_reshaper.reshape(text))
    translated_text = ""
    for i in range(0, len(reshaped_text), chunk_size):
        chunk = reshaped_text[i:i+chunk_size]
        for attempt in range(retries):
            try:
                translated_chunk = translator.translate(chunk)
                translated_text += translated_chunk + " "
                break
            except Exception as e:
                print(f"Translation error (attempt {attempt+1}):", e)
                time.sleep(delay)
                if attempt == retries - 1:
                    translated_text += chunk  # fallback
    return translated_text

# -----------------------------
# Paths and files
# -----------------------------
pdf_folder = "documents/"
index_folder = "index"
os.makedirs(index_folder, exist_ok=True)

chunks_file = os.path.join(index_folder, "chunks.npy")
faiss_file = os.path.join(index_folder, "faiss_index.bin")

# -----------------------------
# Load existing index and chunks if available
# -----------------------------
if os.path.exists(faiss_file) and os.path.exists(chunks_file):
    print("Loading existing FAISS index and chunks...")
    all_chunks = np.load(chunks_file, allow_pickle=True).tolist()
    index = faiss.read_index(faiss_file)
else:
    print("No existing index found. Initializing new index...")
    all_chunks = []
    index = None

# -----------------------------
# Initialize model
# -----------------------------
model = SentenceTransformer("all-MiniLM-L6-v2")

# -----------------------------
# Process new PDFs only
# -----------------------------
new_chunks = []

for pdf_file in os.listdir(pdf_folder):
    if pdf_file.endswith(".pdf"):
        pdf_path = os.path.join(pdf_folder, pdf_file)

        # Skip if PDF already processed (optional: based on file name)
        if any(pdf_file in c for c in all_chunks):
            continue

        print("Processing:", pdf_file)
        text = load_pdf(pdf_path)

        if is_urdu(text):
            text = translate_to_english(text)
            print("Translated Urdu to English.")

        chunks = chunk_text(text)
        new_chunks.extend(chunks)

# -----------------------------
# Update embeddings and FAISS index
# -----------------------------
if new_chunks:
    print(f"Creating embeddings for {len(new_chunks)} new chunks...")
    new_embeddings = model.encode(new_chunks, convert_to_numpy=True, normalize_embeddings=True)

    if index is None:
        # Initialize FAISS index
        dimension = new_embeddings.shape[1]
        index = faiss.IndexFlatIP(dimension)

    index.add(new_embeddings)
    all_chunks.extend(new_chunks)

    # Save for future use
    faiss.write_index(index, faiss_file)
    np.save(chunks_file, np.array(all_chunks))
    print("✅ FAISS index updated and saved.")
else:
    print("No new PDFs to process. Using existing index.")

# -----------------------------
# Retrieve and RAG functions
# -----------------------------
def retrieve(query, k=3):
    query_embedding = model.encode([query], convert_to_numpy=True, normalize_embeddings=True)
    distances, indices = index.search(np.array(query_embedding), k)
    return [all_chunks[i] for i in indices[0]]

def generate_answer(query, retrieved_chunks):
    context = "\n\n".join(retrieved_chunks)
    prompt = f"""
You are a helpful and calm disaster assistant. 
Answer the user's question **only using the context provided**. 
Do not add anything not in the context. 
Explain in simple, easy-to-understand words, suitable for someone who is worried or stressed.

Context:
{context}

Question:
{query}

Answer:
"""
    response = client.chat.send(
        model="openai/gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3
    )
    return response.choices[0].message.content

def rag_pipeline(query, k=3):
    retrieved = retrieve(query, k)
    answer = generate_answer(query, retrieved)
    return answer

