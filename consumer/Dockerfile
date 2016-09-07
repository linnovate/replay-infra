FROM node:4.5.0
RUN git clone https://github.com/linnovate/replay-infra.git
WORKDIR /replay-infra/consumer
RUN npm install
ENV RABBITMQ_HOST=rabbit-prod MONGO_HOST=mongodb-prod MONGO_PORT=27017 MONGO_DATABASE=replay_dev
ENV ELASTIC_HOST=elastic DROP_FOLDER_PATH=/drop STORAGE_FOLDER_PATH=/storage