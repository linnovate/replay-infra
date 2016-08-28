FROM node:4.5.0
RUN git clone https://github.com/linnovate/replay-infra.git
WORKDIR /replay-infra/consumer
RUN npm install
ENV RABBITMQ_HOST=rabbitmq-server MONGO_HOST=mongodb-server MONGO_PORT=27017 MONGO_DATABASE=replay_dev
RUN node index.js MetadataParser