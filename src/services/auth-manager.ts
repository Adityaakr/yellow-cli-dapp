import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import ora from 'ora';
import { NitroliteClient } from './nitrolite-client.js';
import { WalletManager } from './wallet-manager.js';
import { CONFIG } from '../config/index.js';

interface AuthSession {
  address: string;
  jwtToken?: string;
  authenticated: boolean;
  connectedAt: number;
  expiresAt: number;
}

export class AuthManager {
  private client: NitroliteClient;
  private walletManager: WalletManager;
  private sessionFile: string;
  private currentSession: AuthSession | null = null;

  constructor() {
    this.client = new NitroliteClient(CONFIG.CLEARNODE_URL);
    this.walletManager = new WalletManager();
    // Use terminal session ID for session isolation like wallets
    const sessionId = process.env.TERM_SESSION_ID || process.ppid || 'default';
    this.sessionFile = path.join(os.homedir(), '.yellow-cli', `session-${sessionId}.json`);
    this.ensureSessionFileExists();
  }

  /**
   * Ensure the session file exists
   */
  private ensureSessionFileExists(): void {
    const dir = path.dirname(this.sessionFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.sessionFile)) {
      fs.writeFileSync(this.sessionFile, JSON.stringify(null, null, 2));
    }
  }

  /**
   * Load session from file
   */
  private loadSession(): AuthSession | null {
    try {
      const data = fs.readFileSync(this.sessionFile, 'utf8');
      const session = JSON.parse(data);
      
      // Check if session is expired
      if (session && session.expiresAt > Date.now()) {
        return session;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Save session to file
   */
  private saveSession(session: AuthSession | null): void {
    try {
      fs.writeFileSync(this.sessionFile, JSON.stringify(session, null, 2));
    } catch (error) {
      console.log(chalk.yellow('Warning: Could not save session'));
    }
  }

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    if (this.currentSession) {
      return this.currentSession.authenticated && this.currentSession.expiresAt > Date.now();
    }

    // Try to load from file
    const savedSession = this.loadSession();
    if (savedSession) {
      this.currentSession = savedSession;
      return savedSession.authenticated && savedSession.expiresAt > Date.now();
    }

    return false;
  }

  /**
   * Get current authenticated address
   */
  getAuthenticatedAddress(): string | null {
    if (this.isAuthenticated() && this.currentSession) {
      return this.currentSession.address;
    }
    return null;
  }

  /**
   * Get authenticated client instance
   */
  async getAuthenticatedClient(): Promise<NitroliteClient | null> {
    if (this.isAuthenticated()) {
      return this.client;
    }
    
    // Try to authenticate if not already authenticated
    const success = await this.authenticate();
    if (success) {
      return this.client;
    }
    
    return null;
  }

  /**
   * Authenticate user with ClearNode
   */
  async authenticate(): Promise<boolean> {
    console.log(chalk.blue.bold('\n🔐 Authentication Required\n'));

    const spinner = ora('Loading wallet...').start();

    try {
      // Load or create wallet
      const keypair = await this.walletManager.loadOrCreateWallet();
      await this.client.initialize(keypair);

      spinner.text = 'Connecting to ClearNode...';
      await this.client.connect();

      spinner.text = 'Authenticating with ClearNode...';
      
      // Wait for authentication to complete
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Authentication timeout'));
        }, 30000); // 30 second timeout

        // Listen for authentication success
        this.client.addMessageHandler('auth_success', (message: any) => {
          clearTimeout(timeout);
          resolve(message);
        });

        // Listen for authentication failure
        this.client.addMessageHandler('auth_error', (error: any) => {
          clearTimeout(timeout);
          reject(new Error(`Authentication failed: ${error}`));
        });
      });

      spinner.succeed('Successfully authenticated with ClearNode!');

      // Create session
      const address = this.client.getAddress();
      if (!address) {
        throw new Error('Failed to get address from client');
      }

      this.currentSession = {
        address,
        authenticated: true,
        connectedAt: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      };

      this.saveSession(this.currentSession);

      console.log(chalk.green('\n✅ Authentication Successful!'));
      console.log(`Address: ${chalk.cyan(this.currentSession.address)}`);
      console.log(`Session expires: ${chalk.gray(new Date(this.currentSession.expiresAt).toLocaleString())}`);

      return true;

    } catch (error: any) {
      spinner.fail(`Authentication failed: ${error.message}`);
      console.log(chalk.red('\n❌ Authentication Failed'));
      console.log(chalk.gray('Please check your wallet configuration and try again.'));
      return false;
    }
  }

  /**
   * Logout and clear session
   */
  async logout(): Promise<void> {
    console.log(chalk.yellow('\n🚪 Logging out...'));

    try {
      // Disconnect from ClearNode
      if (this.client) {
        this.client.disconnect();
      }

      // Clear session
      this.currentSession = null;
      this.saveSession(null);

      console.log(chalk.green('✅ Successfully logged out'));

    } catch (error) {
      console.log(chalk.yellow('⚠️  Logout completed with warnings'));
    }
  }

  /**
   * Get session status for display
   */
  getSessionStatus(): string {
    if (!this.isAuthenticated()) {
      return chalk.red('❌ Not authenticated');
    }

    if (this.currentSession) {
      const timeLeft = this.currentSession.expiresAt - Date.now();
      const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
      return chalk.green(`✅ Authenticated (${hoursLeft}h remaining)`);
    }

    return chalk.yellow('⚠️  Session status unknown');
  }

  /**
   * Refresh session if needed
   */
  async refreshSession(): Promise<boolean> {
    if (this.isAuthenticated()) {
      return true;
    }

    console.log(chalk.yellow('\n🔄 Session expired, re-authenticating...'));
    return await this.authenticate();
  }
}
