import chromadb
from chromadb.utils import embedding_functions

# Initialize local persistent ChromaDB
chroma_client = chromadb.PersistentClient(path="./chroma_db")

# Default embedding function uses all-MiniLM-L6-v2 (runs locally, perfect for demo)
emb_fn = embedding_functions.DefaultEmbeddingFunction()

collection = chroma_client.get_or_create_collection(
    name="patient_histories",
    embedding_function=emb_fn
)

def add_patient_history(patient_id: int, history_text: str):
    """Embeds and saves the patient's medical history to the vector database."""
    collection.upsert(
        documents=[history_text],
        metadatas=[{"patient_id": patient_id}],
        ids=[f"patient_{patient_id}"]
    )

def retrieve_context(patient_id: int, query: str) -> str:
    """Retrieves relevant medical history based on the current symptoms."""
    results = collection.query(
        query_texts=[query],
        n_results=1,
        where={"patient_id": patient_id}
    )
    if results['documents'] and results['documents'][0]:
        return results['documents'][0][0]
    return "No specific medical history found in vector store."
