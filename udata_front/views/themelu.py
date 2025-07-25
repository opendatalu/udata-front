from base64 import b64encode, b64decode
from typing import Optional

import dataclasses
import frontmatter
import logging
import requests
import mimetypes

from flask import url_for, redirect, abort, current_app, g, request, Response
from jinja2.exceptions import TemplateNotFound


from udata_front import theme
from udata.app import cache
from udata.frontend import template_hook
from udata.models import Reuse, Dataset
from udata.i18n import I18nBlueprint
from udata import mail

from udata_front import APIGOUVFR_EXTRAS_KEY

from udata.sitemap import sitemap

from udata_front.theme import render as render_template

from mongoengine.queryset.visitor import Q

log = logging.getLogger(__name__)

blueprint = I18nBlueprint(
    "themelu",
    __name__,
    template_folder="../templates",
    static_folder="../static",
    static_url_path="/static/themelu",
)

PAGE_CACHE_DURATION = 60 * 5  # in seconds


@blueprint.route("/dataset/<dataset>/")
def redirect_datasets(dataset):
    """Route Legacy CKAN datasets"""
    return redirect(url_for("datasets.show", dataset=dataset))


@blueprint.route("/organization/")
def redirect_organizations_list():
    """Route legacy CKAN organizations listing"""
    return redirect(url_for("organizations.list"))


@blueprint.route("/organization/<org>/")
def redirect_organizations(org):
    """Route legacy CKAN organizations"""
    return redirect(url_for("organizations.show", org=org))


@blueprint.route("/group/<topic>/")
def redirect_topics(topic):
    """Route legacy CKAN topics"""
    return redirect(url_for("topics.display", topic=topic))


# @blueprint.route('/catalog.rdf')
# def catalog_rdf():
#     return redirect('/api/v1/site/catalog.rdf')


def get_pages_gh_urls(slug, locale: str = None):
    repo = current_app.config.get("PAGES_GH_REPO_NAME")
    if not repo:
        abort(404)
    branch = current_app.config.get("PAGES_REPO_BRANCH", "master")
    if locale:
        raw_url = (
            f"https://raw.githubusercontent.com/{repo}/{branch}/pages/{locale}/{slug}"
        )
        gh_url = f"https://github.com/{repo}/blob/{branch}/pages/{locale}/{slug}"
    else:
        raw_url = f"https://raw.githubusercontent.com/{repo}/{branch}/pages/{slug}"
        gh_url = f"https://github.com/{repo}/blob/{branch}/pages/{slug}"
    return raw_url, gh_url


def detect_pages_extension(raw_url):
    if requests.head(f"{raw_url}.md").status_code == 200:
        return "md"
    return "html"


def get_page_content(slug):
    content = None
    for locale in [g.lang_code, None]:
        content, gh_url, extension = get_page_content_locale(slug, locale)
        if content:
            break
    else:  # no cached version or no content from gh
        log.error(f"No content found inc. from cache for page {slug}")
        abort(404)
    return content, gh_url, extension


def get_image_content(slug) -> Optional[bytes]:
    content = None
    for locale in [g.lang_code, None]:
        content = get_image_content_locale(slug, locale)
        if content:
            break
    else:  # no cached version or no content from gh
        log.error(f"No content found inc. from cache for image {slug}")
        abort(404)
    return content


@cache.memoize(PAGE_CACHE_DURATION)
def get_image_content_locale(slug: str, locale: str) -> Optional[bytes]:
    """
    Gets an image from the GH repo.
    Caches if found.
    """
    cache_key = "pages-images-{slug}-{locale}".format(
        slug=slug, locale="default" if locale is None else locale
    )
    content = cache.get(cache_key)
    if content:
        return b64decode(content)
    raw_url, _ = get_pages_gh_urls(slug, locale=locale)
    try:
        response = requests.get(raw_url, timeout=5)
        if response.status_code == 404:
            log.error(f"Timeout while getting {slug} image from gh: {e}")
            return None
        response.raise_for_status()
        cache.set(cache_key, b64encode(response.content))
        return response.content
    except requests.exceptions.RequestException as e:
        log.exception(f"Error while getting {slug} image from gh: {e}")
        return None


