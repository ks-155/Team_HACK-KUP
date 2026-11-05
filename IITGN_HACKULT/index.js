const map = typeof L === "undefined"
  ? null
  : L.map("map", { scrollWheelZoom: false }).setView([23.5, 72.5], 7);
const markers = new Map();
const markerLayer = map ? L.layerGroup().addTo(map) : null;
const state = {
  q: "",
  era: "",
  type: "",
  sort: "relevance",
  results: [],
  allDocuments: [],
  loading: false,
  visibleLimit: 8
};
let searchTimer;
let activeDrawer = null;
let drawerTrigger = null;
let searchRequestId = 0;

if (map) {
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 18
  }).addTo(map);
} else {
  document.getElementById("map").textContent = "Map unavailable. Report results remain available.";
}

// Fetch JSON from an archive endpoint and raise useful errors.
async function fetchJSON(url, options) {
  const method = options && options.method ? options.method.toUpperCase() : "GET";
  const retryDelays = method === "GET" ? [1000, 2000, 4000, 8000, 15000] : [];

  for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
    let response;
    try {
      response = await fetch(url, options);
    } catch (error) {
      if (attempt === retryDelays.length) {
        if (method !== "GET") throw error;
        throw new Error("The archive server is still waking up or unavailable. Please try again in a moment.");
      }
      await new Promise((resolve) => window.setTimeout(resolve, retryDelays[attempt]));
      continue;
    }

    const contentType = response.headers.get("content-type") || "";
    const isJSON = contentType.includes("application/json") || contentType.includes("+json");

    if (response.ok && isJSON) return response.json();

    if (response.status >= 500 || (response.ok && !isJSON)) {
      if (attempt === retryDelays.length) {
        throw new Error("The archive server is still waking up or unavailable. Please try again in a moment.");
      }
      await new Promise((resolve) => window.setTimeout(resolve, retryDelays[attempt]));
      continue;
    }

    if (isJSON) {
      const data = await response.json();
      throw new Error(data.error || "The archive could not complete that request.");
    }
    throw new Error("The archive returned an unexpected response. Please try again.");
  }
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

// Show a short bottom-center status message for a user action.
function showToast(message) {
  let toast = document.getElementById("archive-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "archive-toast";
    toast.className = "archive-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => { toast.hidden = true; }, 2500);
}

// Keep search and filter state shareable in the browser URL.
function syncURL() {
  const params = new URLSearchParams();
  if (state.q) params.set("q", state.q);
  if (state.era) params.set("era", state.era);
  if (state.type) params.set("type", state.type);
  if (state.sort !== "relevance") params.set("sort", state.sort);
  const query = params.toString();
  window.history.replaceState({}, "", query ? `?${query}` : window.location.pathname);
}

// Restore valid search state from the current browser URL.
function restoreURL() {
  const params = new URLSearchParams(window.location.search);
  state.q = params.get("q") || "";
  state.era = params.get("era") || "";
  state.type = params.get("type") || "";
  state.sort = ["relevance", "title", "era"].includes(params.get("sort")) ? params.get("sort") : "relevance";
  document.getElementById("search-input").value = state.q;
  document.getElementById("era-filter").value = state.era;
  document.getElementById("type-filter").value = state.type;
  document.getElementById("sort-filter").value = state.sort;
}

// Add current result markers, offsetting duplicate locations and fitting the map.
function renderMap(results) {
  if (!map || !markerLayer) return;
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
    const marker = L.marker([lat, lon], { title: document.title }).bindPopup(
      `<strong>${escapeHTML(document.title)}</strong><br>${escapeHTML(document.era)} · ${escapeHTML(document.type)}<br>${sourceHTML}`
    );
    marker.addTo(markerLayer);
    markers.set(document.id, marker);
    bounds.push([lat, lon]);
    marker.on("click", () => activateCard(document.id));
  });
  if (bounds.length === 1) map.setView(bounds[0], 10);
  if (bounds.length > 1) map.fitBounds(bounds, { padding: [28, 28] });
}

// Set the active card and scroll it into view after a marker click.
function activateCard(id) {
  document.querySelectorAll(".result-card.is-active").forEach((card) => card.classList.remove("is-active"));
  const card = [...document.querySelectorAll(".result-card")].find((item) => item.dataset.id === id);
  if (!card) return;
  card.classList.add("is-active");
  card.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "nearest" });
}

