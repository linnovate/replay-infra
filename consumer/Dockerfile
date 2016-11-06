FROM node:4.5.0
RUN git clone https://github.com/linnovate/replay-infra.git
WORKDIR /replay-infra/consumer
RUN npm install
# Setup
ARG CONSUMER_TYPE 
RUN  mkdir -p /mnt/vod-capture-storage /mnt/vod-content-directory
# Set Environment variables
ENV RABBITMQ_HOST=rabbit-prod RABBITMQ_MAX_RESEND_ATTEMPTS=3 FAILED_JOBS_QUEUE_NAME=FailedJobsQueue RABBITMQ_MAX_UNACKED_MESSAGES=10
ENV RABBITMQ_USERNAME=guest RABBITMQ_PASSWORD=guest 
ENV MONGO_HOST=mongodb-prod MONGO_PORT=27017 MONGO_DATABASE=replay_dev
ENV CAPTURE_STORAGE_PATH=/mnt/vod-capture-storage STORAGE_PATH=/mnt/vod-content-directory
ENV NODE_ENV=development

CMD ["node", "index.js", $CONSUMER_TYPE]

