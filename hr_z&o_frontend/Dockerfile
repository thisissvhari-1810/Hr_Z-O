# ----------------------------------------------------------------------
# PeopleFlow frontend image — nginx serving the static site.
# ----------------------------------------------------------------------
FROM nginx:1.27-alpine

# Drop the default nginx site and our config in.
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/peopleflow.conf

# Copy the static site into nginx's html dir.
COPY . /usr/share/nginx/html

# Strip files that aren't needed in the runtime image.
RUN rm -f /usr/share/nginx/html/Dockerfile \
          /usr/share/nginx/html/.dockerignore \
          /usr/share/nginx/html/nginx.conf \
          /usr/share/nginx/html/serve.ps1 \
          /usr/share/nginx/html/.gitignore \
          /usr/share/nginx/html/README.md

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O- http://127.0.0.1/ > /dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
