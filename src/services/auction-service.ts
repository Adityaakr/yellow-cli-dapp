import fs from 'fs';
import path from 'path';
import os from 'os';
import { ethers } from 'ethers';
import chalk from 'chalk';
import { NitroliteClient } from './nitrolite-client.js';
import { WalletManager } from './wallet-manager.js';
import { formatUSDC } from '../utils/crypto.js';

export interface AuctionItem {
  id: string;
  title: string;
  description: string;
  category: 'digital_art' | 'nft' | 'collectible' | 'other';
  seller: string;
  startingPrice: string; // USDC in wei (6 decimals)
  currentBid: string;
  currentBidder: string | null;
  endTime: number;
  status: 'active' | 'ended' | 'settled';
  channelId: string;
  appSessionId?: string;
  createdAt: number;
  bids: Array<{
    bidder: string;
    amount: string;
    timestamp: number;
  }>;
}

export interface CreateAuctionParams {
  title: string;
  description: string;
  category: 'digital_art' | 'nft' | 'collectible' | 'other';
  startingPrice: string; // USDC amount like "0.1"
  duration: number; // hours
}

export class AuctionService {
  private auctionsFile: string;
  private client: NitroliteClient;
  private walletManager: WalletManager;

  constructor(client: NitroliteClient) {
    this.client = client;
    this.walletManager = new WalletManager();
    
    const homeDir = os.homedir();
    const yellowDir = path.join(homeDir, '.yellow-cli');
    this.auctionsFile = path.join(yellowDir, 'auctions.json');
    this.ensureAuctionsFileExists();
  }

