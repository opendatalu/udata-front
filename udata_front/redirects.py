from udata.app import Blueprint
from flask import redirect

# Registration in ./frontend/__init__.py init_app
blueprint_root_redirects = Blueprint("/", __name__)


@blueprint_root_redirects.route("/catalog.rdf")
def catalog_rdf():
    return redirect("/api/1/site/catalog.rdf")
