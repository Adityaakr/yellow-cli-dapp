import WebSocket from 'ws';
import { ethers } from 'ethers';
import {
  createAuthVerifyMessage,
  createEIP712AuthMessageSigner,
  createGetChannelsMessage,
  createGetLedgerBalancesMessage,
  generateRequestId,
  getCurrentTimestamp,
  parseAnyRPCResponse,
  RPCMethod,
  type AuthChallengeResponse,
} from '@erc7824/nitrolite';
import { createEthersSigner, generateKeyPair, type CryptoKeypair, type WalletSigner } from '../utils/crypto.js';
import { CONFIG, AUTH_TYPES } from '../config/index.js';
import chalk from 'chalk';

export enum WSStatus {
  CONNECTED = "connected",
  CONNECTING = "connecting",
  DISCONNECTED = "disconnected",
  RECONNECTING = "reconnecting",
  RECONNECT_FAILED = "reconnect_failed",
  AUTH_FAILED = "auth_failed",
  AUTHENTICATING = "authenticating"
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

export class NitroliteClient {
  private url: string;
  private ws: WebSocket | null = null;
  private status: WSStatus = WSStatus.DISCONNECTED;
  private keypair: CryptoKeypair | null = null;
  private signer: WalletSigner | null = null;
  private sessionKeypair: CryptoKeypair | null = null;
  private sessionSigner: WalletSigner | null = null;
  private pendingRequests = new Map<number, PendingRequest>();
  private nextRequestId = 1;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private messageHandlers = new Map<string, (message: any) => void>();
  private isAuthenticated = false;

  constructor(url: string) {
    this.url = url;
  }

  /**
   * Initialize the client with a keypair
   */
  async initialize(keypair: CryptoKeypair): Promise<void> {
    this.keypair = keypair;
    this.signer = createEthersSigner(keypair.privateKey);
    console.log(chalk.blue(`🔑 Initialized with address: ${this.signer.address}`));

    // Generate a session keypair for authentication (separate from wallet)
    this.sessionKeypair = await generateKeyPair();
    this.sessionSigner = createEthersSigner(this.sessionKeypair.privateKey);
    console.log(chalk.cyan(`🔑 Generated session key: ${this.sessionSigner.address}`));
  }

  /**
   * Connect to the ClearNode
   */
  async connect(): Promise<void> {
    if (!this.keypair || !this.signer) {
      throw new Error('Client not initialized. Call initialize() first.');
    }

    return new Promise((resolve, reject) => {
      this.status = WSStatus.CONNECTING;
      console.log(chalk.yellow('🔌 Connecting to ClearNode...'));

      this.ws = new WebSocket(this.url);

      this.ws.onopen = async () => {
        console.log(chalk.green('✅ WebSocket connected'));
        this.status = WSStatus.CONNECTED;
        
        try {
          await this.authenticate();
          resolve();
        } catch (error) {
          reject(error);
        }
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data.toString());
      };

      this.ws.onerror = (error) => {
        console.error(chalk.red('❌ WebSocket error:'), error);
        this.status = WSStatus.DISCONNECTED;
        reject(error);
      };

      this.ws.onclose = () => {
        this.status = WSStatus.DISCONNECTED;
        this.isAuthenticated = false;
      };
    });
  }

