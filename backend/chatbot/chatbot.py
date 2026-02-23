import fitz  # PyMuPDF
import os
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer

from dotenv import load_dotenv

from openrouter import OpenRouter

client = OpenRouter(api_key="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")  # your key here

# Load .env
load_dotenv()


def load_pdf(path):
    doc = fitz.open(path)
    text = ""
    for page in doc:
        text += page.get_text("text") + "\n"
    return text

def chunk_text(text, chunk_size=500, overlap=100):
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks

import os
import arabic_reshaper
from bidi.algorithm import get_display
from deep_translator import GoogleTranslator

pdf_folder = "documents/"
all_chunks = []

# Function to translate Urdu to English safely in chunks
import time
from deep_translator import GoogleTranslator
import arabic_reshaper
from bidi.algorithm import get_display

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
                break  # success, exit retry loop
            except Exception as e:
                print(f"Translation error (attempt {attempt+1}):", e)
                time.sleep(delay)  # wait before retry
                if attempt == retries - 1:
                    translated_text += chunk  # fallback
    return translated_text

# Loop through PDFs
for pdf_file in os.listdir(pdf_folder):
    if pdf_file.endswith(".pdf"):
        pdf_path = os.path.join(pdf_folder, pdf_file)
        print("Processing:", pdf_file)
        
        text = load_pdf(pdf_path)  # Your PDF reading function
        
        # Detect Urdu and translate
        if is_urdu(text):  # Your language detection function
            text = translate_to_english(text)
            print("Translated Urdu to English.")
        
        # Split into chunks
        chunks = chunk_text(text)  # Your text chunking function
        all_chunks.extend(chunks)

print("Total chunks:", len(all_chunks))


# English embedding model
model = SentenceTransformer("all-MiniLM-L6-v2")

# Create embeddings
embeddings = model.encode(all_chunks, convert_to_numpy=True, normalize_embeddings=True)

# FAISS index
dimension = embeddings.shape[1]
index = faiss.IndexFlatIP(dimension)
index.add(embeddings)

# Save for later use
os.makedirs("index", exist_ok=True)
faiss.write_index(index, "index/faiss_index.bin")
np.save("index/chunks.npy", np.array(all_chunks))

print("✅ FAISS index created and saved.")


def retrieve(query, k=3):
    query_embedding = model.encode([query], convert_to_numpy=True, normalize_embeddings=True)
    distances, indices = index.search(np.array(query_embedding), k)
    return [all_chunks[i] for i in indices[0]]


def generate_answer(query, retrieved_chunks):
    context = "\n\n".join(retrieved_chunks)
    
    prompt = f"""
You are a helpful assistant.
Answer the question only using the provided context.

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

question = "What are the flood safety measures?"
answer = rag_pipeline(question)
print(answer)


