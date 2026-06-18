#!/bin/bash

echo "Setting up iLab project..."

# Install frontend dependencies
cd ilab-frontend
npm install
cd ..

# Install Docker manager dependencies
cd docker-manager
npm install
cd ..

# Start Supabase locally
supabase start

# Run migrations
supabase db push

# Build initial experiment images
bash scripts/build-all-experiments.sh

echo "Setup complete!"