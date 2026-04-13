FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Expose Vite port
EXPOSE 5173

# Run Vite with --host flag to allow external connections
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
