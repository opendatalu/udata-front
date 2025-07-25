import logging
import re

import feedparser
import requests

from dateutil.parser import parse
from flask import g, current_app, url_for

from udata_front import theme
from udata.app import cache
from udata.models import Dataset
from udata_front.frontend import nav
from udata.i18n import lazy_gettext as _


log = logging.getLogger(__name__)

RE_POST_IMG = re.compile(
    r"""
    <img .*? (?:(?:
        src="(?P<src>https?://.+?)"
        |
        srcset="(?P<srcset>.+?)"
        |
        sizes="(?P<sizes>.+?)"
    )\s*)+ .*?/>
    """,
    re.I | re.X | re.S,
)

RE_STRIP_TAGS = re.compile(r"</?(img|br|p|div|ul|li|ol)[^<>]*?>", re.I | re.M)

# Add some html5 allowed attributes
EXTRA_ATTRIBUTES = ("srcset", "sizes")
feedparser.sanitizer._HTMLSanitizer.acceptable_attributes.update(set(EXTRA_ATTRIBUTES))

# Wordpress ATOM timeout
WP_TIMEOUT = 5

# Feed allowed enclosure type as thumbnails
FEED_THUMBNAIL_MIMES = ("image/jpeg", "image/png", "image/webp")


themelu_menu = nav.Bar(
    "themelu_menu",
    [
        nav.Item(_("Data"), "datasets.list"),
        nav.Item(_("Reuses"), "reuses.list"),
        nav.Item(_("Organizations"), "organizations.list"),
        nav.Item(
            _("Contribute"),
            None,
            items=[
                nav.Item(
                    _("Publish a dataset"), "admin.index", args={"path": "dataset/new"}
                ),
                nav.Item(
                    _("Publish a reuse"), "admin.index", args={"path": "reuse/new"}
                ),
            ],
        ),
        nav.Item(_("News"), "posts.list"),
        nav.Item(_("Contact us"), "themelu.contact_us"),
    ],
)

theme.menu(themelu_menu)

footer_opendata_links = [
    nav.Item(_("FAQ"), "themelu.show_page", args={"slug": "faq"}),
    nav.Item(
        _("Guide to the use of data"), "themelu.show_page", args={"slug": "usage"}
    ),
    nav.Item(
        _("Guidelines for the publication of open data"),
        "themelu.show_page",
        args={"slug": "publishing"},
    ),
    nav.Item(
        _("Request to reuse public data"),
        "themelu.show_page",
        args={"slug": "requesting"},
    ),
    nav.Item(_("Open data strategy"), "themelu.show_page", args={"slug": "strategy"}),
    nav.Item(_("Open data roadmap"), "themelu.show_page", args={"slug": "5yearplan"}),
    nav.Item(_("Project governance"), "themelu.show_page", args={"slug": "governance"}),
    nav.Item(_("Fact sheets"), "themelu.show_page", args={"slug": "fact-sheets/index"}),
]

nav.Bar("themelu_footer_opendata", footer_opendata_links)


themelu_footer_support = [
    nav.Item(_("API Tutorial"), "themelu.show_page", args={"slug": "api-tutorial"}),
    nav.Item(_("API Reference"), "themelu.docapi"),
    nav.Item(_("Contact us"), "themelu.contact_us"),
]

nav.Bar("themelu_footer_support", themelu_footer_support)


themelu_footer_links = [
    nav.Item(_("Terms"), "themelu.show_page", args={"slug": "legal/terms"}),
    nav.Item(_("Tracking and privacy"), "themelu.show_page", args={"slug": "legal/privacy"}),
    nav.Item(_("Accessibility"), "themelu.show_page", args={"slug": "legal/declaration"}),
    nav.Item(
        _("Sitemap"), "themelu.show_page", args={"slug": "plan-site"}
    ),
]

nav.Bar("themelu_footer_links", themelu_footer_links)


# themelu_footer_below_networks = [
#     nav.Item(_("Newsletter"), "themelu.show_page", args={"slug": "newsletter"}),
# ]
# nav.Bar("themelu_footer_below_networks", themelu_footer_below_networks)


NETWORK_LINKS = [
    ("Geoportail.lu", "http://www.geoportail.lu"),
    ("Data.Europa.eu", "http://www.data.europa.eu"),
    ("Gouvernement.lu", "http://www.gouvernement.lu"),
]

nav.Bar(
    "themelu_network", [nav.Item(label, label, url=url) for label, url in NETWORK_LINKS]
)


@cache.memoize(50)
def get_blog_post(lang):
    """
    Extract the latest post summary from an RSS or an Atom feed.

    Image is searched and extracted from (in order of priority):
      - mediarss `media:thumbnail` attribute
      - enclosures of image type (first match)
      - first image found in content
    Image size is ot taken in account but could in future improvements.
    """
    wp_atom_url = current_app.config.get("WP_ATOM_URL")
    if not wp_atom_url:
        return

    feed = None

    for code in lang, current_app.config["DEFAULT_LANGUAGE"]:
        feed_url = wp_atom_url.format(lang=code)
        try:
            response = requests.get(feed_url, timeout=WP_TIMEOUT)
        except requests.Timeout:
            log.error("Timeout while fetching %s", feed_url, exc_info=True)
            continue
        except requests.RequestException:
            log.error("Error while fetching %s", feed_url, exc_info=True)
            continue
        feed = feedparser.parse(response.content)

        if len(feed.entries) > 0:
            break

    if not feed or len(feed.entries) <= 0:
        return

    post = feed.entries[0]

    blogpost = {"title": post.title, "link": post.link, "date": parse(post.published)}
    description = post.get("description", None)
    content = post.get("content", [{}])[0].get("value") or description
    summary = post.get("summary", content)
    blogpost["summary"] = RE_STRIP_TAGS.sub("", summary).strip()

    for thumbnail in post.get("media_thumbnail", []):
        blogpost["image_url"] = thumbnail["url"]
        break

    if "image_url" not in blogpost:
        for enclosure in post.get("enclosures", []):
            if enclosure.get("type") in FEED_THUMBNAIL_MIMES:
                blogpost["image_url"] = enclosure["href"]
                break

    if "image_url" not in blogpost:
        match = RE_POST_IMG.search(content)
        if match:
            blogpost["image_url"] = match.group("src").replace("&amp;", "&")
            if match.group("srcset"):
                blogpost["srcset"] = match.group("srcset").replace("&amp;", "&")
            if match.group("sizes"):
                blogpost["sizes"] = match.group("sizes")

    return blogpost


@theme.context("home")
def home_context(context):
    context["blogpost"] = get_blog_post(g.lang_code)
    return context
