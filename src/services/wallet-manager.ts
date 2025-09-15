import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';
import { ethers } from 'ethers';
import { generateKeyPair, type CryptoKeypair } from '../utils/crypto.js';
import chalk from 'chalk';

export class WalletManager {
  private walletFile: string;
  private yellowDir: string;

  constructor() {
    const homeDir = os.homedir();
    this.yellowDir = path.join(homeDir, '.yellow-cli');
    
    // Create directory if it doesn't exist
    if (!fsSync.existsSync(this.yellowDir)) {
      fsSync.mkdirSync(this.yellowDir, { recursive: true });
    }
    
    // Use terminal session ID for wallet isolation (PPID for terminal session)
    // This allows wallet persistence within a terminal session while isolating between terminals
    const sessionId = process.env.TERM_SESSION_ID || process.ppid || 'default';
    this.walletFile = path.join(this.yellowDir, `wallet-${sessionId}.json`);
  }

  /**
   * Ensure wallet directory exists
   */
  private async ensureWalletDir(): Promise<void> {
    try {
      await fs.access(this.yellowDir);
    } catch {
      await fs.mkdir(this.yellowDir, { recursive: true });
    }
  }

  /**
   * Load existing wallet or create new one
   */
  async loadOrCreateWallet(): Promise<CryptoKeypair> {
    await this.ensureWalletDir();

    // Check for environment variable first
    const envPrivateKey = process.env.PRIVATE_KEY;
    const shouldImportAndSave = process.env.IMPORT_AND_SAVE === 'true';
    
    if (envPrivateKey) {
      try {
        if (shouldImportAndSave) {
          console.log(chalk.blue('🔑 Importing and saving private key...'));
          return await this.importWallet(envPrivateKey);
        } else {
          console.log(chalk.blue('🔑 Using private key from environment...'));
          // Create temporary keypair without saving
          const wallet = new ethers.Wallet(envPrivateKey);
          return {
            privateKey: envPrivateKey,
            address: ethers.getAddress(wallet.address),
          };
        }
      } catch (error) {
        console.log(chalk.red(`❌ Invalid private key in environment: ${error}`));
      }
    }

    try {
      const walletData = await fs.readFile(this.walletFile, 'utf-8');
      const keypair = JSON.parse(walletData) as CryptoKeypair;
      
      // Validate the keypair
      if (!keypair.privateKey || !keypair.address) {
        throw new Error('Invalid wallet data');
      }

      console.log(chalk.green(`📱 Loaded existing wallet: ${keypair.address}`));
      return keypair;
    } catch {
      console.log(chalk.yellow('📱 No existing wallet found, creating new one...'));
      return await this.createNewWallet();
    }
  }

  /**
   * Create a new wallet
   */
  async createNewWallet(): Promise<CryptoKeypair> {
    const keypair = await generateKeyPair();
    await this.saveWallet(keypair);
    console.log(chalk.green(`✨ Created new wallet: ${keypair.address}`));
    return keypair;
  }

  /**
   * Import wallet from private key
   */
  async importWallet(privateKey: string): Promise<CryptoKeypair> {
    try {
      // Validate private key
      const wallet = new ethers.Wallet(privateKey);
      const keypair: CryptoKeypair = {
        privateKey: privateKey,
        address: ethers.getAddress(wallet.address),
      };

      await this.saveWallet(keypair);
      console.log(chalk.green(`📥 Imported wallet: ${keypair.address}`));
      return keypair;
    } catch (error) {
      throw new Error(`Invalid private key: ${error}`);
    }
  }

  /**
   * Save wallet to file
   */
  private async saveWallet(keypair: CryptoKeypair): Promise<void> {
    await this.ensureWalletDir();
    await fs.writeFile(this.walletFile, JSON.stringify(keypair, null, 2));
  }

  /**
   * Get wallet info without private key
   */
  async getWalletInfo(): Promise<{ address: string } | null> {
    try {
      const walletData = await fs.readFile(this.walletFile, 'utf-8');
      const keypair = JSON.parse(walletData) as CryptoKeypair;
      return { address: keypair.address };
    } catch {
      return null;
    }
  }

  /**
   * Delete wallet
   */
  async deleteWallet(): Promise<void> {
    try {
      await fs.unlink(this.walletFile);
      console.log(chalk.yellow('🗑️  Wallet deleted'));
    } catch {
      console.log(chalk.gray('No wallet to delete'));
    }
  }

  /**
   * Export private key (use with caution)
   */
  async exportPrivateKey(): Promise<string | null> {
    try {
      const walletData = await fs.readFile(this.walletFile, 'utf-8');
      const keypair = JSON.parse(walletData) as CryptoKeypair;
      return keypair.privateKey;
    } catch {
      return null;
    }
  }
}
