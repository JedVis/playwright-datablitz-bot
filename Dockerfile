# ============================================================
#       Dockerfile — Playwright DataBlitz Bot
# ============================================================

# ---- Base Image ----
FROM mcr.microsoft.com/playwright:v1.44.0-jammy

# ---- Set Working Directory ----
WORKDIR /app

# ---- Copy package files ----
COPY package*.json ./

# ---- Install Node.js dependencies ----
RUN npm install --omit=dev

# ---- Install Playwright's Chromium browser ----
RUN npx playwright install chromium

# ---- Copy the rest of the project files ----
COPY . .

# ---- Create screenshots folder ----
RUN mkdir -p /app/screenshots

# ---- Default command ----
ENV HEADLESS=true

CMD ["node", "bot/bot.js"]
