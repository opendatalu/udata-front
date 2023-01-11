/**
 * Updates the title of the site if we are in a search page.
 * It takes into account:
 * - The search query
 * - The page number
 * - The filters
 */


/**
 * Constants
 */
const QS_SEARCH_FILTERS = [
  "organization",
  "tag",
  "format",
  "license",
  "geozone",
  "granularity",
];

/**
 * Generic helpers
 */
function getQueryStringParam(p) {
  const params = new Proxy(new URLSearchParams(window.location.search), {
    get: (searchParams, prop) => searchParams.get(prop),
  });
  return params[p];
}

function decodeParam(encoded) {
  if (!encoded) {
    return "";
  }
  return decodeURIComponent(encoded.replaceAll("+", " "));
}

function getMetaTagValue(metaName) {
  const metas = document.getElementsByTagName("meta");
  for (let i = 0; i < metas.length; i++) {
    if (
      metas[i].getAttribute("name") === metaName ||
      metas[i].getAttribute("property") === metaName
    ) {
      return metas[i].getAttribute("content");
    }
  }
  return "";
}

/**
 * Helpers dedicated to retrieve the filter values from the DOM
 */
function getFilterNumber(qs_name) {
  const idx = QS_SEARCH_FILTERS.indexOf(qs_name);
  if (idx !== -1) {
    return idx + 1;
  }
  return null;
}

function getFilterLabel(qs_name) {
  const idx = getFilterNumber(qs_name);
  if (idx === null) {
    return null;
  }
  return document
    .getElementById("multiselect-" + idx + "-label")
    .textContent.trim();
}

function getFilterValue(qs_name) {
  const idx = getFilterNumber(qs_name);
  if (idx === null) {
    return null;
  }
  return document
    .getElementById("multiselect-" + idx + "-button")
    .textContent.trim();
}

/**
 * Main method to update the title
 */

const baseTitle = getMetaTagValue("og:title");

function updateTitle() {
  var title_parts = [];

  const searchQuery = decodeParam(getQueryStringParam("q"));
  if (searchQuery) {
    title_parts.push(searchQuery);
  }

  // Filters
  for (var i = 0; i < QS_SEARCH_FILTERS.length; i++) {
    let filter_key = QS_SEARCH_FILTERS[i];
    if (getQueryStringParam(filter_key)) {
      let filter_name = getFilterLabel(filter_key);
      let filter_value = getFilterValue(filter_key);
      title_parts.push(filter_name + ": " + filter_value);
    }
  }

  const page = getQueryStringParam("page");
  if (page) {
    title_parts.push("Page " + page);
  }

  title_parts.push(baseTitle);

  document.title = title_parts.join(" - ");
}

/**
 * Poll the search filters in the query string to check for changes
 * If changes, update title.
 * No listener exists
 */

var search_string = null;
function checkSearchChange() {
  if (window.location.search !== search_string) {
    search_string = window.location.search;
    updateTitle();
  }
}

function startTitleUpdate() {
  const searchInput = document.querySelector(
    ".fr-search-bar > input.fr-input[type=search]"
  );

  if (searchInput) {
    setInterval(checkSearchChange, 500);
  }
}

export default (function () {
  if (document.readyState === "complete") {
    startTitleUpdate();
  } else {
    window.addEventListener("DOMContentLoaded", () => {
      startTitleUpdate();
    });
  }
})();
