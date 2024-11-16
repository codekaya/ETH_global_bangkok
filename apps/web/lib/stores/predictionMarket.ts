import { PublicKey, UInt64, CircuitString, Bool } from 'o1js';
import { connectToNetwork, sendTransaction } from 'protokit-client';

// Connect to the blockchain network
const network = connectToNetwork('https://your-blockchain-node');

// Function to create a new bet
async function createBet(minimumStakeAmount: UInt64, description: CircuitString) {
  const transaction = {
    method: 'createBet',
    params: {
      minimumStakeAmount: UInt64.from(minimumStakeAmount),
      description: CircuitString.fromString(description),
    },
  };
  const response = await sendTransaction(network, transaction);
  console.log('Create Bet Response:', response);
}

// Function to place a bet
async function placeBet(betId: UInt64, outcome: Bool, amount: UInt64) {
  const transaction = {
    method: 'placeBet',
    params: {
      betId: UInt64.from(betId),
      outcome: Bool(outcome),
      amount: UInt64.from(amount),
    },
  };
  const response = await sendTransaction(network, transaction);
  console.log('Place Bet Response:', response);
}

// Function to close the market
async function closeMarket(betId: UInt64) {
  const transaction = {
    method: 'closeMarket',
    params: {
      betId: UInt64.from(betId),
    },
  };
  const response = await sendTransaction(network, transaction);
  console.log('Close Market Response:', response);
}

// Function to claim winnings
async function claimWinnings(betId: UInt64, address: PublicKey) {
  const transaction = {
    method: 'claimWinnings',
    params: {
      betId: UInt64.from(betId),
      address: PublicKey.fromBase58(address),
    },
  };
  const response = await sendTransaction(network, transaction);
  console.log('Claim Winnings Response:', response);
}

// Example usage
createBet(100, 'Will it rain tomorrow?');
placeBet(1, true, 50);
closeMarket(1);
claimWinnings(1, 'your-public-key');