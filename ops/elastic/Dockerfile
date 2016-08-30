FROM elasticsearch
RUN mkdir -p /mount/backups/
COPY meta-snapshot_5.dat /mount/backups/
COPY snap-snapshot_5.dat /mount/backups/
#RUN echo 'path.repo: ["/mount/backups"]' >> /etc/elasticsearch/elasticsearch.yml
#RUN /etc/init.d/elasticsearch restart
