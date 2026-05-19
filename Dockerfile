# ============================================================
# Dockerfile — Playwright DataBlitz Bot
# ============================================================
#
# Each line is an "instruction" that Docker runs step by step
# to build a container image.

# ---- Base Image ----
# We start from Playwright's official Docker image.
# This already has Node.js AND all the system libraries
# that Chromium needs (fonts, libglib, etc.) — saves us a lot of work.
# We use the version that matches our installed Playwright.
FROM mcr.microsoft.com/playwright:v1.44.0-jammy

# ---- Set Working Directory ----
# All commands from here on run inside this folder in the container.
# It's like doing "cd /app" before every command.
WORKDIR /app

# ---- Copy package files first ----
# We copy package.json and package-lock.json BEFORE the rest of the code.
# Why? Docker caches each step. If only the code changes (not dependencies),
# Docker reuses the cached "npm install" step — making rebuilds much faster.
COPY package*.json ./

# ---- Install Node.js dependencies ----
# --omit=dev skips packages only needed for development.
RUN npm install --omit=dev

# ---- Install Playwright's Chromium browser ----
# Even though the base image has browser binaries, we run this to make
# sure the exact version matching our package is installed.
RUN npx playwright install chromium

# ---- Copy the rest of the project files ----
# This copies everything: mock-site/, bot/, etc.
# The .dockerignore file (we'll create it) tells Docker what to skip.
COPY . .

# ---- Create the screenshots output folder ----
RUN mkdir -p /app/screenshots

# ---- Default command ----
# When the container starts, run the bot.
# We set HEADLESS=true so the browser runs invisibly inside Docker
# (there's no display screen in a server container).
ENV HEADLESS=true

CMD ["node", "bot/bot.js"]