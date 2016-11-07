## Description
The cron job purpose is to check the missions and update their videos according to the mission details.

## Installation
```

Clone the repo and install dependencies:
```
npm install
```

## Configurations
Set environment variables to config the app:

| Name              | Description                  | Default    |
|-------------------|------------------------------|------------|
| MONGO_HOST        | Mongo host URI               | localhost  |
| MONGO_PORT        | Mongo port                   | 27017      |
| MONGO_DATABASE    | Mongo database name          | replay_dev |
| SET_AUTH_INTERVAL | cron job interval in minutes | 1          |


## Usage
Run with:
```
node set-video-authorization.js 
