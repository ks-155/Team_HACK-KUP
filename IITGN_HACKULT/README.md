# Heritage and Travel Report Archive

A lightweight Flask archive for searching, organizing, and exploring heritage and travel reports.

## Features

- Six in-memory sample reports covering Gujarat heritage sites
- TF-IDF and cosine-similarity search
- Live era and document-type filters
- Leaflet map markers with report navigation
- Archive chat answers with clickable citations

- In-memory report uploads with keyword-based era and type detection
- APA citation copying for every report
- Responsive light and dark themes

## Run locally

```powershell
pip install flask scikit-learn
python main.py
```

Open `http://127.0.0.1:5000/` in a browser.

## API

- `GET /api/docs`
- `GET /api/search?q=&era=&type=`
- `POST /api/chat`
- `POST /api/upload`
- `GET /api/cite/<id>`

Data is stored in memory in `main.py`. Uploads are available until the process stops.
