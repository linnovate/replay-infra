FROM nginx
RUN rm /etc/nginx/conf.d/default.conf
COPY static_server.conf /etc/nginx/conf.d/static_server.conf
COPY dist/ /usr/share/nginx/html/
