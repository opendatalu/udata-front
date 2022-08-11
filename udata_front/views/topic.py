from flask import g, request

from udata.i18n import I18nBlueprint
from udata.models import Topic
from udata.sitemap import sitemap
from udata.utils import multi_to_dict
from udata_front import theme


blueprint = I18nBlueprint("topics", __name__, url_prefix="/topics")


@blueprint.route("/<topic:topic>/")
def display(topic):

    return theme.render(
        "topic/display.html",
        topic=topic,
        datasets=[],
    )


@blueprint.route("/<topic:topic>/datasets")
def datasets(topic):
    # https://www.data.gouv.fr/fr/topics/elections-legislatives-des-12-et-19-juin-2022-resultats-definitifs-du-second-tour/datasets -> 301 instead of not found (not code)
    # https://www.data.gouv.fr/fr/datasets/elections-legislatives-des-12-et-19-juin-2022-resultats-definitifs-du-second-tour/
    kwargs = multi_to_dict(request.args)
    kwargs.pop("topic", None)

    return theme.render("topic/datasets.html", topic=topic, datasets=[])


@blueprint.route("/<topic:topic>/reuses")
def reuses(topic):
    kwargs = multi_to_dict(request.args)
    kwargs.pop("topic", None)

    return theme.render("topic/reuses.html", topic=topic, reuses=[])


@blueprint.before_app_request
def store_featured_topics():
    g.featured_topics = sorted(Topic.objects(featured=True), key=lambda t: t.slug)


@sitemap.register_generator
def sitemap_urls():
    # Topics are deprecated
    # for topic in Topic.objects.only('id', 'slug'):
    #     yield 'topics.display_redirect', {'topic': topic}, None, "weekly", 0.8
    slugs = [
        "geospatial",
        "earth-observation-environment",
        "meteo",
        "statistics",
        "mobility",
        "affaires-internationales",
        "agriculture",
        "droit",
        "economie",
        "energie",
        "environnement",
        "gouvernement-et-secteur-public",
        "population-et-societe",
        "regions-et-developpement-local",
        "sante",
        "science-et-technologie",
        "transport",
        "transport-idacs",
        "transport-chargin-poits-points-de-charge",
        "vie-quotidienne",
    ]
    for slug in slugs:
        yield "gouvfr.show_page", {"slug": "topics/%s" % slug}, None, "weekly", 0.8
