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
    "Hampi": (15.335, 76.462),
    "Champaner-Pavagadh": (22.4833, 73.5333),
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
        "tags": ["stepwell", "queen", "carving", "water", "sculpture"],
        "sources": [
            {"label": "UNESCO World Heritage", "url": "https://whc.unesco.org/en/list/922", "kind": "UNESCO"},
            {"label": "Wikipedia", "url": "https://en.wikipedia.org/wiki/Rani_ki_Vav", "kind": "Encyclopedia"},
        ],
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
        "tags": ["Solanki", "sun", "temple", "sanctum", "carving"],
        "sources": [
            {"label": "Wikipedia", "url": "https://en.wikipedia.org/wiki/Modhera_Sun_Temple", "kind": "Encyclopedia"},
        ],
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
        "tags": ["Indus Valley", "water", "reservoir", "fortification", "Bronze Age"],
        "sources": [
            {"label": "UNESCO World Heritage", "url": "https://whc.unesco.org/en/list/1645", "kind": "UNESCO"},
            {"label": "Wikipedia", "url": "https://en.wikipedia.org/wiki/Dholavira", "kind": "Encyclopedia"},
        ],
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
        "tags": ["Harappan", "dockyard", "harbour", "trade", "drainage"],
        "sources": [
            {"label": "Wikipedia", "url": "https://en.wikipedia.org/wiki/Lothal", "kind": "Encyclopedia"},
        ],
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
        "tags": ["mosque", "jali", "lattice", "carving", "Sultanate"],
        "sources": [
            {"label": "Wikipedia", "url": "https://en.wikipedia.org/wiki/Sidi_Saiyyed_Mosque", "kind": "Encyclopedia"},
        ],
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
        "tags": ["stepwell", "queen", "water", "carving", "Sultanate"],
        "sources": [
            {"label": "Wikipedia", "url": "https://en.wikipedia.org/wiki/Adalaj_Stepwell", "kind": "Encyclopedia"},
        ],
    },
    {
        "id": "hampi",
        "title": "Hampi",
        "author": "Heritage Survey Archive",
        "year": 2022,
        "text": "Hampi was the capital of the Vijayanagara Empire and grew into a remarkable medieval urban centre. Temples, markets, fortifications, and boulder-strewn landscapes preserve the scale of its political and cultural life. Its archaeological remains show how sacred and civic spaces worked together.",
        "place": "Hampi",
        "lat": 15.335,
        "lon": 76.462,
        "era": "Medieval",
        "type": "Archaeological site",
        "tags": ["Vijayanagara", "capital", "temple", "fortification", "archaeology"],
        "sources": [
            {"label": "UNESCO World Heritage", "url": "https://whc.unesco.org/en/list/241", "kind": "UNESCO"},
        ],
    },
    {
        "id": "champaner-pavagadh",
        "title": "Champaner-Pavagadh",
        "author": "Heritage Survey Archive",
        "year": 2023,
        "text": "Champaner-Pavagadh is a medieval archaeological landscape shaped by a hilltop fortress and a historic city below. Its mosques, temples, gates, and water systems reflect layers of religious and civic life. The site preserves an important transition between regional Hindu and Islamic architectural traditions.",
        "place": "Champaner-Pavagadh",
        "lat": 22.4833,
        "lon": 73.5333,
        "era": "Medieval",
        "type": "Archaeological site",
        "tags": ["fort", "mosque", "temple", "water", "architecture"],
        "sources": [
            {"label": "UNESCO World Heritage", "url": "https://whc.unesco.org/en/list/1101", "kind": "UNESCO"},
        ],
    },
]

vectorizer = TfidfVectorizer(
    ngram_range=(1, 2),
    stop_words="english",
    sublinear_tf=True,
)
document_matrix = None


# Build the weighted search text for one document.
def index_text(document):
    repeated = " ".join([document["title"], document["title"], document["title"], document["place"], document["place"], document["place"]])
    metadata = " ".join([document["type"], document["era"], *document["tags"]])
    return f"{repeated} {metadata} {document['text']}"


# Rebuild the search index from all in-memory documents.
def refit_index():
    global document_matrix
    document_matrix = vectorizer.fit_transform([index_text(document) for document in DOCUMENTS])


# Return a document payload with all archive fields.
def document_payload(document):
    return dict(document)


