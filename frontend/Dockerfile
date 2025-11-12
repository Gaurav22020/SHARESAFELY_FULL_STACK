# ==========================================================
# 1️⃣ Build Stage — Build the React/Vite app
# ==========================================================
FROM node:22-alpine AS build

# Set working directory
WORKDIR /app

# Copy only package files first (for better caching)
COPY package*.json ./

# Install dependencies cleanly
RUN npm ci

# Copy the rest of your frontend source
COPY . .

# Build static assets (Vite generates /app/dist)
RUN npm run build


# ==========================================================
# 2️⃣ Serve Stage — Serve built files with Nginx
# ==========================================================
FROM nginx:1.27-alpine

# Remove default Nginx static files
RUN rm -rf /usr/share/nginx/html/*

# Copy built files from the previous stage
COPY --from=build /app/dist /usr/share/nginx/html

# Expose container port 80
EXPOSE 80

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
