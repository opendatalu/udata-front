from typing import List

from flask_navigation.item import Item
from flask import Request

from udata_front.frontend import front


def get_current_endpoint(request: Request):
    return request.url_rule.endpoint.split('.')[:1] if request.url_rule else None


@front.app_template_global()
def is_current_endpoint(request: Request, item: Item) -> bool:
    current_endpoint = get_current_endpoint(request)
    # print(request.url_rule.endpoint) # themelu.show_page, # themelu.contact_us
    # print(item.endpoint) # themelu.show_page, themelu.contact_us
    if request.url_rule and request.url_rule.endpoint == "themelu.show_page":
        return False # We don't have any page in the menu for now, so no need to check how to do differentiate slugs
    if request.url_rule and request.url_rule.endpoint == "themelu.docapi":
        return False
    item_endpoint = item.endpoint and item.endpoint.split('.')[:1]
    return request.url_rule and \
        request.url_rule.endpoint != "site.home" and \
        (item_endpoint == current_endpoint)


@front.app_template_global()
def is_current_page(request: Request, item: Item) -> bool:
    return is_current_endpoint(request, item) and item.args == request.view_args


@front.app_template_global()
def is_parent_of_current_endpoint(request: Request, items: List[Item]) -> bool:
    return any(is_current_page(request, item) for item in items)
