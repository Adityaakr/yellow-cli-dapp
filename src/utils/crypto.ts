import { ethers } from 'ethers';
import { type Hex } from 'viem';
import {
  type MessageSigner,
  type RequestData,
  type ResponsePayload,
} from '@erc7824/nitrolite';

export interface CryptoKeypair {
  privateKey: string;
  address: string;
}

export interface WalletSigner {
  address: Hex;
  sign: MessageSigner;
}

/**
 * Creates a signer from a private key using ethers.js v6
 */
export const createEthersSigner = (privateKey: string): WalletSigner => {
  try {
    const wallet = new ethers.Wallet(privateKey);

    return {
      address: ethers.getAddress(wallet.address) as Hex,
      sign: async (payload: RequestData | ResponsePayload): Promise<Hex> => {
        try {
          const message = JSON.stringify(payload);
          const digestHex = ethers.id(message);
          const messageBytes = ethers.getBytes(digestHex);
          const { serialized: signature } = wallet.signingKey.sign(messageBytes);
          return signature as Hex;
        } catch (error) {
          console.error('Error signing message:', error);
          throw error;
        }
      },
    };
  } catch (error) {
    console.error('Error creating ethers signer:', error);
    throw error;
  }
};

/**
 * Generates a random keypair using ethers v6
 */
export const generateKeyPair = async (): Promise<CryptoKeypair> => {
  try {
    const wallet = ethers.Wallet.createRandom();
    const privateKeyHash = ethers.keccak256(wallet.privateKey as string);
    const walletFromHashedKey = new ethers.Wallet(privateKeyHash);

    return {
      privateKey: privateKeyHash,
      address: ethers.getAddress(walletFromHashedKey.address),
    };
  } catch (error) {
    console.error('Error generating keypair:', error);
    const randomHex = ethers.randomBytes(32);
    const privateKey = ethers.keccak256(randomHex);
    const wallet = new ethers.Wallet(privateKey);

    return {
      privateKey: privateKey,
      address: ethers.getAddress(wallet.address),
    };
  }
};

/**
 * Format USDC amounts (6 decimals internally, display 2)
 */
export const formatUSDC = (amount: bigint): string => {
  const amountStr = amount.toString().padStart(7, '0');
  const dollars = amountStr.slice(0, -6) || '0';
  const cents = amountStr.slice(-6, -4).padEnd(2, '0');
  return `${dollars}.${cents}`;
};

/**
 * Parse USDC amounts from string to bigint
 */
export const parseUSDC = (amount: string): bigint => {
  try {
    if (!amount || isNaN(Number(amount))) {
      return BigInt(0);
    }
    
    const normalizedAmount = Number(amount).toFixed(2);
    const [dollars, cents = '0'] = normalizedAmount.split('.');
    const cleanDollars = dollars.replace(/,/g, '');
    
    return BigInt(cleanDollars + cents.padEnd(2, '0') + '0000');
  } catch (error) {
    console.error('Error parsing USDC amount:', error);
    return BigInt(0);
  }
};