// Raise and emphasize one marker while its result card is hovered.
function highlightMarker(id, highlighted) {
  markers.forEach((marker, markerId) => {
    marker.setOpacity(!highlighted || markerId === id ? 1 : 0.45);
    marker.setZIndexOffset(highlighted && markerId === id ? 1000 : 0);
  });
}

// Return whether the user has requested reduced motion.
function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Focus a current result on the map and open its popup.
function focusDocument(id) {
  if (!map) return;
  const document = state.results.find((item) => item.id === id) || state.allDocuments.find((item) => item.id === id);
  const marker = markers.get(id);
  if (!document || !marker) return;
  const position = marker.getLatLng();
  activateCard(id);
  if (prefersReducedMotion()) {
    map.setView(position, 12);
  } else {
    map.flyTo(position, 12, { duration: 0.8 });
  }
  marker.openPopup();
}

// Render six lightweight placeholders while results are loading.
function renderSkeletons() {
  document.getElementById("results").innerHTML = Array.from({ length: 6 }, () => `
    <article class="result-card skeleton-card" aria-hidden="true">
      <span class="skeleton-line skeleton-short"></span>
      <span class="skeleton-line skeleton-title"></span>
      <span class="skeleton-line"></span>
      <span class="skeleton-line skeleton-long"></span>
      <span class="skeleton-line skeleton-long"></span>
    </article>
  `).join("");
}

// Render active search and filter chips with removable controls.
function renderActiveFilters() {
  const container = document.getElementById("active-filters");
  const filters = [
    ["q", state.q ? `Search: ${state.q}` : ""],
    ["era", state.era ? `Era: ${state.era}` : ""],
    ["type", state.type ? `Type: ${state.type}` : ""],
    ["sort", state.sort !== "relevance" ? `Sort: ${state.sort}` : ""]
  ].filter((item) => item[1]);
  container.innerHTML = filters.map(([key, label]) => `
    <button class="filter-chip" data-filter="${key}" type="button">${escapeHTML(label)} ×</button>
  `).join("");
  container.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state[button.dataset.filter] = button.dataset.filter === "sort" ? "relevance" : "";
      syncControls();
      fetchResults();
    });
  });
}

// Keep form controls and result count synchronized with application state.
function syncControls() {
  document.getElementById("search-input").value = state.q;
  document.getElementById("era-filter").value = state.era;
  document.getElementById("type-filter").value = state.type;
  document.getElementById("sort-filter").value = state.sort;
  document.getElementById("clear-search").hidden = !state.q;
  renderActiveFilters();
}

// Render an actionable empty state for the current query and filters.
function renderEmptyState() {
  const suffix = state.q ? ` matching '${escapeHTML(state.q)}'` : "";
  document.getElementById("results").innerHTML = `
    <div class="empty-state">
      <span aria-hidden="true">◌</span>
      <h3>No reports in the archive${suffix}</h3>
      <p>Try a broader search or clear the current filters.</p>
      <div class="empty-actions">
        <button class="button button-accent" id="empty-clear" type="button">Clear filters</button>
        <button class="text-button" id="empty-show-all" type="button">Show all reports</button>
      </div>
    </div>
  `;
  document.getElementById("empty-clear").addEventListener("click", clearFilters);
  document.getElementById("empty-show-all").addEventListener("click", showAllReports);
}

// Render a retryable error state when the search request fails.
function renderErrorState(error) {
  document.getElementById("results").innerHTML = `
    <div class="empty-state">
      <h3>Search unavailable</h3>
      <p>${escapeHTML(error.message)}</p>
      <button class="button button-accent" id="retry-search" type="button">Retry</button>
    </div>
  `;
  document.getElementById("retry-search").addEventListener("click", loadResults);
}

