# Stage 1: Build the Next.js app
FROM node:18 AS builder

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Set environment variable for production build
ENV NODE_ENV=production

# Build the Next.js app
RUN npm run build

# Stage 2: Create production image
FROM node:18-alpine

WORKDIR /app

# Copy only the necessary files from the builder stage
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Expose the port the app runs on
EXPOSE 3000

# Set environment variable for production
ENV NODE_ENV=production

# Start the Next.js app in production mode
CMD ["node", "server.js"]

#docker run -d --name nextjs-pocket-identification   -p 3004:3000   --network api_connect nextjs-pocket-identification