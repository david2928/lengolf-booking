# Dockerfile

# Use the official Node.js LTS image
FROM node:18

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install --production

# Bundle app source including 'public' directory
COPY . .

# Expose port (optional, as Cloud Run uses the PORT environment variable)
EXPOSE 8080

# Start the application
CMD [ "node", "index.js" ]
