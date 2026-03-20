#!/bin/bash
# run-migrations.sh - Standalone migration runner for init containers
set -e

echo "=========================================="
echo "Migration Runner for Mega Facebook"
echo "=========================================="

# Configuration with defaults
DATABASE_HOST="${DATABASE_HOST:-postgres}"
DATABASE_PORT="${DATABASE_PORT:-5432}"
DATABASE_USER="${DATABASE_USER:-mega}"
DATABASE_NAME="${DATABASE_NAME:-mega_facebook}"
MAX_RETRIES="${MAX_RETRIES:-30}"
RETRY_INTERVAL="${RETRY_INTERVAL:-2}"

# Function to test database connection
test_connection() {
    PGPASSWORD="${DATABASE_PASSWORD}" psql \
        -h "$DATABASE_HOST" \
        -p "$DATABASE_PORT" \
        -U "$DATABASE_USER" \
        -d "$DATABASE_NAME" \
        -c "SELECT 1" \
        >/dev/null 2>&1
}

# Function to wait for database with exponential backoff
wait_for_database() {
    echo "Waiting for database to be ready..."
    local attempt=1
    local delay=$RETRY_INTERVAL

    while [ $attempt -le $MAX_RETRIES ]; do
        if test_connection; then
            echo "✓ Database connection established!"
            return 0
        fi

        echo "  Attempt $attempt/$MAX_RETRIES: Database unavailable, waiting ${delay}s..."
        sleep $delay

        # Exponential backoff with max delay of 30s
        if [ $delay -lt 30 ]; then
            delay=$((delay * 2))
        fi

        attempt=$((attempt + 1))
    done

    echo "✗ ERROR: Could not connect to database after $MAX_RETRIES attempts"
    return 1
}

# Function to check if migrations are needed
check_migrations() {
    echo "Checking migration status..."

    # Generate Prisma client if needed
    if [ ! -d "node_modules/.prisma" ]; then
        echo "  Generating Prisma client..."
        npx prisma generate
    fi

    # Check if migrations are up to date
    local status=$(npx prisma migrate status 2>&1 || true)

    if echo "$status" | grep -q "Database schema is up to date"; then
        echo "✓ Database schema is already up to date"
        return 1
    else
        echo "  Pending migrations detected"
        return 0
    fi
}

# Function to run migrations with detailed output
run_migrations() {
    echo "Applying database migrations..."

    if npx prisma migrate deploy --schema=/app/prisma/schema.prisma; then
        echo "✓ Migrations applied successfully!"

        # Log migration history
        echo "Current migration status:"
        npx prisma migrate status || true

        return 0
    else
        echo "✗ ERROR: Migration failed!"
        echo "Please check the logs above for details"
        return 1
    fi
}

# Function to run admin seeding for production
seed_admin() {
    if [ "${SEED_ADMIN}" = "true" ] || [ "${CREATE_ADMIN}" = "true" ]; then
        echo "Creating admin account..."

        if npm run seed -- --admin-only; then
            echo "✓ Admin account created successfully"
        else
            echo "⚠ WARNING: Admin account creation failed or already exists"
        fi
    fi
}

# Main execution
main() {
    echo "Environment:"
    echo "  DATABASE_HOST: $DATABASE_HOST"
    echo "  DATABASE_PORT: $DATABASE_PORT"
    echo "  DATABASE_USER: $DATABASE_USER"
    echo "  DATABASE_NAME: $DATABASE_NAME"
    echo ""

    # Step 1: Wait for database
    if ! wait_for_database; then
        exit 1
    fi

    # Step 2: Check if migrations are needed
    if check_migrations; then
        # Step 3: Run migrations
        if ! run_migrations; then
            exit 1
        fi
    fi

    # Step 4: Optionally create admin account
    seed_admin

    echo ""
    echo "=========================================="
    echo "✓ Migration runner completed successfully!"
    echo "=========================================="

    exit 0
}

# Handle signals gracefully
trap 'echo "Received signal, exiting..."; exit 1' SIGTERM SIGINT

# Run main function
main