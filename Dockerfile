# Use Node.js LTS version (non-Alpine for better compatibility)
FROM node:20

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Start the Next.js app in development mode
CMD ["npm", "run", "dev"]



