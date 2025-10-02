# Use Node.js LTS
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm install

# Copy the rest of the app
COPY . .

# Expose Vite's dev port
EXPOSE 5173

# Default command
CMD ["npm", "run", "dev", "--", "--host"]
