#!/bin/bash

set -e

docker-compose -p ha_amqp up -d

sleep 10s

rabbitmqctl='docker exec -it ha_amqp_rabbitmq2_1 rabbitmqctl'

bash -c "$rabbitmqctl stop_app"
bash -c "$rabbitmqctl join_cluster rabbit@rabbitmq1"
bash -c "$rabbitmqctl start_app"

sleep 2s

rabbitmqctl='docker exec -it ha_amqp_rabbitmq3_1 rabbitmqctl'

bash -c "$rabbitmqctl stop_app"
bash -c "$rabbitmqctl join_cluster rabbit@rabbitmq1"
bash -c "$rabbitmqctl start_app"

