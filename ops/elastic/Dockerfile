FROM elasticsearch
RUN mkdir -p /mount/backups/
COPY meta-qqq.dat /mount/backups/
COPY snap-qqq.dat /mount/backups/
RUN echo 'path.repo: ["/mount/backups"]' >> /etc/elasticsearch/elasticsearch.yml
RUN /etc/init.d/elasticsearch restart
