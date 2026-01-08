#!/bin/bash
set -e

# Generate Prisma client (doesn't require DATABASE_URL)
echo "Generating Prisma client..."
npx prisma generate || {
  echo "Warning: Prisma generate failed, but continuing build..."
  # Set a dummy DATABASE_URL if not set, just for schema validation
  if [ -z "$DATABASE_URL" ]; then
    export DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
    npx prisma generate
    unset DATABASE_URL
  fi
}

# Build the React Router app
echo "Building React Router app..."
npm run build

echo "Build completed successfully!"
