from flask import current_app, request, url_for
from werkzeug.contrib.atom import AtomFeed

from udata.i18n import I18nBlueprint
from udata.models import Post
from udata.sitemap import sitemap
from udata.core.post.permissions import PostEditPermission
from udata_front import theme
from udata_front.views.base import ListView
from udata.core.post.models import Post
from udata.core.site.models import current_site
from udata_front.theme import render as render_template

blueprint = I18nBlueprint('posts', __name__, url_prefix='/posts')


class PostView(object):
    model = Post
    object_name = 'post'

    @property
    def _post(self):
        return self.get_object()


class ProtectedPostView(PostView):
    require = PostEditPermission()


@blueprint.route('/', endpoint='list')
class PostListView(ListView):
    model = Post
    template_name = 'post/list.html'
    context_name = 'posts'

    @property
    def default_page_size(self):
        return current_app.config['POST_DEFAULT_PAGINATION']

    def get_queryset(self):
        return Post.objects.published().paginate(self.page, self.page_size)


@blueprint.route('/<post:post>/')
def show(post):
    others = Post.objects(id__ne=post.id).published()
    older = others(published__lt=post.published).order_by('-published')
    newer = others(published__gt=post.published).order_by('published')
    return theme.render('post/display.html',
                        post=post,
                        previous_post=older.first(),
                        next_post=newer.first())



@blueprint.route('/recent.atom')
def recent_feed():
    feed = AtomFeed('Last posts',
                    feed_url=request.url, url=request.url_root)
    posts = (Post.objects.order_by('-created_at')
                .published().limit(current_site.feed_size))
    for post in posts:
        author = {
            'name': post.owner.fullname,
            'uri': url_for('users.show',
                            user=post.owner.id, _external=True),
        }
        feed.add(post.name,
                 render_template('post/feed_item.html', post=post),
                 content_type='html',
                 author=author,
                 url=url_for('posts.show',
                             post=post, _external=True),
                 updated=post.last_modified,
                 published=post.created_at)
    return feed.get_response()


@sitemap.register_generator
def sitemap_urls():
    yield 'posts.list_redirect', {}, None, "weekly", 0.6
    for post in Post.objects.published().only('id', 'slug'):
        yield 'posts.show_redirect', {'post': post}, None, "weekly", 0.6
