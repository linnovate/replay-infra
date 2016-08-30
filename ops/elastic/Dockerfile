FROM elasticsearch
RUN mkdir -p /mount/backups/
COPY snapshots /mount/backups/
COPY snapshots /morununt/backups/
RUN chown -R elasticsearch /mount
#RUN echo 'path.repo: ["/mount/backups"]' >> /etc/elasticsearch/elasticsearch.yml
#RUN /etc/init.d/elasticsearch restart
