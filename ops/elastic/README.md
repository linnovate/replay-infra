docker run -p 9200:9200 --restart=always --name elastic-prod -d elastic-prod -Des.path.repo=/mount/backups


curl -XPUT 'http://localhost:9200/_snapshot/snap' -d '{
    "type": "fs",
    "settings": {
        "location": "/mount/backups",
        "compress": true
    }
}'

Optional list backups
 curl -XGET 'http://localhost:9200/_snapshot/snap/_all'


curl -XPOST 'http://localhost:9200/_snapshot/snap/snapshot_5/_restore'