#!/bin/bash

echo "Starting iLab services..."

# Start Supabase (if not running)
echo "Starting Supabase..."
supabase start

# Start Docker Manager
echo "Starting Docker Manager..."
cd docker-manager
node server.js &
DOCKER_MANAGER_PID=$!
cd ..

# Start Frontend
echo "Starting Frontend..."
cd ilab-frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "iLab services started!"
echo "Frontend: http://localhost:5173"
echo "Docker Manager: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for Ctrl+C
trap "kill $DOCKER_MANAGER_PID $FRONTEND_PID; exit" INT
wait