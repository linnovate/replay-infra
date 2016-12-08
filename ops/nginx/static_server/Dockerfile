FROM nginx
CMD ["ls","/etc/nginx/conf.d"]
CMD ["rm","/etc/nginx/conf.d/default.conf"]
COPY static_server.conf /etc/nginx/conf.d/static_server.conf
