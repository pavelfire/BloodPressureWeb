# Build stage
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_DEFAULT_API_URL=https://apibp.tmp.ru
ENV VITE_DEFAULT_API_URL=$VITE_DEFAULT_API_URL

RUN npm run build

# Runtime stage
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
