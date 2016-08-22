FROM ubuntu:14.04
RUN apt-get -y update && apt-get install -y xz-utils wget git-core
RUN cd /opt
RUN wget https://nodejs.org/dist/v4.4.7/node-v4.4.7-linux-x64.tar.xz
RUN tar -C /usr/local --strip-components 1 -xJf node-v4.4.7-linux-x64.tar.xz
RUN npm install -g npm
RUN git clone https://github.com/linnovate/replay-infra.git
RUN cd replay-infra/video-recorder
RUN npm install
