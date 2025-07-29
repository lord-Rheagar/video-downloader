#!/usr/bin/env bash

# Exit on error
set -o errexit

# Install yt-dlp
echo "Installing yt-dlp..."
pip install --user yt-dlp

# Add local bin to PATH for yt-dlp
export PATH="$HOME/.local/bin:$PATH"

# Verify yt-dlp installation
echo "Verifying yt-dlp installation..."
yt-dlp --version

# Install Node dependencies
echo "Installing Node dependencies..."
npm ci

# Build the Next.js application
echo "Building Next.js application..."
npm run build
