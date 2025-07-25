#!/bin/bash

echo "Launching entrypoint.sh with args: $@"

set -e

case $1 in
    uwsgi)
        echo "Running uWSGI"
        udata collect -ni /srv/public
        uwsgi --emperor /srv/uwsgi/
        ;;
    front)
        echo "Running front uWSGI"
        uwsgi /srv/uwsgi/front.ini
        ;;
    worker)
        echo "Running worker uWSGI"
        uwsgi /srv/uwsgi/worker.ini
        ;;
    beat)
        echo "Running beat uWSGI"
        uwsgi /srv/uwsgi/beat.ini
        ;;
    celery)
        echo "Running Celery"
        celery -A udata.worker "${@:2}"
        ;;
    bash)
        echo "Running bash"
        /bin/bash
        ;;
    background)
        echo "Running background"
        tail -f /dev/null
        ;;
    *)
        echo "Running udata"
        udata "$@"
        ;;
esac
