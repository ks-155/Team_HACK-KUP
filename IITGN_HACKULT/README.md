# Heritage and Travel Report Archive

A lightweight Flask archive for searching, organizing, and exploring heritage and travel reports.

## Features

- Eight in-memory sample reports covering Gujarat and Indian heritage sites
- TF-IDF and cosine-similarity search
- Live era and document-type filters
- Leaflet map markers with report navigation
- Archive chat answers with clickable citations
- In-memory report uploads with keyword-based era and type detection
- APA citation copying for every report
- Shareable report links from the detail drawer
- Related-report navigation in the detail drawer
- Show more pagination for larger result sets
- Accessible labels, focus states, dialogs, live regions, and reduced-motion support
- Printable report detail drawer
- Responsive light and dark themes

## Run locally

```powershell
pip install -r requirements.txt
python main.py
```

Open `http://127.0.0.1:5000/` in a browser.

## Deploy on Render

Set the service root directory to `IITGN_HACKULT`, then use:

**Build command**

```bash
pip install -r requirements.txt
```

**Start command**

```bash
gunicorn main:app
```

## API

- `GET /api/docs`
- `GET /api/search?q=&era=&type=`
- `POST /api/chat`
- `POST /api/upload`
- `GET /api/cite/<id>`

Data is stored in memory in `main.py`. Uploads are available until the process stops.
