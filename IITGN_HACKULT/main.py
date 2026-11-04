from pathlib import Path
import re

from flask import Flask, jsonify, request, send_from_directory
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


app = Flask(__name__)
BASE_DIR = Path(__file__).resolve().parent

PLACES = {
    "Rani ki Vav (Patan)": (23.8589, 72.1017),
    "Modhera Sun Temple": (23.5836, 72.1333),
    "Dholavira": (23.8864, 70.2136),
    "Lothal": (22.5226, 72.2510),
    "Sidi Saiyyed Mosque (Ahmedabad)": (23.0258, 72.5873),
    "Adalaj Stepwell": (23.1667, 72.5833),
    "Hampi": (15.3350, 76.4600),
    "Jaipur": (26.9124, 75.7873),
}

DOCUMENTS = [
    {
        "id": "rani-ki-vav",
        "title": "Rani ki Vav",
        "author": "Heritage Survey Archive",
        "year": 2018,
        "text": "Rani ki Vav is an ornate stepwell commissioned in memory of King Bhimdev I. Its descending terraces are covered with finely carved sculptures and narrative panels. The monument illustrates the engineering and ritual importance of water architecture in medieval Gujarat.",
        "place": "Rani ki Vav (Patan)",
        "lat": 23.8589,
        "lon": 72.1017,
        "era": "Medieval",
        "type": "Stepwell",
    },
    {
        "id": "modhera-sun-temple",
        "title": "Modhera Sun Temple",
        "author": "Heritage Survey Archive",
        "year": 2020,
        "text": "The Modhera Sun Temple was built in the eleventh century under the Solanki dynasty. Its sanctum, assembly hall, and stepped tank form a carefully aligned ceremonial complex. Carved figures and solar imagery reveal the artistic ambition of medieval Gujarat.",
        "place": "Modhera Sun Temple",
        "lat": 23.5836,
        "lon": 72.1333,
        "era": "Medieval",
        "type": "Temple",
    },
    {
        "id": "dholavira",
        "title": "Dholavira",
        "author": "Archaeological Research Collective",
        "year": 2021,
        "text": "Dholavira was a major urban settlement of the Indus Valley Civilisation on Khadir island. Its reservoirs, fortifications, and planned streets demonstrate sophisticated water management and civic design. Excavated inscriptions and artefacts connect the site to a wide Bronze Age trading network.",
        "place": "Dholavira",
        "lat": 23.8864,
        "lon": 70.2136,
        "era": "Ancient",
        "type": "Archaeological site",
    },
    {
        "id": "lothal",
        "title": "Lothal",
        "author": "Archaeological Research Collective",
        "year": 2019,
        "text": "Lothal was an important Harappan settlement and maritime trading centre in present-day Gujarat. The excavated dockyard, warehouses, bead workshops, and drainage system show a highly organised urban economy. Its material culture records connections between inland communities and seaborne commerce.",
        "place": "Lothal",
        "lat": 22.5226,
        "lon": 72.2510,
        "era": "Ancient",
        "type": "Archaeological site",
    },
    {
        "id": "sidi-saiyyed-mosque",
        "title": "Sidi Saiyyed Mosque",
        "author": "Ahmedabad City Archive",
        "year": 2017,
        "text": "The Sidi Saiyyed Mosque was completed in Ahmedabad in the final years of the Gujarat Sultanate. It is celebrated for its delicate stone lattice windows, especially the tree of life motif. The mosque remains a distinctive example of Indo-Islamic craftsmanship in the historic city.",
        "place": "Sidi Saiyyed Mosque (Ahmedabad)",
        "lat": 23.0258,
        "lon": 72.5873,
        "era": "Medieval",
        "type": "Mosque",
    },
    {
        "id": "adalaj-stepwell",
        "title": "Adalaj Stepwell",
        "author": "Heritage Survey Archive",
        "year": 2016,
        "text": "Adalaj Stepwell was commissioned by Queen Rudabai and completed in the late fifteenth century. Five levels descend around a richly decorated central shaft, creating a cool and shaded gathering place. Its carvings combine local traditions with architectural influences from the Sultanate period.",
        "place": "Adalaj Stepwell",
        "lat": 23.1667,
        "lon": 72.5833,
        "era": "Medieval",
        "type": "Stepwell",
    },
]

vectorizer = TfidfVectorizer(stop_words="english")
document_matrix = None


# Rebuild the search index from the current in-memory documents.
def refit_index():
    global document_matrix
    document_matrix = vectorizer.fit_transform([document["text"] for document in DOCUMENTS])


# Return a normalized document payload with coordinates included.
def document_payload(document):
    return {**document, "lat": document["lat"], "lon": document["lon"]}


