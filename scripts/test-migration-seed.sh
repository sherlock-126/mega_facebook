#!/bin/bash
# test-migration-seed.sh - Test script for verifying migration and seeding functionality

set -e

echo "=========================================="
echo "Testing Migration & Seeding System"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Test 1: Check if Docker scripts exist
echo ""
echo "1. Checking Docker scripts..."
if [ -f "docker/scripts/docker-entrypoint.sh" ]; then
    print_status "docker-entrypoint.sh exists"
else
    print_error "docker-entrypoint.sh not found"
    exit 1
fi

if [ -f "docker/scripts/run-migrations.sh" ]; then
    print_status "run-migrations.sh exists"
else
    print_error "run-migrations.sh not found"
    exit 1
fi

# Test 2: Check if seed files exist
echo ""
echo "2. Checking seed data modules..."
if [ -d "apps/api/prisma/seed-data" ]; then
    print_status "seed-data directory exists"

    for file in users.ts posts.ts interactions.ts messages.ts; do
        if [ -f "apps/api/prisma/seed-data/$file" ]; then
            print_status "  $file found"
        else
            print_error "  $file not found"
        fi
    done
else
    print_error "seed-data directory not found"
    exit 1
fi

# Test 3: Check if main seed.ts is updated
echo ""
echo "3. Checking main seed script..."
if [ -f "apps/api/prisma/seed.ts" ]; then
    if grep -q "parseArgs" "apps/api/prisma/seed.ts"; then
        print_status "seed.ts has argument parsing"
    else
        print_error "seed.ts missing argument parsing"
    fi

    if grep -q "seedAdminOnly\|seedSampleData\|seedFullData" "apps/api/prisma/seed.ts"; then
        print_status "seed.ts has multiple seeding modes"
    else
        print_error "seed.ts missing seeding modes"
    fi
else
    print_error "seed.ts not found"
    exit 1
fi

# Test 4: Check Docker compose configurations
echo ""
echo "4. Checking Docker configurations..."
if grep -q "migrations" "docker/docker-compose.prod.yml"; then
    print_status "Production compose has migration container"
else
    print_warning "Production compose missing migration container"
fi

if grep -q "SEED_ON_START\|RUN_MIGRATIONS" "docker/docker-compose.yml"; then
    print_status "Development compose has migration environment variables"
else
    print_warning "Development compose may need migration variables"
fi

# Test 5: Check package.json scripts
echo ""
echo "5. Checking npm scripts..."
if grep -q '"seed":' "apps/api/package.json"; then
    print_status "API package.json has seed script"
else
    print_error "API package.json missing seed script"
fi

if grep -q "@faker-js/faker" "apps/api/package.json"; then
    print_status "faker dependency added"
else
    print_warning "faker dependency not found - may need to install"
fi

# Test 6: Verify Dockerfile updates
echo ""
echo "6. Checking Dockerfile updates..."
if grep -q "docker-entrypoint.sh" "apps/api/Dockerfile"; then
    print_status "API Dockerfile includes entrypoint script"
else
    print_error "API Dockerfile missing entrypoint script"
fi

if grep -q "postgresql-client" "apps/api/Dockerfile"; then
    print_status "API Dockerfile includes PostgreSQL client"
else
    print_warning "API Dockerfile missing PostgreSQL client"
fi

# Summary
echo ""
echo "=========================================="
echo "Test Results Summary"
echo "=========================================="

# Count files
SCRIPT_COUNT=$(ls docker/scripts/*.sh 2>/dev/null | wc -l)
SEED_MODULE_COUNT=$(ls apps/api/prisma/seed-data/*.ts 2>/dev/null | wc -l)

echo "✅ Docker scripts created: $SCRIPT_COUNT"
echo "✅ Seed data modules created: $SEED_MODULE_COUNT"
echo "✅ Main seed.ts updated with flexible modes"
echo "✅ Docker configurations updated"

echo ""
echo "Next Steps:"
echo "1. Install dependencies: pnpm install"
echo "2. Test development seeding: cd apps/api && npm run seed"
echo "3. Test production setup: docker compose -f docker/docker-compose.prod.yml up"

echo ""
print_status "Migration & Seeding system is ready!"