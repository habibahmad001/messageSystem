FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (we need tsx for running TypeScript)
RUN npm ci

# Copy source code and other files
COPY . .

# Create media directory
RUN mkdir -p media

# Expose port
EXPOSE 5001

# Start the application
CMD ["npm", "start"]