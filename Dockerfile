# Use a lightweight Node.js base image
FROM node:18-alpine

# Install essential system dependencies including Python, pip, and FFmpeg
# wget and ca-certificates are included for securely downloading files if needed.
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    wget \
    ca-certificates

# Create a virtual environment and activate it
RUN python3 -m venv /venv
ENV PATH="/venv/bin:$PATH"

# Install/update yt-dlp using pip
RUN pip3 install --no-cache-dir --upgrade yt-dlp

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and lock files to leverage Docker layer caching
COPY package*.json ./

# Install all dependencies (including dev dependencies for the build)
# Skip the postinstall script as we're installing yt-dlp via pip
RUN npm ci --ignore-scripts

# Copy the rest of the application source code
COPY . .

# Build the Next.js application
RUN npm run build

# Expose the port the Next.js app runs on
EXPOSE 3000

# The command to start the application in production mode
CMD ["npm", "start"]

