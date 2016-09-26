## Local installation
Install nginx from [here (Ubuntu PPA installation)].(https://www.nginx.com/resources/wiki/start/topics/tutorials/install/#ubuntu-ppa)

Make a symlink to the desired config file at /ops/nginx from /etc/opt/nginx/conf.d/:
```
ln -s ~/Desktop/replay-infra/ops/nginx/proxy.conf /etc/nginx/conf.d/
```

Now reload nginx:
```
nginx -s reload
``` 

## Docker
```
docker build -t nginx-replay .
docker run -d -p 80:80  --restart=always --name nginx-replay nginx-replay
```