  /**
   * Ensure auctions file exists
   */
  private ensureAuctionsFileExists(): void {
    const dir = path.dirname(this.auctionsFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.auctionsFile)) {
      fs.writeFileSync(this.auctionsFile, JSON.stringify([], null, 2));
    }
  }

  /**
   * Load auctions from file
   */
  private loadAuctions(): AuctionItem[] {
    try {
      const data = fs.readFileSync(this.auctionsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  /**
   * Save auctions to file
   */
  private saveAuctions(auctions: AuctionItem[]): void {
    try {
      fs.writeFileSync(this.auctionsFile, JSON.stringify(auctions, null, 2));
    } catch (error) {
      console.log(chalk.yellow('Warning: Could not save auctions'));
    }
  }

  /**
   * Convert USDC amount to wei (6 decimals)
   */
  private usdcToWei(amount: string): string {
    return ethers.parseUnits(amount, 6).toString();
  }

  /**
   * Find user's USDC channel or use shared auction channel
   */
  async findUSDCChannel(forAuctionId?: string): Promise<string> {
    const walletInfo = await this.walletManager.getWalletInfo();
    
    // If this is for bidding on an existing auction, use the auction's channel
    if (forAuctionId) {
      const auctions = this.loadAuctions();
      const auction = auctions.find(a => a.id === forAuctionId);
      if (auction) {
        console.log(chalk.cyan('🔗 Using auction channel for bidding: ' + auction.channelId.slice(0, 10) + '...'));
        return auction.channelId;
      }
    }

    try {
      // First try to get channels from ClearNode
      const channels = await this.client.getChannels();
      
      // Look for USDC channel on Polygon
      const usdcChannel = channels.find((channel: any) => {
        return channel.status === 'open' && 
               channel.balance && 
               BigInt(channel.balance) > 0;
      });

      if (usdcChannel) {
        console.log(chalk.green('✅ Found USDC channel from ClearNode'));
        return usdcChannel.id;
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️  Could not fetch channels from ClearNode, using known channel'));
    }

    // Fallback: Use the known USDC channel ID from the UI
    // This is the original seller's channel with 1.5 USDC on Polygon
    const knownChannelId = '0xe62f329f378270cFf1b9f619d8c29f3c8e78117e';
    
    console.log(chalk.cyan('🔗 Using shared USDC channel: ' + knownChannelId.slice(0, 10) + '...'));
    console.log(chalk.yellow('💡 Note: All participants use the same state channel for this auction'));
    return knownChannelId;
  }

  /**
   * Create a new auction
   */
  async createAuction(params: CreateAuctionParams): Promise<string> {
    const walletInfo = await this.walletManager.getWalletInfo();
    if (!walletInfo) {
      throw new Error('No wallet found. Create a wallet first.');
    }

    // Find USDC channel
    const channelId = await this.findUSDCChannel();

    const auctionId = `auction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startingPriceWei = this.usdcToWei(params.startingPrice);
    const endTime = Date.now() + (params.duration * 60 * 60 * 1000); // Convert hours to ms

    const auction: AuctionItem = {
      id: auctionId,
      title: params.title,
      description: params.description,
      category: params.category,
      seller: walletInfo.address,
      startingPrice: startingPriceWei,
      currentBid: startingPriceWei,
      currentBidder: null,
      endTime,
      status: 'active',
      channelId,
      createdAt: Date.now(),
      bids: []
    };

    // Create app session for the auction using submit_app_state
    try {
      const appSessionRequest = await this.client.createSignedRequest('submit_app_state', [{
        channel_id: channelId,
        app_data: {
          auction_id: auctionId,
          seller: walletInfo.address,
          starting_price: startingPriceWei,
          current_bid: startingPriceWei,
          end_time: endTime,
          status: 'active'
        },
        allocations: [
          {
            participant: walletInfo.address,
            asset: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // USDC on Polygon
            amount: '0' // Seller starts with 0 as they're selling the item
          }
        ]
      }]);

      auction.appSessionId = auctionId; // Use auction ID as session reference

    } catch (error) {
      console.log(chalk.yellow('Warning: Could not create on-chain session, auction will be local only'));
    }

    // Save auction
    const auctions = this.loadAuctions();
    auctions.push(auction);
    this.saveAuctions(auctions);

    return auctionId;
  }

  /**
   * Place a bid on an auction
   */
  async placeBid(auctionId: string, bidAmount: string): Promise<boolean> {
    const walletInfo = await this.walletManager.getWalletInfo();
    if (!walletInfo) {
      throw new Error('No wallet found. Create a wallet first.');
    }

    const auctions = this.loadAuctions();
    const auctionIndex = auctions.findIndex(a => a.id === auctionId);
    
    if (auctionIndex === -1) {
      throw new Error('Auction not found');
    }

    const auction = auctions[auctionIndex];
    
    if (auction.status !== 'active') {
      throw new Error('Auction is not active');
    }

    if (Date.now() > auction.endTime) {
      throw new Error('Auction has ended');
    }

    // Prevent self-bidding
    if (auction.seller.toLowerCase() === walletInfo.address.toLowerCase()) {
      throw new Error('Cannot bid on your own auction. Create a separate wallet to test bidding.');
    }

    const bidAmountWei = this.usdcToWei(bidAmount);
    
    if (BigInt(bidAmountWei) <= BigInt(auction.currentBid)) {
      throw new Error(`Bid must be higher than current bid of $${formatUSDC(BigInt(auction.currentBid))}`);
    }

    // Submit bid using submit_app_state with updated allocations
    try {
      await this.client.createSignedRequest('submit_app_state', [{
        channel_id: auction.channelId,
        app_data: {
          auction_id: auctionId,
          seller: auction.seller,
          current_bid: bidAmountWei,
          current_bidder: walletInfo.address,
          end_time: auction.endTime,
          status: 'active'
        },
        allocations: [
          {
            participant: auction.seller,
            asset: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // USDC on Polygon
            amount: '0' // Seller still has 0 during bidding
          },
          {
            participant: walletInfo.address,
            asset: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // USDC on Polygon
            amount: bidAmountWei // Bidder commits their bid amount
          }
        ]
      }]);

    } catch (error) {
      console.log(chalk.yellow('Warning: Could not submit on-chain bid, updating local state only'));
    }

    // Update auction state
    auction.currentBid = bidAmountWei;
    auction.currentBidder = walletInfo.address;
    auction.bids.push({
      bidder: walletInfo.address,
      amount: bidAmountWei,
      timestamp: Date.now()
    });

    auctions[auctionIndex] = auction;
    this.saveAuctions(auctions);

    return true;
  }

  /**
   * Get all bids for an auction
   */
  async getAuctionBids(auctionId: string): Promise<Array<{bidder: string, amount: string, timestamp: number}>> {
    const auctions = this.loadAuctions();
    const auction = auctions.find(a => a.id === auctionId);
    
    if (!auction) {
      throw new Error('Auction not found');
    }

    return auction.bids || [];
  }

  /**
   * Get all bids across all auctions
   */
  async getAllBids(): Promise<Array<{auctionId: string, auctionTitle: string, bidder: string, amount: string, timestamp: number}>> {
    const auctions = this.loadAuctions();
    const allBids: Array<{auctionId: string, auctionTitle: string, bidder: string, amount: string, timestamp: number}> = [];

    auctions.forEach(auction => {
      if (auction.bids && auction.bids.length > 0) {
        auction.bids.forEach(bid => {
          allBids.push({
            auctionId: auction.id,
            auctionTitle: auction.title,
            bidder: bid.bidder,
            amount: bid.amount,
            timestamp: bid.timestamp
          });
        });
      }
    });

    // Sort by timestamp (newest first)
    return allBids.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Check if auction has expired
   */
  isAuctionExpired(auction: AuctionItem): boolean {
    return Date.now() > auction.endTime;
  }

  /**
   * Update expired auctions status
   */
  updateExpiredAuctions(): void {
    const auctions = this.loadAuctions();
    let updated = false;

    auctions.forEach(auction => {
      if (auction.status === 'active' && this.isAuctionExpired(auction)) {
        auction.status = 'ended';
        updated = true;
      }
    });

    if (updated) {
      this.saveAuctions(auctions);
    }
  }

  /**
   * Settle an auction (seller only)
   */
  async settleAuction(auctionId: string): Promise<boolean> {
    const walletInfo = await this.walletManager.getWalletInfo();
    if (!walletInfo) {
      throw new Error('No wallet found');
    }

    const auctions = this.loadAuctions();
    const auctionIndex = auctions.findIndex(a => a.id === auctionId);
    
    if (auctionIndex === -1) {
      throw new Error('Auction not found');
    }

    const auction = auctions[auctionIndex];
    
    if (auction.seller !== walletInfo.address) {
      throw new Error('Only the seller can settle the auction');
    }

    if (auction.status !== 'active') {
      throw new Error('Auction is not active');
    }

    if (!auction.currentBidder) {
      throw new Error('No bids to settle');
    }

    // Settle using submit_app_state with final allocations
    try {
      await this.client.createSignedRequest('submit_app_state', [{
        channel_id: auction.channelId,
        app_data: {
          auction_id: auctionId,
          seller: auction.seller,
          winner: auction.currentBidder,
          final_price: auction.currentBid,
          status: 'settled'
        },
        allocations: [
          {
            participant: auction.seller,
            asset: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // USDC on Polygon
            amount: auction.currentBid // Seller receives the winning bid
          },
          {
            participant: auction.currentBidder,
            asset: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // USDC on Polygon
            amount: '0' // Winner's funds are transferred to seller
          }
        ]
      }]);

    } catch (error) {
      console.log(chalk.yellow('Warning: Could not submit on-chain settlement, updating local state only'));
    }

    // Update auction status
    auction.status = 'settled';
    auctions[auctionIndex] = auction;
    this.saveAuctions(auctions);

    return true;
  }

  /**
   * Get all auctions
   */
  getAuctions(): AuctionItem[] {
    return this.loadAuctions();
  }

  /**
   * Get active auctions
   */
  getActiveAuctions(): AuctionItem[] {
    const auctions = this.loadAuctions();
    return auctions.filter(a => a.status === 'active' && Date.now() < a.endTime);
  }

  /**
   * Get auction by ID
   */
  getAuction(auctionId: string): AuctionItem | null {
    const auctions = this.loadAuctions();
    return auctions.find(a => a.id === auctionId) || null;
  }

  /**
   * Get user's auctions (as seller)
   */
  async getUserAuctions(): Promise<AuctionItem[]> {
    const walletInfo = await this.walletManager.getWalletInfo();
    if (!walletInfo) return [];

    const auctions = this.loadAuctions();
    return auctions.filter(a => a.seller === walletInfo.address);
  }

  /**
   * Get user's bids
   */
  async getUserBids(): Promise<AuctionItem[]> {
    const walletInfo = await this.walletManager.getWalletInfo();
    if (!walletInfo) return [];

    const auctions = this.loadAuctions();
    return auctions.filter(a => 
      a.bids.some(bid => bid.bidder === walletInfo.address)
    );
  }
}
