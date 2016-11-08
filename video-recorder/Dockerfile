FROM node:4.5.0
RUN echo 'test'
RUN apt-get -y update && apt-get install -y xz-utils wget git-core
WORKDIR /opt
RUN wget https://nodejs.org/dist/v4.4.7/node-v4.4.7-linux-x64.tar.xz
RUN tar -C /usr/local --strip-components 1 -xJf node-v4.4.7-linux-x64.tar.xz
RUN npm install -g npm
RUN git clone https://github.com/linnovate/replay-infra.git
WORKDIR replay-infra/video-recorder
RUN git checkout develop
RUN npm install
RUN mkdir -p /opt/output-test

ARG HOST_IP
ENV MONGO_HOST=$HOST_IP
ENV MONGO_PORT=27017
ENV MONGO_DATABASE=replay_dev
ENV RABBITMQ_HOST=$HOST_IP
ENV INDEX=100
ENV DURATION=10
ENV INTERVAL_TIME=5000
ENV STORAGE_PATH=/opt/output-test
ENV NODE_ENV=development
CMD [ "node", "index.js" ]
