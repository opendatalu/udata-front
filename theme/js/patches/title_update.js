/**
 * Updates the title of the site if we are in a search page.
 * It takes into account:
 * - The search query
 * - The page number
 * - The filters of the page datasets and reuses
 */

/**
 * Functions
 */

function getCurrentPage() {
  for (var i = 0; i < PAGES.length; i++) {
    if (window.location.href.includes(PAGES[i])) {
      return PAGES[i];
    }
  }
  return null;
}

function getQueryStringParam(p, search) {
  if (search) {
    search = search.split("?").pop();
  } else {
    search = window.location.search;
  }

  const params = new Proxy(new URLSearchParams(search), {
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

function getFilterNumber(qs_name) {
  const idx = DATASET_FILTERS.indexOf(qs_name);
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

function updateTitle() {
  var title_parts = [];

  // searchQuery = decodeParam(getQueryStringParam("q")); // Only binded to URL in /datasets page.
  if (search_input_query) {
    title_parts.push(search_input_query);
  }

  if (CURRENT_PAGE === "/datasets") {
    for (var i = 0; i < DATASET_FILTERS.length; i++) {
      let filter_key = DATASET_FILTERS[i];
      if (getQueryStringParam(filter_key)) {
        let filter_name = getFilterLabel(filter_key);
        let filter_value = getFilterValue(filter_key);
        title_parts.push(filter_name + ": " + filter_value);
      }
    }
  } else if (CURRENT_PAGE === "/reuses") {
    const filter_key = getQueryStringParam("topic");
    if (filter_key) {
      const filter_label = REUSE_FILTERS[filter_key];
      if (filter_label) {
        title_parts.push(filter_label);
      }
    }
  }

  const page = getQueryStringParam("page");
  if (page) {
    title_parts.push("Page " + page);
  }

  title_parts.push(BASE_TITLE);

  document.title = title_parts.join(" - ");
}

function getReuseFilters() {
  var key_to_label = {};
  const ul = document.querySelector(".fr-container ul.fr-tags-group");
  const rows = ul.querySelectorAll("li > a");
  for (var i = 0; i < rows.length; i++) {
    let href = rows[i].getAttribute("href");
    let label = rows[i].textContent.trim();
    let key = getQueryStringParam("topic", href);
    if (key) {
      key_to_label[key] = label;
    }
  }
  return key_to_label;
}

/**
 * Constats & variables
 */
const PAGES = ["/reuses", "/datasets", "/organizations"];
const CURRENT_PAGE = getCurrentPage();
const BASE_TITLE = CURRENT_PAGE ? getMetaTagValue("og:title") : null;
const REUSE_FILTERS = CURRENT_PAGE === "/reuses" ? getReuseFilters() : null;
const DATASET_FILTERS =
  CURRENT_PAGE === "/datasets"
    ? ["organization", "tag", "format", "license", "geozone", "granularity"]
    : null;

var SEARCH_INPUT = null; // To be loaded on DOM ready

var url_query_string = null; // This one is polled with an interval
var search_input_query = null; // "q" only exists in datasets page, therefore we need to bind the input

/**
 * Main method
 */
function startTitleUpdate() {
  SEARCH_INPUT = document.querySelector(
    ".fr-search-bar > input.fr-input[type=search]"
  );
  setInterval(function () {
    if (
      window.location.search !== url_query_string ||
      SEARCH_INPUT.value !== search_input_query
    ) {
      url_query_string = window.location.search;
      search_input_query = SEARCH_INPUT.value;
      updateTitle();
    }
  }, 500);
}

export default (function () {
  if (CURRENT_PAGE) {
    if (document.readyState === "complete") {
      startTitleUpdate();
    } else {
      window.addEventListener("DOMContentLoaded", () => {
        startTitleUpdate();
      });
    }
  }
})();
