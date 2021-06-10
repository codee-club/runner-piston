FROM ghcr.io/engineer-man/piston@sha256:2ad777b5a81c97d9256cb4381e63d5fc090fbca8e2b81d255a895853690109a8

# Install additional dependencies
RUN npm install @google-cloud/storage@5.8.5

# Add additional files
COPY ./src ./src

# Patch in the new API
RUN sed -i 's+api/v2+api+g' src/index.js

# Pre-install packages
RUN mkdir /piston
RUN node src/install-package.js java 15.0.2
