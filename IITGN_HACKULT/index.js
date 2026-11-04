const map = L.map("map", { scrollWheelZoom: false }).setView([23.5, 72.5], 7);
const markers = new Map();
const markerLayer = L.layerGroup().addTo(map);
let documents = [];
let searchTimer;

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
  maxZoom: 18
}).addTo(map);

// Fetch JSON from an archive endpoint and raise useful errors.
async function fetchJSON(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "The archive could not complete that request.");
  return data;
}

// Escape archive text before placing it into an HTML string.
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[character]));
}

// Highlight matched terms in a safely escaped snippet.
function highlightSnippet(text, terms) {
  const escaped = escapeHTML(text);
  if (!terms || !terms.length) return escaped;
  const pattern = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return escaped.replace(new RegExp(`(${pattern})`, "gi"), "<mark>$1</mark>");
}

// Render external source links with their source-kind badges.
function renderSources(sources) {
  if (!sources || !sources.length) return `<span class="no-source">No external source</span>`;
  return sources.map((source) => `
    <a class="source-link" href="${escapeHTML(source.url)}" target="_blank" rel="noopener noreferrer">
      <span class="source-kind">${escapeHTML(source.kind)}</span>${escapeHTML(source.label)} <span aria-hidden="true">↗</span>
    </a>
  `).join("");
}

// Add current result markers, offsetting duplicate locations and fitting the map.
function renderMap(results) {
  markerLayer.clearLayers();
  markers.clear();
  const bounds = [];
  const seen = new Map();
  results.forEach((document) => {
    const coordinateKey = `${document.lat.toFixed(2)},${document.lon.toFixed(2)}`;
    const duplicateIndex = seen.get(coordinateKey) || 0;
    seen.set(coordinateKey, duplicateIndex + 1);
    const lat = document.lat + duplicateIndex * 0.01;
    const lon = document.lon + duplicateIndex * 0.01;
    const firstSource = document.sources && document.sources[0];
    const sourceHTML = firstSource
      ? `<a href="${escapeHTML(firstSource.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(firstSource.label)}</a>`
      : "No external source";
    const marker = L.marker([lat, lon]).bindPopup(
      `<strong>${escapeHTML(document.title)}</strong><br>${escapeHTML(document.era)} · ${escapeHTML(document.type)}<br>${sourceHTML}`
    );
    marker.addTo(markerLayer);
    markers.set(document.id, marker);
    bounds.push([lat, lon]);
  });
  if (bounds.length === 1) map.setView(bounds[0], 10);
  if (bounds.length > 1) map.fitBounds(bounds, { padding: [28, 28] });
}

// Focus a current result on the map and open its popup.
function focusDocument(id) {
  const document = documents.find((item) => item.id === id);
  const marker = markers.get(id);
  if (!document || !marker) return;
  const position = marker.getLatLng();
  map.flyTo(position, 12, { duration: 0.8 });
  marker.openPopup();
}

// Render the current search results as source-aware archive cards.
function renderResults(results, query) {
  const container = document.getElementById("results");
  document.getElementById("result-count").textContent = `${results.length} report${results.length === 1 ? "" : "s"}`;
  if (!results.length) {
    const suffix = query ? ` matches '${escapeHTML(query)}'` : "";
    container.innerHTML = `<div class="empty-state"><span aria-hidden="true">◌</span><h3>No report in the archive${suffix}</h3><p>Try a broader search or clear a filter.</p></div>`;
    return;
  }
  container.innerHTML = results.map((item) => `
    <article class="result-card">
      <div class="card-topline"><span class="tag">${escapeHTML(item.era)}</span><span>${escapeHTML(item.year)}</span></div>
      <h3>${escapeHTML(item.title)}</h3>
      <p class="place">${escapeHTML(item.place)} <span aria-hidden="true">·</span> ${escapeHTML(item.type)}</p>
      <p>${highlightSnippet(item.snippet || item.text, item.matched_terms)}</p>
      <div class="source-list">${renderSources(item.sources)}</div>
      <div class="card-actions">
        <button class="text-button map-button" data-id="${escapeHTML(item.id)}" type="button">View on map <span aria-hidden="true">↗</span></button>
        <button class="text-button cite-button" data-id="${escapeHTML(item.id)}" type="button">Copy APA</button>
      </div>
    </article>
  `).join("");
  container.querySelectorAll(".map-button").forEach((button) => {
    button.addEventListener("click", () => focusDocument(button.dataset.id));
  });
  container.querySelectorAll(".cite-button").forEach((button) => {
    button.addEventListener("click", () => copyCitation(button));
  });
}

