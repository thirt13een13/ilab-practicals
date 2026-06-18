FROM nginx:alpine
COPY index.html /usr/share/nginx/html/
RUN echo "OK" > /usr/share/nginx/html/health
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]