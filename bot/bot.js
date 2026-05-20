/**
 * bot.js — DataBlitz Playwright Bot
 * Supports 1–3 runs (one per product), generates a CSV report after all runs.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs   = require('fs');

// ============================
//       CONFIGURATION
// ===========================

// Must match RELEASE_DATE in mock-site/index.html (only affects Booster Box)
const RELEASE_DATE_STR = '2026-05-20T10:01:00';

// Base URL of the mock site
const BASE_URL = process.env.PRODUCT_URL
  ? process.env.PRODUCT_URL.replace('/index.html', '')
  : `file://${path.resolve(__dirname, '../mock-site/')}`;

// Dummy buyer info used to fill the checkout form
const BUYER = {
  email:      'juan.delacruz@email.com',
  phone:      '+63 912 345 6789',
  firstName:  'Juan',
  lastName:   'dela Cruz',
  address:    'Amihan, Brgy. Tagapo',
  city:       'Santa Rosa, Laguna',
  zip:        '4026',
  cardName:   'JUAN DELA CRUZ',
  cardNumber: '4111 1111 1111 1111',
  cardExpiry: '12/29',
  cardCvv:    '123',
};

// ============================================================
//    PICK YOUR RUNS — edit this array to choose which products
//    to buy and in what order.
//
//    1 = Booster Box   (has countdown timer — bot waits for release)
//    2 = Booster Pack  (no timer — bot clicks immediately)
//    3 = Trainer Box   (no timer — bot clicks immediately)
//
//    Examples:
//      [1]       → buy only the Booster Box
//      [2, 3]    → buy Pack then Trainer Box
//      [1, 2, 3] → buy all three, one after another
// ============================================================
const RUNS = [2,3];

// Product definitions — name, button ID, price, whether it needs the countdown wait
const PRODUCTS = {
  1: { name: 'Journey Together Booster Box',  btnId: 'buy-btn-1', price: '₱4,950.00', waitForRelease: true  },
  2: { name: 'Journey Together Booster Pack', btnId: 'buy-btn-2', price: '₱195.00',   waitForRelease: false },
  3: { name: 'Journey Together Trainer Box',  btnId: 'buy-btn-3', price: '₱2,450.00', waitForRelease: false },
};

// Output paths
const OUTPUT_DIR  = path.resolve(__dirname, '../screenshots');
const RUN_TS      = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const CSV_PATH    = path.join(OUTPUT_DIR, `test-results_${RUN_TS}.csv`);

// ============================================================

const sleep = ms => new Promise(r => setTimeout(r, ms));
const now   = () => new Date().toLocaleTimeString('en-PH', { hour12: false });
const log   = msg => console.log(`[${now()}] ${msg}`);

// ============================================================
// SINGLE RUN — buys one product and returns a result object
// ============================================================
async function runSingle(productId, runIndex) {
  const product   = PRODUCTS[productId];
  const startTime = Date.now();
  const label     = `Run ${runIndex + 1} / Product ${productId} (${product.name})`;

  log(`\n${'='.repeat(56)}`);
  log(`▶ Starting ${label}`);
  log(`${'='.repeat(56)}`);

  // Screenshot filename: e.g. screenshots/run1_booster-box.png
  const screenshotFile = path.join(OUTPUT_DIR, `${RUN_TS}_run${runIndex + 1}_product${productId}.png`);

  let status = 'Failed';

  try {
    // -- Wait for release time (only for Booster Box) --
    if (product.waitForRelease) {
      const releaseDate = new Date(RELEASE_DATE_STR);
      const waitMs      = releaseDate - new Date();
      if (waitMs > 0) {
        log(`Waiting ${Math.ceil(waitMs / 1000)}s for release time...`);
        await sleep(Math.max(0, waitMs - 2000)); // wake up 2s early
        log('Release in ~2 seconds — launching browser...');
      } else {
        log('Release time already passed — starting immediately...');
      }
    }

    // -- Launch browser --
    const isHeadless = process.env.HEADLESS === 'true';
    const browser = await chromium.launch({ headless: isHeadless, slowMo: isHeadless ? 0 : 800 }); // <- Edit numerical value to adjust automation speed
    const page    = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });

    // -- Navigate to product listing page --
    const indexUrl = BASE_URL.startsWith('file://')
      ? `${BASE_URL}/index.html`
      : `${BASE_URL}/index.html`;

    log(`Navigating to ${indexUrl}`);
    await page.goto(indexUrl, { waitUntil: 'domcontentloaded' });

    // -- Wait for the correct product button to be enabled --
    log(`Waiting for #${product.btnId} to be available...`);
    await page.waitForFunction(
      btnId => {
        const btn = document.getElementById(btnId);
        return btn && !btn.disabled;
      },
      product.btnId,
      { polling: 100, timeout: 120000 }
    );
    log(`Button has been enabled — proceeding to add to cart...`);

    // -- Click the product's Add to Cart button --
    await page.click(`#${product.btnId}`);

    // -- Wait for cart page (the checkout button confirms we're there) --
    await page.waitForSelector('#checkout-btn', { timeout: 15000 });
    log('Cart updated — proceeding to checkout...');
    await page.click('#checkout-btn');

    // -- Wait for checkout form --
    await page.waitForSelector('#email', { timeout: 15000 });
    log('Filling checkout form...');

    // -- Fill the checkout form --
    await page.fill('#email',       BUYER.email);       await sleep(80);
    await page.fill('#phone',       BUYER.phone);       await sleep(80);
    await page.fill('#first-name',  BUYER.firstName);   await sleep(80);
    await page.fill('#last-name',   BUYER.lastName);    await sleep(80);
    await page.fill('#address',     BUYER.address);     await sleep(80);
    await page.fill('#city',        BUYER.city);        await sleep(80);
    await page.fill('#zip',         BUYER.zip);         await sleep(80);
    await page.fill('#card-name',   BUYER.cardName);    await sleep(80);
    await page.fill('#card-number', BUYER.cardNumber);  await sleep(80);
    await page.fill('#card-expiry', BUYER.cardExpiry);  await sleep(80);
    await page.fill('#card-cvv',    BUYER.cardCvv);

    log('Form filled — placing order...');
    await page.click('#place-order-btn');

    // -- Wait for confirmation page --
    await page.waitForSelector('#confirmation-page', { timeout: 15000 });
    log('Order confirmed!');

    // -- Screenshot --
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    await page.screenshot({ path: screenshotFile, fullPage: true });
    log(`Screenshot taken → ${screenshotFile}`);

    await browser.close();
    status = '✅ Success';

  } catch (err) {
    log(`❌ ${label} An error occured: ${err.message}`);
  }

  const duration = Math.round((Date.now() - startTime) / 1000);
  log(`⏱ ${label} finished in ${duration}s — Status: ${status}`);

  return {
    run:        runIndex + 1,
    productId,
    product:    product.name,
    price:      product.price,
    status,
    screenshot: status === 'Success' ? screenshotFile : 'N/A',
    duration,
    timestamp:  new Date().toISOString(),
  };
}

// ============================================================
// SAVE CSV — writes all run results to screenshots/test-results.csv
// Opens in Excel or any spreadsheet app.
// ============================================================
function saveCSV(results) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const header = 'Run,Product ID,Product Name,Price,Status,Screenshot Path,Duration (s),Timestamp\n';
  const rows   = results.map(r =>
    `${r.run},${r.productId},"${r.product}",${r.price},${r.status},"${r.screenshot}",${r.duration},${r.timestamp}`
  ).join('\n');

  fs.writeFileSync(CSV_PATH, header + rows + '\n', 'utf8');
  log(`\nCSV report saved to → ${CSV_PATH}`);
}

// ============================================================
// MAIN — runs each product in RUNS array sequentially
// ============================================================
async function main() {
  // Validate RUNS array
  const validIds = Object.keys(PRODUCTS).map(Number);
  const invalid  = RUNS.filter(id => !validIds.includes(id));
  if (invalid.length) {
    console.error(`Invalid product IDs in RUNS: [${invalid}]. Use 1, 2, or 3 only.`);
    process.exit(1);
  }
  if (RUNS.length === 0) {
    console.error('RUNS array is empty. Add at least one product ID.');
    process.exit(1);
  }

  log('DataBlitz Automated Checkout Bot — Starting...');
  log(`Runs configured: [${RUNS.join(', ')}] (${RUNS.length} product${RUNS.length > 1 ? 's' : ''})`);
  RUNS.forEach(id => log(`   ${id} → ${PRODUCTS[id].name}`));

  const results = [];

  for (let i = 0; i < RUNS.length; i++) {
    const result = await runSingle(RUNS[i], i);
    results.push(result);
  }

  // Print summary table to terminal
  log('\nRUN SUMMARY');
  log('─'.repeat(72));
  log(`${'Run'.padEnd(5)} ${'Product'.padEnd(32)} ${'Status'.padEnd(10)} ${'Duration'.padEnd(10)}`);
  log('─'.repeat(72));
  results.forEach(r => {
    const statusIcon = r.status === 'Success' ? '✅' : '❌';
    log(`${String(r.run).padEnd(5)} ${r.product.padEnd(32)} ${(statusIcon + ' ' + r.status).padEnd(10)} ${(r.duration + 's').padEnd(10)}`);
  });
  log('─'.repeat(72));

  const passed = results.filter(r => r.status === 'Success').length;
  log(`Result: ${passed} / ${results.length} runs passed\n`);

  // Save CSV
  saveCSV(results);

  log('✅ All runs complete.');
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});