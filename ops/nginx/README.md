## Description
This folder contans Dockerfiles and configurations for nginx.  
Proxy is meant to serve solely as the main proxy entrypoint in the backend, which routes to all the microservices as well as the frontend, which is served with another nginx.  
Static server is just meant to serve the frontend.  

All requests via nginx passes through authentication-service.  
Therefore if you use nginx you must obtain yourself a valid JWT before accessing to the services (without the frontend, which obtains it for itself).  
At the moment you can interact directly with the backend services if you're not passing through nginx.  

## Setup
In order to run the nginx proxy, you must put an appropriate certificate and keys in /etc/nginx/ssl directory: cert.pem and privkey.pem.  

## Local installation
Install nginx from [here (Ubuntu PPA installation)](https://www.nginx.com/resources/wiki/start/topics/tutorials/install/#ubuntu-ppa).

Make a symlink to the desired config file at /ops/nginx from /etc/opt/nginx/conf.d/:
```
ln -s ~/Desktop/replay-infra/ops/nginx/proxy/proxy.localhost.conf /etc/nginx/conf.d/
```

Now reload nginx:
```
nginx -s reload
``` 


## Docker
For nginx proxy run:
```
docker build -t nginx-proxy .
docker run -d -p 443:443  --restart=always --name nginx-proxy nginx-proxy
```

For static server nginx, copy the updated dist folder of the frontend to the directory, and then run:
```
docker build -t nginx-static-server .
docker run -d -p 80:80  --restart=always --name nginx-static-server nginx-static-server
```