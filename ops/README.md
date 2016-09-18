## Docker
```
docker build -t nginx-replay .
docker run -d -p 80:80  --restart=always --name nginx-replay nginx-replay
```