# Split report text into useful sentence units.
def sentences(text):
    return [part.strip() for part in re.split(r"(?<=[.!?])\s+", text) if part.strip()]


# Return query words normalized for matching and highlighting.
def query_terms(query):
    return set(re.findall(r"[a-z0-9]+", query.lower()))


# Return terms from the document metadata that occur in the query.
def matched_terms(document, query):
    terms = query_terms(query)
    candidates = [document["title"], document["place"], document["type"], document["era"], *document["tags"]]
    return [candidate for candidate in candidates if query_terms(candidate) & terms]


# Choose the document sentence with the greatest query-word overlap.
def best_sentence(document, query):
    terms = query_terms(query)
    parts = sentences(document["text"])
    if not terms:
        return parts[0] if parts else ""
    return max(parts, key=lambda part: len(query_terms(part) & terms), default="")


# Rank a query against a supplied, already-filtered document list.
def rank_documents(query, documents=None):
    candidates = DOCUMENTS if documents is None else documents
    if not query.strip():
        return [(document, 0.0) for document in sorted(candidates, key=lambda item: item["title"].lower())]
    indices = [DOCUMENTS.index(document) for document in candidates]
    query_vector = vectorizer.transform([query])
    scores = cosine_similarity(query_vector, document_matrix[indices])[0]
    return sorted(zip(candidates, scores), key=lambda item: item[1], reverse=True)


# Apply keyword-based era inference to an uploaded report.
def guess_era(text):
    keywords = {
        "Ancient": ("ancient", "harappan", "indus", "bronze age", "archaeological"),
        "Medieval": ("medieval", "sultanate", "solanki", "queen", "king"),
        "Colonial": ("colonial", "british", "portuguese", "empire"),
        "Modern": ("modern", "contemporary", "twentieth", "21st"),
    }
    lowered = text.lower()
    return max(keywords, key=lambda era: sum(keyword in lowered for keyword in keywords[era]))


# Apply keyword-based type inference to an uploaded report.
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


# Return the three most similar documents for a known document.
@app.get("/api/related/<document_id>")
def related_docs(document_id):
    document = next((item for item in DOCUMENTS if item["id"] == document_id), None)
    if document is None:
        return jsonify({"error": "Document not found"}), 404
    related = [
        (candidate, score)
        for candidate, score in rank_documents(index_text(document))
        if candidate["id"] != document_id
    ][:3]
    return jsonify([
        {
            "id": candidate["id"],
            "title": candidate["title"],
            "place": candidate["place"],
            "era": candidate["era"],
            "type": candidate["type"],
            "score": round(float(score), 4),
        }
        for candidate, score in related
    ])


# Search filtered documents, using a substring fallback for unmatched queries.
@app.get("/api/search")
def search_docs():
    query = request.args.get("q", "").strip()
    era = request.args.get("era", "").strip()
    doc_type = request.args.get("type", "").strip()
    filtered = [
        document for document in DOCUMENTS
        if (not era or document["era"] == era)
        and (not doc_type or document["type"] == doc_type)
    ]
    ranked = rank_documents(query, filtered)
    if query:
        ranked = [(document, score) for document, score in ranked if score >= 0.05]
        if not ranked:
            lowered = query.lower()
            ranked = [
                (document, 0.0) for document in filtered
                if lowered in " ".join([document["title"], document["place"], *document["tags"]]).lower()
            ]
    return jsonify([
        document_payload(document)
        | {
            "score": round(float(score), 4),
            "snippet": best_sentence(document, query),
            "matched_terms": matched_terms(document, query),
        }
        for document, score in ranked
    ])


# Return sentence-level answers with document citations and source links.
@app.post("/api/chat")
def chat():
    payload = request.get_json(silent=True) or {}
    question = str(payload.get("question", "")).strip()
    if not question:
        return jsonify({"error": "Question is required"}), 400
    ranked = [(document, score) for document, score in rank_documents(question) if score >= 0.08][:3]
    answer = [
        {
            "doc_id": document["id"],
            "title": document["title"],
            "sentence": best_sentence(document, question),
            "sources": document["sources"],
        }
        for document, _score in ranked
    ]
    if not answer:
        return jsonify({"answer": [], "message": "The archive has no report that answers this."})
    return jsonify({"answer": answer})


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
        "tags": [],
        "sources": [],
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