  /**
   * Authenticate with ClearNode using simplified approach
   */
  private async authenticate(): Promise<void> {
    if (this.isAuthenticated) return;

    console.log(chalk.yellow('🔐 Starting authentication...'));

    const expire = String(Math.floor(Date.now() / 1000) + 24 * 60 * 60);
    const signerAddress = this.signer?.address;
    if (!signerAddress || !this.keypair) throw new Error('Signer or keypair not available');
    
    // Create auth request in ClearNode's expected format directly
    const requestId = generateRequestId();
    const timestamp = getCurrentTimestamp();
    
    const walletAddress = signerAddress; // Use the main wallet address
    const sessionAddress = this.sessionSigner!.address;
    
    const authRequestData = {
      address: walletAddress,
      session_key: sessionAddress,
      app_name: CONFIG.APP_NAME,
      expire: expire,
      scope: CONFIG.SCOPE,
      application: walletAddress,
      allowances: []
    };

    // Create the request in ClearNode JSON-RPC format
    const authRequest = {
      req: [requestId, "auth_request", authRequestData, timestamp],
      sig: [] as string[]
    };

    // Sign the request using the current wallet's private key
    const realWallet = new ethers.Wallet(this.keypair.privateKey);
    const reqString = JSON.stringify(authRequest.req);
    const signature = await realWallet.signMessage(reqString);
    authRequest.sig = [signature];

    console.log(chalk.cyan('📤 Sending auth request:'), JSON.stringify(authRequest, null, 2));
    this.send(JSON.stringify(authRequest));

    return new Promise((resolve, reject) => {
      const handleAuthResponse = async (data: any) => {
        try {
          console.log(chalk.cyan('📥 Raw auth response:'), JSON.stringify(data, null, 2));
          
          // Handle raw ClearNode response format
          let response;
          try {
            response = parseAnyRPCResponse(JSON.stringify(data));
          } catch (parseError) {
            console.log(chalk.yellow('⚠️  Failed to parse with Nitrolite parser, handling raw response'));
            
            // Handle assets message (acknowledge but continue)
            if (data.res && Array.isArray(data.res) && data.res[1] === 'assets') {
              console.log(chalk.cyan('📋 Received assets list from ClearNode'));
              return; // Continue waiting for auth_challenge
            }
            
            // Handle raw ClearNode format directly
            if (data.res && Array.isArray(data.res) && data.res[1] === 'auth_challenge') {
              console.log(chalk.blue('🔑 Received auth challenge (raw format)'));
              
              const challengeMessage = data.res[2].challenge_message;
              
              // Create auth_verify request in ClearNode format directly
              const verifyRequestId = generateRequestId();
              const verifyTimestamp = getCurrentTimestamp();
              
              if (!this.keypair?.privateKey) {
                throw new Error('Private key not available');
              }
              
              // Create the auth_verify request payload
              const authVerifyData = {
                challenge: challengeMessage
              };

              const authVerifyRequest = {
                req: [verifyRequestId, "auth_verify", authVerifyData, verifyTimestamp],
                sig: [] as string[]
              };

              // Create EIP-712 signature using the current wallet's private key
              const wallet = new ethers.Wallet(this.keypair.privateKey.startsWith('0x') ? this.keypair.privateKey : `0x${this.keypair.privateKey}`);
              
              // EIP-712 domain for ClearNode (using app name as domain)
              const domain = {
                name: CONFIG.APP_NAME, // Use app name as domain name
              };

              // EIP-712 types exactly as specified in ClearNode documentation
              const types = {
                Policy: [
                  { name: 'challenge', type: 'string' },
                  { name: 'scope', type: 'string' },
                  { name: 'wallet', type: 'address' },
                  { name: 'application', type: 'address' },
                  { name: 'participant', type: 'address' },
                  { name: 'expire', type: 'uint256' },
                  { name: 'allowances', type: 'Allowance[]' }
                ],
                Allowance: [
                  { name: 'asset', type: 'string' },
                  { name: 'amount', type: 'uint256' }
                ]
              };

              // EIP-712 message with correct field types - wallet vs participant separation
              const message = {
                challenge: challengeMessage,
                scope: CONFIG.SCOPE,
                wallet: walletAddress, // Main wallet address
                application: walletAddress, // Application address (same as wallet)
                participant: sessionAddress, // Session key address (different from wallet)
                expire: parseInt(expire), // Convert to uint256
                allowances: []
              };

              console.log(chalk.cyan('🔏 EIP-712 signing with ClearNode format:'), { domain, types, message });
              
              // Use _signTypedData with primaryType specified for ethers v6
              const eip712Signature = await wallet.signTypedData(domain, types, message);
              authVerifyRequest.sig = [eip712Signature];

              console.log(chalk.cyan('📤 Sending auth verify:'), JSON.stringify(authVerifyRequest, null, 2));
              
              // Add a small delay to ensure WebSocket is ready
              await new Promise(resolve => setTimeout(resolve, 100));
              
              if (this.ws?.readyState === WebSocket.OPEN) {
                this.send(JSON.stringify(authVerifyRequest));
              } else {
                console.error(chalk.red('❌ WebSocket not ready for auth verify'));
                reject(new Error('WebSocket not ready'));
              }
              return;
            }
            
            if (data.res && Array.isArray(data.res) && data.res[1] === 'auth_verify' && data.res[2].success) {
              console.log(chalk.green('✅ Authentication successful (raw format)'));
              this.isAuthenticated = true;
              this.removeMessageHandler('auth');
              resolve();
              return;
            }
            
            if (data.res && Array.isArray(data.res) && data.res[1] === 'error') {
              console.error(chalk.red('❌ Authentication failed (raw format):'), data.res[2]);
              reject(new Error(JSON.stringify(data.res[2])));
              return;
            }
            
            throw parseError;
          }
          
          if (response.method === RPCMethod.AuthChallenge) {
            console.log(chalk.blue('🔑 Received auth challenge'));
            
            const challengeResponse = response as AuthChallengeResponse;
            
            // Create EIP-712 signer for auth verification
            const authDomain = { name: CONFIG.APP_NAME };
            const authParams = {
              scope: CONFIG.SCOPE,
              application: signerAddress as `0x${string}`,
              participant: signerAddress as `0x${string}`,
              expire: expire,
              allowances: [],
            };

            // Create wallet client for EIP-712 signing
            if (!this.keypair?.privateKey) {
              throw new Error('Private key not available');
            }
            
            const wallet = new ethers.Wallet(this.keypair.privateKey);
            const walletClient = {
              account: { address: signerAddress as `0x${string}` },
              signTypedData: async (params: any) => {
                return await wallet.signTypedData(params.domain, params.types, params.message);
              }
            };

            const eip712Signer = createEIP712AuthMessageSigner(walletClient as any, authParams, authDomain);
            const authVerifyPayload = await createAuthVerifyMessage(eip712Signer, challengeResponse);
            
            this.send(authVerifyPayload);
          } 
          else if (response.method === RPCMethod.AuthVerify && response.params?.success) {
            console.log(chalk.green('✅ Authentication successful'));
            this.isAuthenticated = true;
            this.removeMessageHandler('auth');
            resolve();
          } 
          else if (response.method === RPCMethod.Error) {
            console.error(chalk.red('❌ Authentication failed:'), response.params?.error);
            reject(new Error(response.params?.error || 'Authentication failed'));
          }
        } catch (error) {
          console.error(chalk.red('❌ Auth error:'), error);
          reject(error);
        }
      };

      this.addMessageHandler('auth', handleAuthResponse);
    });
  }

