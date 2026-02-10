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
RUN node src/install-package.js kotlin 1.4.31
RUN node src/install-package.js scala 3.0.0
RUN node src/install-package.js swift 5.3.3
RUN node src/install-package.js python 3.9.4
RUN node src/install-package.js php 8.0.2
RUN node src/install-package.js dart 2.12.1
RUN node src/install-package.js go 1.16.2
RUN node src/install-package.js node 18.15.0
RUN node src/install-package.js typescript 5.0.3
RUN node src/install-package.js ruby 3.0.1
RUN node src/install-package.js rust 1.68.2
RUN node src/install-package.js bash 5.2.0
RUN node src/install-package.js brainfuck 2.7.3
RUN node src/install-package.js emojicode 1.0.2
