const map = L.map("map", { scrollWheelZoom: false }).setView([23.5, 72.5], 7);
const markers = new Map();
const markerLayer = L.layerGroup().addTo(map);
let documents = [];

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

// Add or refresh a document marker on the map.
function addMarker(document) {
  const marker = L.marker([document.lat, document.lon]).bindPopup(
    `<strong>${escapeHTML(document.title)}</strong><br>${escapeHTML(document.place)}`
  );
  marker.addTo(markerLayer);
  markers.set(document.id, marker);
}

// Escape archive text before placing it into an HTML string.
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[character]));
}

// Focus a document on the map and open its popup.
function focusDocument(id) {
  const document = documents.find((item) => item.id === id);
  const marker = markers.get(id);
  if (!document || !marker) return;
  map.flyTo([document.lat, document.lon], 12, { duration: 0.8 });
  marker.openPopup();
}

// Render the current search results as readable archive cards.
function renderResults(results) {
  const container = document.getElementById("results");
  document.getElementById("result-count").textContent = `${results.length} report${results.length === 1 ? "" : "s"}`;
  if (!results.length) {
    container.innerHTML = `<div class="empty-state"><span aria-hidden="true">◌</span><h3>No reports found</h3><p>Try a broader search or clear a filter.</p></div>`;
    return;
  }
  container.innerHTML = results.map((item) => `
    <article class="result-card">
      <div class="card-topline"><span class="tag">${escapeHTML(item.era)}</span><span>${escapeHTML(item.year)}</span></div>
      <h3>${escapeHTML(item.title)}</h3>
      <p class="place">${escapeHTML(item.place)} <span aria-hidden="true">·</span> ${escapeHTML(item.type)}</p>
      <p>${escapeHTML(item.text)}</p>
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

// Load filtered results from the search endpoint.
async function updateSearch() {
  const params = new URLSearchParams({
    q: document.getElementById("search-input").value,
    era: document.getElementById("era-filter").value,
    type: document.getElementById("type-filter").value
  });
  try {
    renderResults(await fetchJSON(`/api/search?${params}`));
  } catch (error) {
    document.getElementById("results").innerHTML = `<div class="empty-state"><h3>Search unavailable</h3><p>${escapeHTML(error.message)}</p></div>`;
  }
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

// Submit a question and render linked source citations.
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
    answer.innerHTML = `<p>${escapeHTML(data.answer)}</p><div class="citations"><span>Sources</span>${data.citations.map((citation) => `<button class="citation" data-id="${escapeHTML(citation.id)}" type="button">${escapeHTML(citation.title)} <span aria-hidden="true">↗</span></button>`).join("")}</div>`;
    answer.querySelectorAll(".citation").forEach((button) => button.addEventListener("click", () => focusDocument(button.dataset.id)));
    answer.hidden = false;
    status.textContent = "";
  } catch (error) {
    status.textContent = error.message;
  }
}

// Submit a report, then refresh documents, markers, and search results.
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
    await loadDocuments();
  } catch (error) {
    status.textContent = error.message;
  }
}

// Load all documents and initialize map markers and upload places.
async function loadDocuments() {
  documents = await fetchJSON("/api/docs");
  markerLayer.clearLayers();
  markers.clear();
  documents.forEach(addMarker);
  const placeSelect = document.getElementById("upload-place");
  const places = [...new Set(documents.map((item) => item.place)), "Hampi", "Jaipur"].filter((place, index, list) => list.indexOf(place) === index);
  placeSelect.innerHTML = `<option value="">Choose a place</option>${places.map((place) => `<option>${escapeHTML(place)}</option>`).join("")}`;
  await updateSearch();
}

// Wire archive controls and load the initial collection.
async function initializeArchive() {
  document.getElementById("search-input").addEventListener("input", updateSearch);
  document.getElementById("era-filter").addEventListener("change", updateSearch);
  document.getElementById("type-filter").addEventListener("change", updateSearch);
  document.getElementById("chat-form").addEventListener("submit", handleChatSubmit);
  document.getElementById("upload-form").addEventListener("submit", handleUploadSubmit);
  try {
    await loadDocuments();
  } catch (error) {
    document.getElementById("results").innerHTML = `<div class="empty-state"><h3>Archive unavailable</h3><p>${escapeHTML(error.message)}</p></div>`;
  }
}

document.addEventListener("DOMContentLoaded", initializeArchive);