  /**
   * Send auth verify with EIP-712 signature
   */
  private async sendAuthVerify(challengeUUID: string): Promise<void> {
    try {
      const requestId = Date.now();
      const timestamp = Date.now();
      const expire = String(Math.floor(Date.now() / 1000) + 24 * 60 * 60);
      
      const message = {
        challenge: challengeUUID,
        scope: CONFIG.SCOPE,
        wallet: this.signer!.address,
        application: this.signer!.address,
        participant: this.sessionKeypair!.address,
        expire: expire,
        allowances: [],
      };

      const wallet = new ethers.Wallet(this.keypair!.privateKey);
      const domain = { name: CONFIG.APP_NAME };
      const signature = await wallet.signTypedData(domain, AUTH_TYPES, message);
      
      const authVerifyRequest = {
        req: [requestId, 'auth_verify', { challenge: challengeUUID }, timestamp],
        sig: [signature]
      };

      console.log(chalk.blue('📤 Sending auth verify:'));
      console.log(JSON.stringify(authVerifyRequest, null, 2));
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send(JSON.stringify(authVerifyRequest));
      } else {
        throw new Error('WebSocket not ready');
      }
    } catch (error) {
      console.error(chalk.red('❌ Auth verify error:'), error);
      throw error;
    }
  }

  /**
   * Send a WebSocket message
   */
  private send(message: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    } else {
      throw new Error('WebSocket not connected');
    }
  }

  /**
   * Close app session for auction settlement using Nitrolite SDK
   */
  async settleAuction(auctionId: string): Promise<any> {
    try {
      if (!this.isAuthenticated) {
        throw new Error('Not authenticated');
      }

      // Use Nitrolite SDK to close the app session
      const settleRequest = await this.createSignedRequest('close_app_session', [{
        app_session_id: auctionId,
        allocations: [
          {
            participant: this.getAddress(),
            asset: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // USDC on Polygon
            amount: '150000' // 0.15 USDC in wei (6 decimals)
          }
        ]
      }]);

      return settleRequest;
    } catch (error) {
      console.error('Settlement error:', error);
      throw error;
    }
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      
      // Handle responses to pending requests
      if (message.res && Array.isArray(message.res)) {
        const requestId = message.res[0];
        const pending = this.pendingRequests.get(requestId);
        if (pending) {
          pending.resolve(message);
          this.pendingRequests.delete(requestId);
          return;
        }
      }

      // Handle errors
      if (message.err) {
        const requestId = message.err[0];
        const pending = this.pendingRequests.get(requestId);
        if (pending) {
          pending.reject(new Error(message.err[2]));
          this.pendingRequests.delete(requestId);
          return;
        }
      }

      // Handle other message types
      this.messageHandlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error('Error in message handler:', error);
        }
      });
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  }

  /**
   * Add a message handler
   */
  addMessageHandler(id: string, handler: (message: any) => void): void {
    this.messageHandlers.set(id, handler);
  }

  /**
   * Remove a message handler
   */
  removeMessageHandler(id: string): void {
    this.messageHandlers.delete(id);
  }

  /**
   * Create a signed request
   */
  async createSignedRequest(method: string, params: unknown[] = []): Promise<any> {
    if (!this.signer) throw new Error('Signer not available');

    const requestId = this.nextRequestId++;
    const timestamp = getCurrentTimestamp();
    const requestData = [requestId, method, params, timestamp];
    const request: any = { req: requestData };

    const signature = await this.signer.sign(request);
    request.sig = [signature];

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      this.send(JSON.stringify(request));
      
      // Set timeout for request
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Get channels using ClearNode format
   */
  async getChannels(): Promise<any> {
    if (!this.signer) throw new Error('Signer not available');
    
    return new Promise((resolve, reject) => {
      const requestId = this.nextRequestId++;
      const timestamp = Date.now();
      
      // Create request in ClearNode JSON-RPC format
      const request = {
        req: [requestId, 'get_channels', [], timestamp],
        sig: [] as string[]
      };
      
      // Sign the request using ethers wallet directly
      const reqString = JSON.stringify(request.req);
      const wallet = new ethers.Wallet(this.keypair!.privateKey);
      
      wallet.signMessage(reqString).then(signature => {
        request.sig = [signature];
        
        const handler = (msg: any) => {
          // Handle ClearNode response format
          if (msg.res && Array.isArray(msg.res) && msg.res[0] === requestId && msg.res[1] === 'get_channels') {
            this.removeMessageHandler(`get_channels_${requestId}`);
            resolve(msg.res[2] || []);
          }
          // Handle error response
          if (msg.err && Array.isArray(msg.err) && msg.err[0] === requestId) {
            this.removeMessageHandler(`get_channels_${requestId}`);
            reject(new Error(`Get channels error: ${msg.err[2]}`));
          }
        };
        
        this.addMessageHandler(`get_channels_${requestId}`, handler);
        this.send(JSON.stringify(request));
        
        // Timeout after 15 seconds
        setTimeout(() => {
          this.removeMessageHandler(`get_channels_${requestId}`);
          reject(new Error('Get channels timeout'));
        }, 15000);
      }).catch(error => {
        reject(new Error(`Failed to sign get_channels request: ${error}`));
      });
    });
  }

  /**
   * Get ledger balances using ClearNode format
   */
  async getLedgerBalances(channelId: string): Promise<any> {
    if (!this.signer) throw new Error('Signer not available');
    
    return new Promise((resolve, reject) => {
      const requestId = this.nextRequestId++;
      const timestamp = Date.now();
      
      // Create request in ClearNode JSON-RPC format
      const request = {
        req: [requestId, 'get_ledger_balances', [channelId], timestamp],
        sig: [] as string[]
      };
      
      // Sign the request using ethers wallet directly
      const reqString = JSON.stringify(request.req);
      const wallet = new ethers.Wallet(this.keypair!.privateKey);
      
      wallet.signMessage(reqString).then(signature => {
        request.sig = [signature];
        
        const handler = (msg: any) => {
          // Handle ClearNode response format
          if (msg.res && Array.isArray(msg.res) && msg.res[0] === requestId && msg.res[1] === 'get_ledger_balances') {
            this.removeMessageHandler(`get_ledger_balances_${requestId}`);
            resolve(msg.res[2] || {});
          }
          // Handle error response
          if (msg.err && Array.isArray(msg.err) && msg.err[0] === requestId) {
            this.removeMessageHandler(`get_ledger_balances_${requestId}`);
            reject(new Error(`Get ledger balances error: ${msg.err[2]}`));
          }
        };
        
        this.addMessageHandler(`get_ledger_balances_${requestId}`, handler);
        this.send(JSON.stringify(request));
        
        // Timeout after 15 seconds
        setTimeout(() => {
          this.removeMessageHandler(`get_ledger_balances_${requestId}`);
          reject(new Error('Get ledger balances timeout'));
        }, 15000);
      }).catch(error => {
        reject(new Error(`Failed to sign get_ledger_balances request: ${error}`));
      });
    });
  }

  /**
   * Disconnect from the ClearNode
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.status = WSStatus.DISCONNECTED;
    this.isAuthenticated = false;
  }

  /**
   * Get connection status
   */
  getStatus(): WSStatus {
    return this.status;
  }

  /**
   * Check if authenticated
   */
  getIsAuthenticated(): boolean {
    return this.isAuthenticated;
  }

  /**
   * Get signer address
   */
  getAddress(): string | null {
    return this.signer?.address || null;
  }
}