// Render result cards with snippets, sources, and document actions.
function renderCards(results) {
  const container = document.getElementById("results");
  if (!results.length) {
    renderEmptyState();
    return;
  }
  const visibleResults = results.slice(0, state.visibleLimit);
  container.innerHTML = visibleResults.map((item) => `
    <article class="result-card" data-id="${escapeHTML(item.id)}">
      <div class="card-topline"><span class="tag">${escapeHTML(item.era)}</span><span>${escapeHTML(item.year)}</span></div>
      <h3>${escapeHTML(item.title)}</h3>
      <p class="place">${escapeHTML(item.place)} <span aria-hidden="true">·</span> ${escapeHTML(item.type)}</p>
      <p class="result-snippet">${highlightSnippet(item.snippet || item.text, item.matched_terms)}</p>
      <div class="source-list">${renderSources(item.sources)}</div>
      <div class="card-actions">
        <button class="text-button map-button" data-id="${escapeHTML(item.id)}" type="button">View on map <span aria-hidden="true">↗</span></button>
        <button class="text-button cite-button" data-id="${escapeHTML(item.id)}" type="button">Copy APA</button>
        <button class="text-button details-button" data-id="${escapeHTML(item.id)}" type="button">Details</button>
      </div>
    </article>
  `).join("");
  if (results.length > state.visibleLimit) {
    container.insertAdjacentHTML("beforeend", `
      <div class="show-more-wrap">
        <button class="button button-dark show-more" type="button">Show more</button>
      </div>
    `);
    container.querySelector(".show-more").addEventListener("click", () => {
      state.visibleLimit += 8;
      renderCards(state.results);
    });
  }
  container.querySelectorAll(".result-card").forEach((card) => {
    card.addEventListener("mouseenter", () => highlightMarker(card.dataset.id, true));
    card.addEventListener("mouseleave", () => highlightMarker(card.dataset.id, false));
  });
  container.querySelectorAll(".map-button").forEach((button) => {
    button.addEventListener("click", () => focusDocument(button.dataset.id));
  });
  container.querySelectorAll(".cite-button").forEach((button) => {
    button.addEventListener("click", () => copyCitation(button));
  });
  container.querySelectorAll(".details-button").forEach((button) => {
    button.addEventListener("click", () => showDetails(button.dataset.id, button));
  });
}

// Sort API results using the current client-side sort selection.
function sortResults(results) {
  if (state.sort === "title") return [...results].sort((a, b) => a.title.localeCompare(b.title));
  if (state.sort === "era") return [...results].sort((a, b) => a.era.localeCompare(b.era) || a.title.localeCompare(b.title));
  return results;
}

// Load and render current results from the search endpoint.
async function loadResults() {
  const requestId = ++searchRequestId;
  state.loading = true;
  state.visibleLimit = 8;
  renderSkeletons();
  syncURL();
  renderActiveFilters();
  const params = new URLSearchParams({ q: state.q, era: state.era, type: state.type });
  try {
    const results = await fetchJSON(`/api/search?${params}`);
    if (requestId !== searchRequestId) return;
    state.results = sortResults(results);
    renderCards(state.results);
    renderMap(state.results);
    document.getElementById("result-count").textContent = `${state.results.length} report${state.results.length === 1 ? "" : "s"}`;
  } catch (error) {
    if (requestId !== searchRequestId) return;
    state.results = [];
    renderMap([]);
    renderErrorState(error);
  } finally {
    if (requestId === searchRequestId) state.loading = false;
  }
}

// Debounce result requests by 250 milliseconds.
function fetchResults() {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(loadResults, 250);
}

// Clear all search and filter state.
function clearFilters() {
  state.q = "";
  state.era = "";
  state.type = "";
  state.sort = "relevance";
  state.visibleLimit = 8;
  syncControls();
  fetchResults();
}

// Show every report using the default archive ordering.
function showAllReports() {
  clearFilters();
}

// Copy a document's APA citation and provide toast feedback.
async function copyCitation(button) {
  try {
    const data = await fetchJSON(`/api/cite/${button.dataset.id}`);
    await navigator.clipboard.writeText(data.citation);
    showToast("APA citation copied");
  } catch (error) {
    showToast("Could not copy the citation");
  }
}

// Copy a stable report URL to the clipboard.
async function copyReportLink(button) {
  const url = new URL(window.location.href);
  url.searchParams.set("q", button.dataset.title);
  url.hash = `report-${button.dataset.id}`;
  try {
    await navigator.clipboard.writeText(url.toString());
    showToast("Report link copied");
  } catch (error) {
    showToast("Could not copy the report link");
  }
}

// Return the shared drawer backdrop, creating it once when needed.
function getDrawerBackdrop() {
  let backdrop = document.getElementById("drawer-backdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.className = "drawer-backdrop";
    backdrop.id = "drawer-backdrop";
    backdrop.addEventListener("click", closeDrawer);
    document.body.appendChild(backdrop);
  }
  return backdrop;
}

