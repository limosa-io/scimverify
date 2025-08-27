#!/bin/bash
set -e

echo "Building Docker image..."
docker build -t scimverify-test .

echo "Running tests in Docker container..."
docker run --rm scimverify-test npm test
