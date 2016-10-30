FROM nginx
COPY static_server.conf /etc/nginx/conf.d/static_server.conf
RUN mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.orig
COPY dist /usr/share/nginx/html