// Load filtered results, refresh markers, and fit the map to visible results.
async function updateSearch() {
  const query = document.getElementById("search-input").value.trim();
  const params = new URLSearchParams({
    q: query,
    era: document.getElementById("era-filter").value,
    type: document.getElementById("type-filter").value
  });
  try {
    const results = await fetchJSON(`/api/search?${params}`);
    documents = results;
    renderResults(results, query);
    renderMap(results);
  } catch (error) {
    documents = [];
    renderMap([]);
    document.getElementById("results").innerHTML = `<div class="empty-state"><h3>Search unavailable</h3><p>${escapeHTML(error.message)}</p></div>`;
  }
}

// Debounce search input so live queries wait for a short pause.
function scheduleSearch() {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(updateSearch, 250);
}

// Copy a document's APA citation and provide inline feedback.
async function copyCitation(button) {
  try {
    const data = await fetchJSON(`/api/cite/${button.dataset.id}`);
    await navigator.clipboard.writeText(data.citation);
    button.textContent = "Copied";
    window.setTimeout(() => { button.textContent = "Copy APA"; }, 1600);
  } catch (error) {
    button.textContent = "Copy failed";
  }
}

// Render sentence-level chat answers with clickable document and source links.
function renderChatAnswer(data) {
  const answer = document.getElementById("chat-answer");
  if (!data.answer.length) {
    answer.innerHTML = `<p>${escapeHTML(data.message)}</p>`;
    answer.hidden = false;
    return;
  }
  answer.innerHTML = data.answer.map((line) => `
    <div class="answer-line">
      <p>${escapeHTML(line.sentence)} <button class="citation" data-id="${escapeHTML(line.doc_id)}" type="button">[${escapeHTML(line.title)}]</button></p>
      <div class="answer-sources">${renderSources(line.sources)}</div>
    </div>
  `).join("");
  answer.querySelectorAll(".citation").forEach((button) => {
    button.addEventListener("click", () => focusDocument(button.dataset.id));
  });
  answer.hidden = false;
}

// Submit a question and render linked sentence-level sources.
async function handleChatSubmit(event) {
  event.preventDefault();
  const status = document.getElementById("chat-status");
  const answer = document.getElementById("chat-answer");
  status.textContent = "Searching the archive...";
  answer.hidden = true;
  try {
    const data = await fetchJSON("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: document.getElementById("chat-input").value })
    });
    renderChatAnswer(data);
    status.textContent = "";
  } catch (error) {
    status.textContent = error.message;
  }
}

// Submit a report, then refresh documents, places, results, and map markers.
async function handleUploadSubmit(event) {
  event.preventDefault();
  const status = document.getElementById("upload-status");
  status.textContent = "Adding report...";
  try {
    await fetchJSON("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: document.getElementById("upload-title").value,
        text: document.getElementById("upload-text").value,
        place: document.getElementById("upload-place").value
      })
    });
    document.getElementById("upload-form").reset();
    status.textContent = "Report added to the archive.";
    await loadPlaces();
    await updateSearch();
  } catch (error) {
    status.textContent = error.message;
  }
}

// Load all known places into the upload selector.
async function loadPlaces() {
  const allDocuments = await fetchJSON("/api/docs");
  const placeSelect = document.getElementById("upload-place");
  const places = [...new Set(allDocuments.map((item) => item.place)), "Hampi", "Champaner-Pavagadh", "Jaipur"]
    .filter((place, index, list) => list.indexOf(place) === index)
    .sort();
  placeSelect.innerHTML = `<option value="">Choose a place</option>${places.map((place) => `<option value="${escapeHTML(place)}">${escapeHTML(place)}</option>`).join("")}`;
}

// Wire archive controls and load the initial collection.
async function initializeArchive() {
  document.getElementById("search-input").addEventListener("input", scheduleSearch);
  document.getElementById("era-filter").addEventListener("change", updateSearch);
  document.getElementById("type-filter").addEventListener("change", updateSearch);
  document.getElementById("chat-form").addEventListener("submit", handleChatSubmit);
  document.getElementById("upload-form").addEventListener("submit", handleUploadSubmit);
  try {
    await loadPlaces();
    await updateSearch();
  } catch (error) {
    document.getElementById("results").innerHTML = `<div class="empty-state"><h3>Archive unavailable</h3><p>${escapeHTML(error.message)}</p></div>`;
  }
}

document.addEventListener("DOMContentLoaded", initializeArchive);
