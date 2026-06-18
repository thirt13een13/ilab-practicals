#!/bin/bash

echo "Building all experiment Docker images..."

# Physics experiments
cd experiments/physics/ohms-law
docker build -t ilab-physics-ohms-law .
cd ../../..

cd experiments/physics/pendulum-motion
docker build -t ilab-physics-pendulum .
cd ../../..

# Chemistry experiments
cd experiments/chemistry/acid-base-titration
docker build -t ilab-chemistry-titration .
cd ../../..

# Biology experiments
cd experiments/biology/microscope-simulation
docker build -t ilab-biology-microscope .
cd ../../..

echo "All experiment images built successfully!"