#!/bin/bash

# Cheevo Database Migration Script
echo "🔧 Cheevo Database Migration"
echo "==========================="

# Check if we have the database URL
if [ ! -f .env ]; then
    echo "❌ .env file not found"
    exit 1
fi

# Extract the project ref from the Supabase URL
SUPABASE_URL=$(grep EXPO_PUBLIC_SUPABASE_URL .env | cut -d'=' -f2)
PROJECT_REF=$(echo $SUPABASE_URL | cut -d'/' -f3 | cut -d'.' -f1)

if [ -z "$PROJECT_REF" ]; then
    echo "❌ Could not extract project reference from SUPABASE_URL"
    exit 1
fi

echo "📍 Project: $PROJECT_REF"

# Prompt for database password
echo "🔑 Please enter your Supabase database password:"
echo "   (Find it in: Supabase Dashboard > Settings > Database > Connection string)"
read -s DB_PASSWORD

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Database password is required"
    exit 1
fi

# Construct the connection string
DB_URL="postgresql://postgres:$DB_PASSWORD@db.$PROJECT_REF.supabase.co:5432/postgres"

echo ""
echo "🚀 Starting migration..."

# Run the main migration
echo "📄 Executing schema migration..."
psql "$DB_URL" -f supabase/migrations/001_complete_schema.sql

if [ $? -ne 0 ]; then
    echo "❌ Schema migration failed"
    exit 1
fi

echo "✅ Schema migration completed"

# Generate and run seed data
echo "🌱 Generating seed data..."
node scripts/generate-universities-seed.js

echo "📄 Executing seed data..."
psql "$DB_URL" -f supabase/seed.sql

if [ $? -ne 0 ]; then
    echo "❌ Seed data failed"
    exit 1
fi

echo "✅ Seed data completed"

# Verify the setup
echo "🔍 Verifying setup..."
UNIVERSITY_COUNT=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM public.universities;")

if [ $? -eq 0 ]; then
    echo "✅ Verification successful: $UNIVERSITY_COUNT universities loaded"
else
    echo "❌ Verification failed"
    exit 1
fi

echo ""
echo "🎉 Database setup completed successfully!"
echo "✅ All tables created with RLS policies"
echo "✅ All functions and triggers installed"
echo "✅ $UNIVERSITY_COUNT universities seeded"
echo "✅ App configuration defaults loaded"
echo "✅ Moderation configuration loaded"
echo ""
echo "🚀 Your Cheevo database is ready!"