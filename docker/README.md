
This image installs the projects, and builds assets too, *within the image, on build time (not just the container)*.  
This image might be used for all the master, worker and beat.  
This image uses requirements.pip to install the projects, except udata & udata-front, which are installed in editable mode as a consequence of the necessity of sharing the in-project *static* folder,
as we don't have a *nginx* nor use *udata collect*.
The image does **not** launch any database, geozone or site metadata initialization.

# Build image
  
`docker build -f .\Dockerfile -t udata-prod-local-img .`  
  
Former version required an arg mode to include the config within the image:  
`docker build --build-arg mode=local -f .\Dockerfile -t udata-prod-local-img .`  

# Run 
`docker run -v /path/to/udata.cfg:/srv/udata/udata.cfg -p 7000:7000 -p 7001:7001 -d --name udata-prod-local udata-prod-local-img COMMAND`  

Former version does not need the mount of udata.cfg
`docker run -p 7000:7000 -p 7001:7001 -d --name udata-prod-local udata-prod-local-img COMMAND`  
  
See entrypoint.sh for available commands
