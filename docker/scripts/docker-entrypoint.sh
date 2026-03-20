#!/bin/bash
# docker-entrypoint.sh - API container entrypoint with automatic migrations
set -e

echo "=========================================="
echo "Starting Mega Facebook API"
echo "=========================================="

# Function to wait for database
wait_for_db() {
    echo "Waiting for PostgreSQL to be ready..."
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if pg_isready -h "${DATABASE_HOST:-postgres}" -p "${DATABASE_PORT:-5432}" -U "${DATABASE_USER:-mega}" >/dev/null 2>&1; then
            echo "PostgreSQL is ready!"
            return 0
        fi

        echo "Attempt $attempt/$max_attempts: PostgreSQL is unavailable - sleeping"
        sleep 2
        attempt=$((attempt + 1))
    done

    echo "ERROR: PostgreSQL failed to become ready after $max_attempts attempts"
    return 1
}

# Function to run migrations
run_migrations() {
    echo "Checking for pending migrations..."

    # First, ensure Prisma client is generated
    if [ ! -d "node_modules/.prisma" ]; then
        echo "Generating Prisma client..."
        npx prisma generate
    fi

    # Run migrations
    echo "Running database migrations..."
    if npx prisma migrate deploy; then
        echo "Migrations completed successfully!"
    else
        echo "ERROR: Migration failed!"
        return 1
    fi
}

# Function to run seeding
run_seeding() {
    if [ "${SEED_ON_START}" = "true" ] || [ "${SEED_ON_START}" = "1" ]; then
        echo "Running database seeding..."

        # Determine seed level
        local seed_args=""
        if [ "${SEED_ADMIN_ONLY}" = "true" ]; then
            seed_args="--admin-only"
        elif [ "${SEED_FULL}" = "true" ]; then
            seed_args="--full"
        fi

        if npm run seed -- $seed_args; then
            echo "Seeding completed successfully!"
        else
            echo "WARNING: Seeding failed, but continuing..."
        fi
    else
        echo "Skipping database seeding (SEED_ON_START not set)"
    fi
}

# Main execution
main() {
    # Only run migrations if we're in a containerized environment
    if [ "${RUN_MIGRATIONS}" != "false" ]; then
        # Wait for database
        if ! wait_for_db; then
            exit 1
        fi

        # Run migrations
        if ! run_migrations; then
            exit 1
        fi

        # Run seeding if requested
        run_seeding
    else
        echo "Skipping migrations (RUN_MIGRATIONS=false)"
    fi

    echo "=========================================="
    echo "Starting application..."
    echo "=========================================="

    # Execute the main command (passed as arguments to this script)
    exec "$@"
}

# Run main function
main "$@"