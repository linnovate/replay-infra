FROM nginx
COPY proxy.conf /etc/nginx/conf.d/proxy.conf
COPY vhosts.conf /etc/nginx/conf.d/vhosts.conf
COPY ssl /etc/nginx/ssl
RUN mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.orig