# Rank documents against a query and return their similarity scores.
def ranked_documents(query):
    if not query.strip():
        return [(document, 0.0) for document in DOCUMENTS]
    query_vector = vectorizer.transform([query])
    scores = cosine_similarity(query_vector, document_matrix)[0]
    return sorted(zip(DOCUMENTS, scores), key=lambda item: item[1], reverse=True)


# Guess an era from common heritage keywords.
def guess_era(text):
    keywords = {
        "Ancient": ("ancient", "harappan", "indus", "bronze age", "archaeological"),
        "Medieval": ("medieval", "sultanate", "solanki", "queen", "king"),
        "Colonial": ("colonial", "british", "portuguese", "empire"),
        "Modern": ("modern", "contemporary", "twentieth", "21st"),
    }
    lowered = text.lower()
    return max(keywords, key=lambda era: sum(keyword in lowered for keyword in keywords[era]))


# Guess a document type from common heritage keywords.
def guess_type(text):
    keywords = {
        "Temple": ("temple", "sun temple", "sanctum"),
        "Fort": ("fort", "fortification", "citadel"),
        "Stepwell": ("stepwell", "step well", "well"),
        "Mosque": ("mosque", "sultanate", "minaret"),
        "Archaeological site": ("archaeological", "excavated", "settlement", "harappan"),
        "Travelogue": ("journey", "travel", "traveller", "itinerary"),
    }
    lowered = text.lower()
    return max(keywords, key=lambda item: sum(keyword in lowered for keyword in keywords[item]))


# Split text into short sentences while preserving useful answer fragments.
def sentences(text):
    return [part.strip() for part in re.split(r"(?<=[.!?])\s+", text) if part.strip()]


# Serve the single-page application asset from the project directory.
@app.get("/")
def serve_index():
    return send_from_directory(BASE_DIR, "index.html")


# Serve the JavaScript and stylesheet assets from the project directory.
@app.get("/<path:asset>")
def serve_asset(asset):
    if asset in {"index.js", "style.css"}:
        return send_from_directory(BASE_DIR, asset)
    return jsonify({"error": "Asset not found"}), 404


# Return all documents currently held in memory.
@app.get("/api/docs")
def get_docs():
    return jsonify([document_payload(document) for document in DOCUMENTS])


# Search documents with optional text, era, and type filters.
@app.get("/api/search")
def search_docs():
    query = request.args.get("q", "").strip()
    era = request.args.get("era", "").strip()
    doc_type = request.args.get("type", "").strip()
    matches = [
        (document, score)
        for document, score in ranked_documents(query)
        if (not era or document["era"] == era)
        and (not doc_type or document["type"] == doc_type)
    ]
    return jsonify([document_payload(document) | {"score": round(float(score), 4)} for document, score in matches])


# Answer a question with relevant sentences and document citations.
@app.post("/api/chat")
def chat():
    payload = request.get_json(silent=True) or {}
    question = str(payload.get("question", "")).strip()
    if not question:
        return jsonify({"error": "Question is required"}), 400
    top_documents = ranked_documents(question)[:3]
    answer_parts = []
    for document, _score in top_documents:
        answer_parts.extend(sentences(document["text"])[:2])
    answer = " ".join(answer_parts[:5])
    citations = [{"id": document["id"], "title": document["title"]} for document, _score in top_documents]
    return jsonify({"answer": answer, "citations": citations})


# Add an uploaded document, infer metadata, and rebuild the search index.
@app.post("/api/upload")
def upload():
    payload = request.get_json(silent=True) or {}
    title = str(payload.get("title", "")).strip()
    text = str(payload.get("text", "")).strip()
    place = str(payload.get("place", "")).strip()
    if not title or not text or not place:
        return jsonify({"error": "Title, text, and place are required"}), 400
    if place not in PLACES:
        return jsonify({"error": "Choose a place from the available list"}), 400
    lat, lon = PLACES[place]
    new_document = {
        "id": re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-") or f"document-{len(DOCUMENTS) + 1}",
        "title": title,
        "author": "Community Archive",
        "year": 2026,
        "text": text,
        "place": place,
        "lat": lat,
        "lon": lon,
        "era": guess_era(f"{title} {text}"),
        "type": guess_type(f"{title} {text}"),
    }
    DOCUMENTS.append(new_document)
    refit_index()
    return jsonify(document_payload(new_document)), 201


# Return an APA-style citation for one document.
@app.get("/api/cite/<document_id>")
def cite(document_id):
    document = next((item for item in DOCUMENTS if item["id"] == document_id), None)
    if document is None:
        return jsonify({"error": "Document not found"}), 404
    citation = f'{document["author"]}. ({document["year"]}). {document["title"]}. Heritage and Travel Report Archive.'
    return jsonify({"citation": citation})


refit_index()


if __name__ == "__main__":
    app.run(debug=True)