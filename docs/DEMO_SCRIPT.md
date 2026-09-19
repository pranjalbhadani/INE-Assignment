# Demo Script for Recording

This is a 2-4 minute script designed to demonstrate the fully functional PricePulse system.

## Setup
Before starting the recording:
1. Ensure the backend is running locally with `SHOW_BROWSER=true npm run dev` inside `/backend` so the Playwright browser is visible.
2. Ensure the frontend is running locally or use the live Vercel dashboard pointing to your local API for the live trace.
3. Keep the target mock storefront (`https://demo.inelabteamdev.com`) ready in mind to grab a valid product ID.

## 1. Introduction & Dashboard Overview (0:00 - 0:30)
- Start recording with your browser window capturing the **Live Dashboard**.
- Point out the top-level metrics: total tracked products, success/failure rates, and active scrapes.
- Highlight the **System Health** indicator showing "Healthy".

## 2. Searching & Tracking a Product (0:30 - 1:00)
- Navigate to the **Search Store** page.
- Enter a query (e.g., "laptop" or "phone") and hit search.
- Select a product from the mock storefront results and click **Track Product**.
- Briefly explain that this action inserts the product into the Supabase database.

## 3. The "Run Now" Scraper Execution (1:00 - 2:00)
- Navigate back to the **Overview** or **Tracked Products** page.
- Find the newly tracked product and click its details view.
- Click the **Run Now** button.
- Instantly switch your screen capture/focus to the headed Playwright browser instance that launches.
- **Narrate the flow:** Point out the anti-bot challenge page that appears. Explain how the scraper simulates human mouse movements over the price block to activate the "Reveal price" button, clicks it, and waits for the price DOM to resolve.
- Show the browser successfully loading the real product page and immediately closing once extraction is complete.

## 4. Verifying Extracted Data (2:00 - 2:45)
- Switch focus back to the dashboard.
- Show the updated **Current Price** and **In Stock** status on the product details page.
- Explain that the scraper successfully ignored the decoy/honeypot prices (like `$14,410,830`) by dynamically filtering out hidden and dummy elements (`aria-hidden`, etc.) directly from the live DOM.
- Scroll down to the **Price History** chart and point out the new data point.
- Check the **Scrape Log** tab on the product details page to show the successful `200 OK` attempt record.

## 5. Conclusion (2:45 - 3:00)
- Navigate back to the main dashboard.
- Show the updated total statistics (Successful Scrapes up by 1, 0% failure rate).
- Conclude the video.
