# Stage 1: Build the React app
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies first (cached layer)
COPY package.json .
RUN npm install --silent

# Copy source and build
COPY public/ ./public/
COPY src/ ./src/
RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
