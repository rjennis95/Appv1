export interface Stock {
  symbol: string;
  name: string;
  sector: string;
}

export interface DailyPrice {
  date: string;
  close: number;
  adjClose?: number;
}

export interface MarketBreadthData {
  date: string;
  percentageAbove: number;
}
