#!/bin/sh

set -e
set -u

export CATALOG_BROKER_URL="amqp://guest@$RABBITMQ_PORT_5672_TCP_ADDR:$RABBITMQ_PORT_5672_TCP_PORT//"
export CATALOG_MONGODB_URL="mongodb://$MONGODB_PORT_27017_TCP_ADDR:$MONGODB_PORT_27017_TCP_PORT/"
export CATALOG_REDIS_URL="$REDIS_PORT_6379_TCP"

cd /frontend
if [ $# -gt 0 ]
then
    exec node $@
else
    exec node server.js
fi
