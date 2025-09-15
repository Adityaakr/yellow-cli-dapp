import dotenv from 'dotenv';

dotenv.config();

export const CONFIG = {
  CLEARNODE_URL: process.env.CLEARNODE_URL || 'wss://clearnode.example.com',
  PRIVATE_KEY: process.env.PRIVATE_KEY || '',
  NETWORK: process.env.NETWORK || 'polygon',
  RPC_URL: process.env.RPC_URL || 'https://polygon-rpc.com',
  APP_NAME: process.env.APP_NAME || 'Yellow CLI Dapp',
  SCOPE: process.env.SCOPE || 'app.create',
};

export const AUTH_TYPES = {
  Policy: [
    { name: "challenge", type: "string" },
    { name: "scope", type: "string" },
    { name: "wallet", type: "address" },
    { name: "application", type: "address" },
    { name: "participant", type: "address" },
    { name: "expire", type: "uint256" },
    { name: "allowances", type: "Allowance[]" },
  ],
  Allowance: [
    { name: "asset", type: "string" },
    { name: "amount", type: "uint256" },
  ],
};

export const NETWORKS = {
  polygon: {
    name: 'Polygon',
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
    currency: 'MATIC'
  },
  base: {
    name: 'Base',
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    currency: 'ETH'
  },
  celo: {
    name: 'Celo',
    chainId: 42220,
    rpcUrl: 'https://forno.celo.org',
    currency: 'CELO'
  }
};