// Open a drawer, remember its trigger, and move focus into its close button.
function openDrawer(element, triggerBtn) {
  drawerTrigger = triggerBtn || document.activeElement;
  activeDrawer = element;
  element.classList.add("is-open");
  getDrawerBackdrop().classList.add("is-open");
  const closeButton = element.querySelector(".drawer-close");
  if (closeButton) closeButton.focus();
}

// Close the active drawer and restore focus to the control that opened it.
function closeDrawer() {
  if (!activeDrawer) return;
  activeDrawer.classList.remove("is-open");
  getDrawerBackdrop().classList.remove("is-open");
  const trigger = drawerTrigger;
  activeDrawer = null;
  drawerTrigger = null;
  if (trigger && typeof trigger.focus === "function") trigger.focus();
}

// Add a close button and accessibility attributes to a drawer panel.
function prepareDrawer(element, label) {
  element.classList.add("drawer");
  element.setAttribute("role", "dialog");
  element.setAttribute("aria-modal", "true");
  element.setAttribute("aria-label", label);
  let closeButton = element.querySelector(".drawer-close");
  if (!closeButton) {
    closeButton = document.createElement("button");
    closeButton.className = "text-button drawer-close";
    closeButton.type = "button";
    closeButton.textContent = "Close ×";
    element.prepend(closeButton);
  }
  if (!closeButton.dataset.closeBound) {
    closeButton.addEventListener("click", closeDrawer);
    closeButton.dataset.closeBound = "true";
  }
}

// Open a report drawer with full metadata, sources, and related reports.
async function showDetails(id, triggerBtn) {
  const record = state.allDocuments.find((item) => item.id === id) || state.results.find((item) => item.id === id);
  if (!record) return;
  const drawer = getDetailsDrawer();
  drawer.panel.innerHTML = `<span class="eyebrow">Report details</span><h2>${escapeHTML(record.title)}</h2><p class="drawer-meta">${escapeHTML(record.place)} · ${escapeHTML(record.era)} · ${escapeHTML(record.type)} · ${escapeHTML(record.year)}</p><p>${escapeHTML(record.text)}</p><div class="tag-list">${(record.tags || []).map((tag) => `<span class="tag-chip">${escapeHTML(tag)}</span>`).join("") || "<span class=\"no-source\">No tags</span>"}</div><h3>Sources</h3><div class="source-list">${renderSources(record.sources)}</div><div class="drawer-actions"><button class="button button-dark drawer-cite" type="button" data-id="${escapeHTML(record.id)}">Copy APA citation</button><button class="button button-dark drawer-link" type="button" data-id="${escapeHTML(record.id)}" data-title="${escapeHTML(record.title)}">Copy link</button></div><h3>Related reports</h3><div id="related-reports">Loading related reports...</div>`;
  openDrawer(drawer.element, triggerBtn);
  drawer.panel.querySelector(".drawer-cite").addEventListener("click", (event) => copyCitation(event.currentTarget));
  drawer.panel.querySelector(".drawer-link").addEventListener("click", (event) => copyReportLink(event.currentTarget));
  try {
    const related = await fetchJSON(`/api/related/${id}`);
    document.getElementById("related-reports").innerHTML = related.length
      ? related.map((item) => `<button class="text-button related-button" data-id="${escapeHTML(item.id)}" type="button">${escapeHTML(item.title)} <span aria-hidden="true">↗</span></button>`).join("<br>")
      : "No related reports found.";
    drawer.panel.querySelectorAll(".related-button").forEach((button) => button.addEventListener("click", () => {
      showDetails(button.dataset.id, button);
    }));
  } catch (error) {
    document.getElementById("related-reports").textContent = "Related reports are unavailable.";
  }
}

// Create the reusable details drawer and backdrop.
function getDetailsDrawer() {
  let drawer = document.getElementById("details-drawer");
  if (drawer) {
    const panel = drawer.querySelector(".drawer-content");
    return { element: drawer, panel };
  }
  drawer = document.createElement("aside");
  drawer.className = "drawer details-drawer";
  drawer.id = "details-drawer";
  const panel = document.createElement("div");
  panel.className = "drawer-content";
  drawer.appendChild(panel);
  document.body.appendChild(drawer);
  prepareDrawer(drawer, "Report details");
  return { element: drawer, panel };
}

