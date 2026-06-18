# Stage 1: Build the React app
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies — copy lockfile too for reproducible installs
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --silent

# Copy config files needed for Tailwind CSS processing
COPY tailwind.config.js postcss.config.js ./
COPY tsconfig.json ./

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
