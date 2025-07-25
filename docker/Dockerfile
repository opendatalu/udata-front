###############################################################
# Stage 1 : common system deps
###############################################################

# Fork of FROM udata/system:py3.11
FROM harbor.geoportail.lu/registry/udata/system:py3.11 AS common

# OCI annotations
# See: https://github.com/opencontainers/image-spec/blob/master/annotations.md
LABEL "org.opencontainers.image.title"="Luxembourg Udata deployment image"
LABEL "org.opencontainers.image.description"="Luxembourg udata services deployment, without dbs"
LABEL "org.opencontainers.image.authors"="ACT Digital, Opendata Team"
LABEL "org.opencontainers.image.sources"="https://github.com/opendatateam/docker-udata"
# LABEL "org.opencontainers.image.revision"=$REVISION
# LABEL "org.opencontainers.image.created"=$CREATED

# Set proxies for the build in Gitlab CI
ENV http_proxy http://proxy.geo.etat.lu:3128
ENV https_proxy http://proxy.geo.etat.lu:3128
ENV no_proxy fme.geoportail.lu,login.intranet.etat.lu

# Install system dependencies
RUN sed -i 's|http://deb.debian.org|http://archive.debian.org|g' /etc/apt/sources.list \
    && sed -i '/security.debian.org/d' /etc/apt/sources.list \
    && apt-get update && apt-get install -y --no-install-recommends \
    # uWSGI rooting features
    libpcre3-dev \
    # Clean up
    && apt-get autoremove\
    && apt-get clean\
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# This is for debugging purposes
RUN apt-get update && apt-get install -y --no-install-recommends vim

# Install nvm & npm
ENV NVM_DIR /root/.nvm
RUN apt-get update && apt-get install --no-install-recommends -y curl unzip
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash
RUN . $NVM_DIR/nvm.sh && nvm --version

# Upgrade pip
RUN pip install --upgrade pip

# Install common Python dependencies
COPY requirements.pip /tmp/requirements.pip
RUN pip install -r /tmp/requirements.pip && pip check || pip install -r /tmp/requirements.pip

# Make dir for projects
RUN mkdir -p /srv



###############################################################
# Stage 2 : cloning of the projects & install of pip reqs
###############################################################

FROM common AS cloner

ARG branch=main 

WORKDIR /srv

# invalidate cache... sadly it's so intertwined that we don't cache these separately
ARG udata_sha=master
ARG udata_front_sha=main
ARG flask_storage_sha=main
RUN echo "Using udata_sha ${udata_sha}"
RUN echo "Using udata_front_sha ${udata_front_sha}"
RUN echo "Using flask_storage_sha ${flask_storage_sha}"

# Clone the projects
RUN git clone --depth 1 https://HIDDEN-SECRETS@gitlab.geoportail.lu/cadastre/udata.git 
RUN git clone --depth 1 --single-branch --branch ${branch} https://HIDDEN-SECRETS@gitlab.geoportail.lu/cadastre/udata-front.git  
RUN git clone --depth 1 https://HIDDEN-SECRETS@gitlab.geoportail.lu/cadastre/flask-storage.git

RUN cd udata && git checkout ${udata_sha}
RUN cd udata-front && git checkout ${udata_front_sha} 
RUN cd flask-storage && git checkout ${flask_storage_sha}

RUN cd udata && pip install -e . 
RUN cd udata-front && pip install -e . 

# Install plugins. We need to install plugins AFTER we installed udata & udata-front so the
# correct versions of the plug-ins are chosen, even if some of these will still spoil our forks.
COPY plugins.pip /tmp/plugins.pip
RUN pip install -r /tmp/plugins.pip && pip check || pip install -r /tmp/plugins.pip

# As the plugins (eg. udata-ckan) are basically overwriting the udata version with 
# the upstream so we need to reinstall our forks.
RUN pip uninstall -y udata
RUN cd udata && pip install -e .
RUN pip show udata | grep "Summary: udata fork" || (echo "cadastre udata not installed" && exit 1)

RUN pip uninstall -y udata-front
RUN cd udata-front && pip install -e .

RUN pip uninstall -y flask-storage
RUN cd flask-storage && pip install -e .


###############################################################
# Stage 3 : preparation of node modules for udata
###############################################################
FROM common AS udata_node_modules
COPY --from=cloner /root/.nvm /root/.nvm
COPY --from=cloner /srv/udata/package.json /tmp/
COPY --from=cloner /srv/udata/.nvmrc /tmp/
RUN cat /tmp/.nvmrc
RUN . $NVM_DIR/nvm.sh && cd /tmp && nvm install
RUN . $NVM_DIR/nvm.sh && cd /tmp && nvm use && npm install


###############################################################
# Stage 4 : preparation of node modules for udata front
###############################################################
FROM common AS udata_front_node_modules
COPY --from=cloner /root/.nvm /root/.nvm
COPY --from=cloner /srv/udata-front/package.json /tmp/
COPY --from=cloner /srv/udata-front/.nvmrc /tmp/
RUN cat /tmp/.nvmrc
RUN . $NVM_DIR/nvm.sh && cd /tmp && nvm install
RUN . $NVM_DIR/nvm.sh && cd /tmp && nvm use && npm install


###############################################################
# Stage 5: final image
###############################################################

FROM cloner AS final

WORKDIR /srv

# Copy back the node_modules
COPY --from=udata_node_modules /tmp/node_modules /srv/udata/node_modules
COPY --from=udata_front_node_modules /tmp/node_modules /srv/udata-front/node_modules

# Copy as well the NPM version used in udata front, as we transpile here the stuff ...
# TODO: cherry pick from the project whatever is used for transpilation and separate in cached stages...
COPY --from=udata_front_node_modules $NVM_DIR $NVM_DIR

# Transpile the assets (udata)
RUN . $NVM_DIR/nvm.sh && cd /srv/udata && npm run assets:build
RUN . $NVM_DIR/nvm.sh && cd /srv/udata && npm run widgets:build
RUN . $NVM_DIR/nvm.sh && cd /srv/udata && npm run oembed:build

# Transpile the assets (udata-front)
RUN . $NVM_DIR/nvm.sh && cd /srv/udata-front && nvm use && npx vite build --config vite.config.ts

# Compile the translations
RUN cd /srv/udata && inv i18nc
RUN cd /srv/udata-front && inv i18nc

# Collect the static files into the public directory for them to be served by uwsgi
RUN cd /srv/udata && udata collect -ni /srv/public

# Copy configuration and launch scripts
# COPY config/udata.${mode}.cfg /srv/udata/udata.cfg
# Instead mount that file on image run (-v /path/to/udata.cfg:/srv/udata/udata.cfg)

# Copy entrypoint + uwsgi configuration
COPY entrypoint.sh /srv/
COPY uwsgi/*.ini /srv/uwsgi/

# Make executable the entrypoint
RUN chmod +x /srv/entrypoint.sh

# Workdir for the udata process
WORKDIR /srv

# Specify explicitly the path of udata.cfg
ENV UDATA_SETTINGS /srv/udata/udata.cfg

# Remove proxies
ENV http_proxy ""
ENV https_proxy ""
ENV no_proxy ""

# Remove cache to ligthen the image
RUN rm -rf /root/.cache

# Expose the uWSGI ports
EXPOSE 7000 7001

# Healthcheck
HEALTHCHECK --interval=5s --timeout=3s CMD curl --fail http://localhost:7000/ || exit 1

# Entrypoint script
ENTRYPOINT ["/srv/entrypoint.sh"]

# This is the default command passed to the ENTRYPOINT
CMD ["uwsgi"]
