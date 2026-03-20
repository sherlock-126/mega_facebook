#!/bin/bash
# init-services.sh - Initialize services and run migrations

set -e

echo "=========================================="
echo "Initializing Mega Facebook Services"
echo "=========================================="

# Wait for database
echo "Waiting for PostgreSQL..."
until pg_isready -h postgres -U ${POSTGRES_USER:-mega} -d ${POSTGRES_DB:-mega_facebook}; do
    echo "PostgreSQL is unavailable - sleeping"
    sleep 2
done
echo "PostgreSQL is ready!"

# Wait for Redis
echo "Waiting for Redis..."
until redis-cli -h redis -a ${REDIS_PASSWORD} ping 2>/dev/null | grep -q PONG; do
    echo "Redis is unavailable - sleeping"
    sleep 2
done
echo "Redis is ready!"

# Wait for MinIO
echo "Waiting for MinIO..."
until curl -f http://minio:9000/minio/health/live >/dev/null 2>&1; do
    echo "MinIO is unavailable - sleeping"
    sleep 2
done
echo "MinIO is ready!"

# Wait for Elasticsearch
echo "Waiting for Elasticsearch..."
until curl -f -u elastic:${ELASTIC_PASSWORD} https://elasticsearch:9200/_cluster/health --insecure >/dev/null 2>&1; do
    echo "Elasticsearch is unavailable - sleeping"
    sleep 5
done
echo "Elasticsearch is ready!"

# Run database migrations
echo "Running database migrations..."
cd /app
npx prisma migrate deploy

echo "=========================================="
echo "All services initialized successfully!"
echo "=========================================="

# Execute the main command
exec "$@"