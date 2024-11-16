// import { PublicKey, UInt64, CircuitString, Bool } from 'o1js';
// import { connectToNetwork, sendTransaction } from 'protokit-client';

// // Connect to the blockchain network
// const network = connectToNetwork('https://your-blockchain-node');

// // Function to create a new bet
// async function createBet(minimumStakeAmount: UInt64, description: CircuitString) {
//   const transaction = {
//     method: 'createBet',
//     params: {
//       minimumStakeAmount: UInt64.from(minimumStakeAmount),
//       description: CircuitString.fromString(description),
//     },
//   };
//   const response = await sendTransaction(network, transaction);
//   console.log('Create Bet Response:', response);
// }

// // Function to place a bet
// async function placeBet(betId: UInt64, outcome: Bool, amount: UInt64) {
//   const transaction = {
//     method: 'placeBet',
//     params: {
//       betId: UInt64.from(betId),
//       outcome: Bool(outcome),
//       amount: UInt64.from(amount),
//     },
//   };
//   const response = await sendTransaction(network, transaction);
//   console.log('Place Bet Response:', response);
// }

// // Function to close the market
// async function closeMarket(betId: UInt64) {
//   const transaction = {
//     method: 'closeMarket',
//     params: {
//       betId: UInt64.from(betId),
//     },
//   };
//   const response = await sendTransaction(network, transaction);
//   console.log('Close Market Response:', response);
// }

// // Function to claim winnings
// async function claimWinnings(betId: UInt64, address: PublicKey) {
//   const transaction = {
//     method: 'claimWinnings',
//     params: {
//       betId: UInt64.from(betId),
//       address: PublicKey.fromBase58(address),
//     },
//   };
//   const response = await sendTransaction(network, transaction);
//   console.log('Claim Winnings Response:', response);
// }

// // Example usage
// createBet(100, 'Will it rain tomorrow?');
// placeBet(1, true, 50);
// closeMarket(1);
// claimWinnings(1, 'your-public-key');



import { create } from "zustand";
import { Client, useClientStore } from "./client";
import { immer } from "zustand/middleware/immer";
import { PendingTransaction, UnsignedTransaction } from "@proto-kit/sequencer";
import { Balance, BalancesKey, TokenId } from "@proto-kit/library";
import { Provable, PublicKey, UInt64 } from "o1js";
import { useCallback, useEffect } from "react";
import { useChainStore } from "./chain";
import { useWalletStore } from "./wallet";

export interface BalancesState {
  loading: boolean;
  balances: {
    // address - balance
    [key: string]: string;
  };
  loadBalance: (client: Client, address: string) => Promise<void>;
  faucet: (client: Client, address: string) => Promise<PendingTransaction>;
}

function isPendingTransaction(
  transaction: PendingTransaction | UnsignedTransaction | undefined,
): asserts transaction is PendingTransaction {
  if (!(transaction instanceof PendingTransaction))
    throw new Error("Transaction is not a PendingTransaction");
}

export const tokenId = TokenId.from(0);

export const useBalancesStore = create<
  BalancesState,
  [["zustand/immer", never]]
>(
  immer((set) => ({
    loading: Boolean(false),
    balances: {},
    async loadBalance(client: Client, address: string) {
      set((state) => {
        state.loading = true;
      });

      const key = BalancesKey.from(tokenId, PublicKey.fromBase58(address));

      const balance = await client.query.runtime.Balances.balances.get(key);

      set((state) => {
        state.loading = false;
        state.balances[address] = balance?.toString() ?? "0";
      });
    },
    async faucet(client: Client, address: string) {
      const balances = client.runtime.resolve("Balances");
      const sender = PublicKey.fromBase58(address);

      const tx = await client.transaction(sender, async () => {
        await balances.addBalance(tokenId, sender, Balance.from(1000));
      });

      await tx.sign();
      await tx.send();

      isPendingTransaction(tx.transaction);
      return tx.transaction;
    },
  })),
);

export const useObserveBalance = () => {
  const client = useClientStore();
  const chain = useChainStore();
  const wallet = useWalletStore();
  const balances = useBalancesStore();

  useEffect(() => {
    if (!client.client || !wallet.wallet) return;

    balances.loadBalance(client.client, wallet.wallet);
  }, [client.client, chain.block?.height, wallet.wallet]);
};

export const useFaucet = () => {
  const client = useClientStore();
  const balances = useBalancesStore();
  const wallet = useWalletStore();

  return useCallback(async () => {
    if (!client.client || !wallet.wallet) return;

    const pendingTransaction = await balances.faucet(
      client.client,
      wallet.wallet,
    );

    wallet.addPendingTransaction(pendingTransaction);
  }, [client.client, wallet.wallet]);
};
