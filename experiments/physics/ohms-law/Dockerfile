FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy our experiment files
COPY index.html /usr/share/nginx/html/

# Add health check endpoint
RUN echo "OK" > /usr/share/nginx/html/health

# Expose port 3001
EXPOSE 3001

# Configure nginx to listen on port 3001
RUN sed -i 's/listen       80;/listen       3001;/g' /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]