// Submit a question and render linked sentence-level sources.
async function handleChatSubmit(event) {
  event.preventDefault();
  const input = document.getElementById("chat-input");
  const question = input.value.trim();
  if (!question) return;
  const status = document.getElementById("chat-status");
  const answer = document.getElementById("chat-answer");
  const examples = document.getElementById("chat-examples");
  if (examples) examples.hidden = true;
  status.textContent = "Thinking...";
  answer.hidden = true;
  const thread = document.getElementById("chat-thread");
  if (thread) {
    thread.insertAdjacentHTML("beforeend", `<div class="chat-message chat-question"><strong>You</strong><p>${escapeHTML(question)}</p></div>`);
  }
  input.value = "";
  try {
    const data = await fetchJSON("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question })
    });
    if (!data.answer.length) {
      answer.innerHTML = `<p>${escapeHTML(data.message)}</p>`;
    } else {
      answer.innerHTML = data.answer.map((line) => `
        <div class="answer-line">
          <p>${escapeHTML(line.sentence)} <button class="citation" data-id="${escapeHTML(line.doc_id)}" type="button">[${escapeHTML(line.title)}]</button></p>
          <div class="answer-sources">${renderSources(line.sources)}</div>
        </div>
      `).join("");
      answer.querySelectorAll(".citation").forEach((button) => button.addEventListener("click", () => {
        focusDocument(button.dataset.id);
        showDetails(button.dataset.id, button);
      }));
    }
    if (thread) {
      thread.insertAdjacentHTML("beforeend", `<div class="chat-message chat-response"><strong>Archive</strong>${answer.innerHTML}</div>`);
      thread.querySelectorAll(".chat-response .citation").forEach((button) => button.addEventListener("click", () => {
        focusDocument(button.dataset.id);
        showDetails(button.dataset.id, button);
      }));
      answer.hidden = true;
    } else {
      answer.hidden = false;
    }
    status.textContent = "";
  } catch (error) {
    status.textContent = error.message;
  }
}

// Submit a report, then refresh places and search results.
async function handleUploadSubmit(event) {
  event.preventDefault();
  if (!validateUpload()) return;
  const status = document.getElementById("upload-status");
  const submit = document.querySelector("#upload-form button[type='submit']");
  submit.disabled = true;
  submit.textContent = "Working...";
  status.textContent = "";
  try {
    const created = await fetchJSON("/api/upload", {
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
    await loadAllDocuments();
    await loadResults();
    closeDrawer();
    showToast("Report added");
    window.setTimeout(() => {
      const card = document.querySelector(`.result-card[data-id="${CSS.escape(created.id)}"]`);
      if (card) {
        card.classList.add("is-new");
        card.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
        window.setTimeout(() => card.classList.remove("is-new"), 2000);
      }
    }, 50);
  } catch (error) {
    status.textContent = error.message;
  } finally {
    submit.disabled = false;
    submit.innerHTML = `Add to archive <span aria-hidden="true">↗</span>`;
  }
}

// Validate the upload fields and display inline guidance before submission.
function validateUpload() {
  const title = document.getElementById("upload-title");
  const place = document.getElementById("upload-place");
  const text = document.getElementById("upload-text");
  const errors = document.getElementById("upload-errors");
  const messages = [];
  if (!title.value.trim()) messages.push("Add a report title.");
  if (!place.value) messages.push("Choose a place.");
  if (text.value.trim().length < 40) messages.push("Report text must be at least 40 characters.");
  errors.textContent = messages.join(" ");
  return !messages.length;
}

// Keep the report character counter and submit button state current.
function syncUploadValidation() {
  const text = document.getElementById("upload-text");
  document.getElementById("upload-counter").textContent = `${text.value.length} characters (40 minimum)`;
  const submit = document.querySelector("#upload-form button[type='submit']");
  submit.disabled = !document.getElementById("upload-title").value.trim()
    || !document.getElementById("upload-place").value
    || text.value.trim().length < 40;
  if (document.getElementById("upload-errors").textContent) validateUpload();
}

// Open the chat and upload drawers with example prompts and form guidance.
function prepareInteractiveDrawers() {
  const chat = document.getElementById("chat-panel");
  const upload = document.getElementById("upload-panel");
  prepareDrawer(chat, "Ask the archive");
  prepareDrawer(upload, "Add a report");
  const chatForm = document.getElementById("chat-form");
  const examples = document.createElement("div");
  examples.id = "chat-examples";
  examples.className = "chat-examples";
  examples.innerHTML = ["Which sites show water management?", "What is distinctive about jali carving?", "Which reports describe ancient cities?"]
    .map((question) => `<button class="filter-chip" type="button">${question}</button>`).join("");
  chatForm.before(examples);
  examples.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => {
    document.getElementById("chat-input").value = button.textContent;
    document.getElementById("chat-input").focus();
  }));
  const thread = document.createElement("div");
  thread.id = "chat-thread";
  thread.className = "chat-thread";
  chatForm.before(thread);
  const counter = document.createElement("div");
  counter.id = "upload-counter";
  counter.className = "upload-counter";
  counter.textContent = "0 characters (40 minimum)";
  const errors = document.createElement("div");
  errors.id = "upload-errors";
  errors.className = "form-error";
  errors.setAttribute("role", "alert");
  document.getElementById("upload-text").after(counter, errors);
  document.getElementById("open-chat").addEventListener("click", (event) => openDrawer(chat, event.currentTarget));
  document.getElementById("open-upload").addEventListener("click", (event) => openDrawer(upload, event.currentTarget));
  ["upload-title", "upload-place", "upload-text"].forEach((id) => document.getElementById(id).addEventListener("input", syncUploadValidation));
  syncUploadValidation();
}

