# Stage 1: build the Vite project
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
# Vite skips classic <script src> tags — copy them manually so nginx can serve them
RUN cp -r js dist/js

# Stage 2: serve with nginx
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html/
RUN echo "OK" > /usr/share/nginx/html/health && \
    chmod -R 755 /usr/share/nginx/html/
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