@cache.memoize(PAGE_CACHE_DURATION)
def get_page_content_locale(slug, locale):
    """
    Get a page content from gh repo (md).
    This has a double layer of cache:
    - @cache.cached decorator w/ short lived cache for normal operations
    - a long terme cache w/o timeout to be able to always render some content
    """
    cache_key = "pages-content-{slug}-{locale}".format(
        slug=slug, locale="default" if locale is None else locale
    )
    raw_url, gh_url = get_pages_gh_urls(slug, locale=locale)
    try:
        extension = detect_pages_extension(raw_url)

        raw_url = f"{raw_url}.{extension}"
        gh_url = f"{gh_url}.{extension}"

        response = requests.get(raw_url, timeout=5)
        # do not cache 404 and forward status code
        if response.status_code == 404:
            return None, gh_url, extension
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        log.exception(f"Error while getting {slug} page from gh: {e}")
        content = cache.get(cache_key)
    else:
        content = response.text
        cache.set(cache_key, content)
    return content, gh_url, extension


def get_objects_for_page(
    model, tags: list = [], ids_or_slugs: list = [], topics: list = [], page: int = 1
):
    filters = Q(tags__in=tags)
    if len(ids_or_slugs) > 0:
        filters = filters | Q(slug__in=ids_or_slugs) | Q(id__in=ids_or_slugs)
    if len(topics) > 0:
        filters = filters | Q(topic__in=topics)
    results = (
        getattr(model, "objects").visible().filter(filters).order_by("-created_at")
    )

    total_datasets = results.count()
    datasets = results.paginate(page, 10)
    return total_datasets, datasets


@blueprint.route("/pages/<path:slug>")
def show_page(slug):

    if slug.endswith("/"):
        slug = slug[:-1]  # remove trailing slash

    content, gh_url, extension = get_page_content(slug)
    page = frontmatter.loads(content)

    models = {"reuses": Reuse, "datasets": Dataset}
    data = {"reuses": [], "datasets": []}

    for model_key, model in models.items():
        page_num = request.args.get("%s_page" % model_key, 1, type=int)
        tags = []
        topics = []
        ids_or_slugs = []
        for r in page.get(model_key) or []:
            if r is None:
                continue
            r = r.strip()
            if r[:4] == "tag#":
                tags.append(r[4:])
            elif r[:6] == "topic#":
                topics.append(r[6:])
            else:
                ids_or_slugs.append(r)

        # Formerly we could use directly "datasets"/"reuses" instead of appending "_limited",
        # But after updates, the pagination is broken because there is some post processing and
        # conflict somewhere. I'm not looking for that to see how to make the pagination compatible,
        # I will just separate it.
        data["total_%s" % model_key], data["%s_limited" % model_key] = get_objects_for_page(
            model, tags=tags, ids_or_slugs=ids_or_slugs, topics=topics, page=page_num
        )


    return theme.render(
        "page.html", page=page, gh_url=gh_url, extension=extension, **data
    )


@blueprint.route("/pages/<gh_image:image>")
def show_image(image: str):
    mime_type, _ = mimetypes.guess_type(image)

    if mime_type is None:
        return "Invalid image format", 400

    image_data: bytes = get_image_content(image)

    if image_data is None:
        return "Image not found", 404

    return Response(image_data, content_type=mime_type)


@blueprint.route("/suivi/")
def suivi():
    try:
        return theme.render("suivi.html")
    except TemplateNotFound:
        abort(404)


def has_apis(ctx):
    dataset = ctx["dataset"]
    return dataset.extras.get(APIGOUVFR_EXTRAS_KEY, [])


@template_hook("dataset.display.after-files", when=has_apis)
def dataset_apis(ctx):
    dataset = ctx["dataset"]
    return theme.render(
        "dataset-apis.html", apis=dataset.extras.get(APIGOUVFR_EXTRAS_KEY)
    )