// Load all known documents and populate the upload selector.
async function loadAllDocuments() {
  state.allDocuments = await fetchJSON("/api/docs");
  const placeSelect = document.getElementById("upload-place");
  const places = [...new Set(state.allDocuments.map((item) => item.place)), "Jaipur"]
    .filter((place, index, list) => list.indexOf(place) === index)
    .sort();
  placeSelect.innerHTML = `<option value="">Choose a place</option>${places.map((place) => `<option value="${escapeHTML(place)}">${escapeHTML(place)}</option>`).join("")}`;
  document.getElementById("stat-reports").textContent = state.allDocuments.length;
  document.getElementById("stat-places").textContent = new Set(state.allDocuments.map((item) => item.place)).size;
  document.getElementById("stat-eras").textContent = new Set(state.allDocuments.map((item) => item.era)).size;
}

// Preserve the existing place-loading entry point for upload refreshes.
async function loadPlaces() {
  await loadAllDocuments();
}

// Wire archive controls, restore URL state, and load the initial collection.
async function initializeArchive() {
  restoreURL();
  document.getElementById("search-input").addEventListener("input", () => {
    state.q = document.getElementById("search-input").value.trim();
    fetchResults();
  });
  document.getElementById("clear-search").addEventListener("click", () => {
    state.q = "";
    syncControls();
    fetchResults();
  });
  document.getElementById("era-filter").addEventListener("change", (event) => {
    state.era = event.target.value;
    fetchResults();
  });
  document.getElementById("type-filter").addEventListener("change", (event) => {
    state.type = event.target.value;
    fetchResults();
  });
  document.getElementById("sort-filter").addEventListener("change", (event) => {
    state.sort = event.target.value;
    fetchResults();
  });
  document.getElementById("clear-filters").addEventListener("click", clearFilters);
  document.getElementById("chat-form").addEventListener("submit", handleChatSubmit);
  document.getElementById("upload-form").addEventListener("submit", handleUploadSubmit);
  prepareInteractiveDrawers();
  document.getElementById("chat-input").addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      document.getElementById("chat-form").requestSubmit();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Tab" && activeDrawer) {
      const focusable = [...activeDrawer.querySelectorAll("button, input, select, textarea, a[href]")].filter((item) => !item.disabled && item.offsetParent !== null);
      if (focusable.length) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    if (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) {
      event.preventDefault();
      document.getElementById("search-input").focus();
    }
    if (event.key === "Escape") {
      if (activeDrawer) {
        closeDrawer();
      } else if (document.activeElement === document.getElementById("search-input")) {
        state.q = "";
        syncControls();
        fetchResults();
      }
    }
  });
  try {
    await loadAllDocuments();
    await loadResults();
  } catch (error) {
    renderErrorState(error);
  }
}

document.addEventListener("DOMContentLoaded", initializeArchive);
