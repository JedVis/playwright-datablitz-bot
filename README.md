# Playwright DataBlitz Bot

A browser automation bot that simulates buying a limited-release Pokemon booster box from a self-built mock DataBlitz e-commerce site. Built as a side project to demonstrate browser automation, Docker containerization, and end-to-end web interaction.

---

## Tech Stack

| Technology | Role |
|---|---|
| Playwright (JS) | Browser automation — clicks buttons, fills forms, takes screenshots |
| Node.js | JavaScript runtime |
| Docker + Docker Compose | Containerization — runs the bot and mock site together |
| HTML / CSS / Vanilla JS | Mock DataBlitz storefront |
| http-server | Serves the mock site inside Docker |

---

## Project Structure

```
playwright-datablitz-bot/
├── mock-site/
│   ├── index.html          product listing page with countdown timer
│   ├── cart.html           shopping cart
│   ├── checkout.html       checkout form
│   ├── confirmation.html   order confirmation
│   └── style.css           shared stylesheet
├── bot/
│   └── bot.js              Playwright automation script
├── screenshots/            bot saves screenshots and CSV report here
├── Dockerfile              container recipe for the bot
├── docker-compose.yml      runs the mock site and bot together
└── package.json
```

---

## How It Works

The mock site simulates a DataBlitz product drop with three Pokemon TCG products. The booster box has a countdown timer that locks its Add to Cart button until the set release time. The bot waits for that exact moment, clicks the button the instant it unlocks, proceeds through the cart and checkout form automatically, and saves a screenshot of the confirmation page as proof.

After all runs finish, a CSV report is saved to the screenshots folder with the result of each run.

---

## Configuration

Before running, these two values must match each other exactly.

| File | Variable | Purpose |
|---|---|---|
| `mock-site/index.html` | `const RELEASE_DATE` | Controls when the Add to Cart button unlocks |
| `bot/bot.js` | `const RELEASE_DATE_STR` | Controls when the bot stops waiting |

Format: `YYYY-MM-DDTHH:MM:SS` — for example `2025-06-10T15:47:00`

To choose which products the bot buys, edit the `RUNS` array in `bot/bot.js`:

```javascript
const RUNS = [1];       // Booster Box only
const RUNS = [2, 3];    // Booster Pack then Trainer Box
const RUNS = [1, 2, 3]; // all three products
```

---

## Running Locally

Requirements: Node.js v18 or higher, Git

```bash
git clone https://github.com/YOUR_USERNAME/playwright-datablitz-bot.git
cd playwright-datablitz-bot
npm install
npx playwright install chromium
node bot/bot.js
```

---

## Running with Docker

Requirements: Docker Desktop

```bash
git clone https://github.com/YOUR_USERNAME/playwright-datablitz-bot.git
cd playwright-datablitz-bot
docker-compose build
docker-compose up
```

To view the mock site while Docker is running, open `http://localhost:8080` in your browser.

To stop:
```bash
docker-compose down
```

---

## Output

Each run produces a screenshot saved as `screenshots/[timestamp]_run[N]_product[N].png`.

After all runs complete, a CSV report is saved as `screenshots/test-results_[timestamp].csv` which can be opened in Excel or Google Sheets.

| Run | Product | Price | Status | Duration |
|---|---|---|---|---|
| 1 | Journey Together Booster Box | 4,950.00 | Success | 48s |
| 2 | Journey Together Booster Pack | 195.00 | Success | 12s |

---

## Notes

This is a demonstration project. No real payments are processed and no real orders are placed. The dummy card number `4111 1111 1111 1111` is a standard test number used across the industry.