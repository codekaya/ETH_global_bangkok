// apps/web/lib/stores/predictionMarket.ts
import { PublicKey, Field, UInt64, CircuitString } from 'o1js';
import { create } from 'zustand';

export interface PredictionMarket {
  id: string;
  question: string;
  endDate: string;
  totalStake: number;
  yesPercentage: number;
  noPercentage: number;
  creator: string;
  isResolved: boolean;
  outcome?: boolean;
}

interface PredictionMarketState {
  markets: PredictionMarket[];
  currentMarket: PredictionMarket | null;
  isLoading: boolean;
  error: string | null;
  // Actions
  createMarket: (market: Omit<PredictionMarket, 'id'>) => Promise<void>;
  placeBet: (marketId: string, isYes: boolean, amount: number) => Promise<void>;
  resolveMarket: (marketId: string, outcome: boolean) => Promise<void>;
  setCurrentMarket: (market: PredictionMarket | null) => void;
  fetchMarkets: () => Promise<void>;
  getMarket: (id: string) => PredictionMarket | null;
}

export const usePredictionMarketStore = create<PredictionMarketState>((set, get) => ({
  markets: [],
  currentMarket: null,
  isLoading: false,
  error: null,

  createMarket: async (market) => {
    try {
      set({ isLoading: true, error: null });
      
      // Generate unique ID
      const id = Date.now().toString();
      
      const newMarket: PredictionMarket = {
        ...market,
        id,
        totalStake: 0,
        yesPercentage: 50,
        noPercentage: 50,
        isResolved: false
      };

      // Get existing markets from localStorage
      const existingMarkets = localStorage.getItem('predictionMarkets');
      const markets = existingMarkets ? JSON.parse(existingMarkets) : [];
      
      // Add new market
      const updatedMarkets = [...markets, newMarket];
      
      // Save to localStorage
      localStorage.setItem('predictionMarkets', JSON.stringify(updatedMarkets));
      
      set((state) => ({
        markets: [...state.markets, newMarket],
        isLoading: false
      }));
    } catch (error) {
      set({ error: 'Failed to create market', isLoading: false });
      throw error;
    }
  },

  placeBet: async (marketId, isYes, amount) => {
    try {
      set({ isLoading: true, error: null });
      
      const updatedMarkets = get().markets.map(market => {
        if (market.id === marketId) {
          const adjustment = Math.min(5, amount / 100); // Adjust percentage based on bet size
          const newYesPercent = isYes 
            ? market.yesPercentage + adjustment 
            : market.yesPercentage - adjustment;
          
          return {
            ...market,
            yesPercentage: Math.max(0, Math.min(100, newYesPercent)),
            noPercentage: Math.max(0, Math.min(100, 100 - newYesPercent)),
            totalStake: market.totalStake + amount
          };
        }
        return market;
      });

      // Save to localStorage
      localStorage.setItem('predictionMarkets', JSON.stringify(updatedMarkets));
      
      set({ markets: updatedMarkets, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to place bet', isLoading: false });
      throw error;
    }
  },

  resolveMarket: async (marketId, outcome) => {
    try {
      set({ isLoading: true, error: null });
      
      const updatedMarkets = get().markets.map(market => {
        if (market.id === marketId) {
          return {
            ...market,
            isResolved: true,
            outcome
          };
        }
        return market;
      });

      // Save to localStorage
      localStorage.setItem('predictionMarkets', JSON.stringify(updatedMarkets));
      
      set({ markets: updatedMarkets, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to resolve market', isLoading: false });
      throw error;
    }
  },

  setCurrentMarket: (market) => {
    set({ currentMarket: market });
  },

  fetchMarkets: async () => {
    try {
      set({ isLoading: true, error: null });
      
      // Get markets from localStorage
      const savedMarkets = localStorage.getItem('predictionMarkets');
      const markets = savedMarkets ? JSON.parse(savedMarkets) : [];
      
      set({ markets, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to fetch markets', isLoading: false });
      throw error;
    }
  },

  getMarket: (id) => {
    return get().markets.find(market => market.id === id) || null;
  }
}));