@template_hook("oauth_authorize_theme_content")
def oauth_authorize_theme_content(ctx):
    grant = ctx["grant"]
    return theme.render("api/oauth_authorize.html", grant=grant)


@template_hook("oauth_error_theme_content")
def oauth_error_theme_content(ctx):
    request = ctx["request"]
    return theme.render("api/oauth_error.html", error=request.args.get("error"))


@blueprint.route("/docapi/")
def docapi():
    swagger_api_domain = current_app.config.get("SERVER_NAME", "")
    return theme.render(
        "luxembourg/api.html",
        swagger_api_domain=swagger_api_domain if swagger_api_domain else "",
    )


@sitemap.register_generator
def site_sitemap_urls():
    yield "themelu.show_page", {"slug": "faq"}, None, "weekly", 1
    for page in [
        "usage",
        "publishing",
        "requesting",
        "strategy",
        "5yearplan",
        "governance",
        "indicators-quality",
    ]:
        yield "themelu.show_page", {"slug": page}, None, "monthly", 0.2


from typing import Literal


@dataclasses.dataclass
class ContactForm:
    civilite: Literal["mr", "ms"]
    subject: str
    first_name: str
    family_name: str
    name: str
    email: str
    message: str
    phone: str = ""


@blueprint.route("/contact-us/", methods=["GET", "POST"])
def contact_us():
    # TODO: configurable recipient from udata.cfg

    mcaptcha_url = current_app.config.get("MCAPTCHA_URL")
    mcaptcha_site_key = current_app.config.get("MCAPTCHA_SITE_KEY")
    mcaptcha_backend_url = current_app.config.get(
        "MCAPTCHA_BACKEND_URL", mcaptcha_url
    )  # Differentiated from mcaptcha_url because requests from the container need host.docker.internal
    result: Optional[
        Literal["ok", "captcha_error", "email_error", "captcha_service_error"]
    ] = None

    # On form post only
    if request.method == "POST":

        captcha_ok: bool = True

        # Start mCaptcha verification
        if mcaptcha_backend_url and mcaptcha_site_key:

            mcaptcha_token = request.form.get("mcaptcha__token")

            mcaptcha_secret_key = current_app.config.get("MCAPTCHA_SECRET_KEY")
            if not mcaptcha_secret_key:
                raise ValueError("Missing MCAPTCHA_SECRET_KEY in configuration")

            if not mcaptcha_token:
                abort(400, "Missing mCaptcha token")

            payload = {
                "token": mcaptcha_token,
                "key": mcaptcha_site_key,
                "secret": mcaptcha_secret_key,
            }
            resp = requests.post(
                f"{mcaptcha_backend_url}/api/v1/pow/siteverify", json=payload
            )
            resp = resp.json()

            try:
                if resp["valid"] == False:
                    result = "captcha_error"
                    captcha_ok = False
            except KeyError as e:
                result = "captcha_service_error"
                captcha_ok = False
                log.exception(f"Error while verifying mCaptcha: {e}")
                log.error(f"response: {resp}")

        if captcha_ok:
            try:
                contact_form = ContactForm(
                    civilite=request.form.get("civilite"),
                    first_name=request.form.get("first_name"),
                    family_name=request.form.get("family_name"),
                    name=request.form.get("name"),
                    email=request.form.get("email"),
                    message=request.form.get("message"),
                    phone=request.form.get("phone"),
                    subject=request.form.get("subject"),
                )
                mail.send(
                    contact_form.subject,
                    ["info@data.public.lu"],
                    "contact_form",
                    render_fn=render_template,
                    contact=contact_form,
                    reply_to=contact_form.email,
                )
                result = "ok"
            except Exception as e:
                result = "email_error"
                log.exception(f"Error while sending email: {e}")

    return theme.render(
        "luxembourg/contact_us.html",
        mcaptcha_url=mcaptcha_url,
        mcaptcha_site_key=mcaptcha_site_key,
        result=result,
    )
