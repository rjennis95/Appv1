# S&P 500 Short Term Dashboard

This is a Next.js dashboard that visualizes:
1. S&P 500 Index Price (1 Year)
2. S&P 500 % Distance from 50-day EMA (1 Year)
3. Market Breadth (% of S&P 500 stocks above their 20-day EMA) (1 Year)

## Setup

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file in the root directory and add your Financial Modeling Prep (FMP) API Key:
   ```env
   NEXT_PUBLIC_FMP_API_KEY=your_api_key_here
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## Architecture

- **Tech Stack**: Next.js (App Router), Tailwind CSS, Recharts, IndexedDB.
- **Data Source**: Financial Modeling Prep (FMP) API.
- **Caching**: Market Breadth calculations are heavy (500 tickers x 1 year history). The result is cached in IndexedDB (`market-breadth-db`) on the client side to avoid repeated heavy fetching.
- **Logic**:
  - Fetches S&P 500 constituents.
  - Fetches 1 year of daily history for each stock (batched).
  - Calculates 20-day EMA locally.
  - Aggregates daily breadth percentage.

## Notes

- The initial load of the Market Breadth chart will take some time as it fetches and processes data for 500 stocks. A progress bar is displayed during this process.
- Subsequent visits will use the cached data. If the data is outdated (not from today), it will attempt to update it.
