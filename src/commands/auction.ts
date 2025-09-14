import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { NitroliteClient } from '../services/nitrolite-client.js';
import { WalletManager } from '../services/wallet-manager.js';
import { AuctionService, type CreateAuctionParams } from '../services/auction-service.js';
import { formatUSDC } from '../utils/crypto.js';
import { CONFIG } from '../config/index.js';

export class AuctionCommands {
  private client: NitroliteClient;
  private walletManager: WalletManager;
  private auctionService: AuctionService;

  constructor() {
    this.client = new NitroliteClient(CONFIG.CLEARNODE_URL);
    this.walletManager = new WalletManager();
    this.auctionService = new AuctionService(this.client);
  }

  /**
   * Initialize connection and authentication
   */
  private async initializeConnection(): Promise<void> {
    const spinner = ora('Initializing wallet...').start();
    
    try {
      const keypair = await this.walletManager.loadOrCreateWallet();
      await this.client.initialize(keypair);
      spinner.succeed('Wallet initialized');

      spinner.text = 'Connecting to ClearNode...';
      await this.client.connect();
      spinner.succeed('Connected to ClearNode');
    } catch (error) {
      spinner.fail(`Connection failed: ${error}`);
      throw error;
    }
  }

  /**
   * Create a new auction
   */
  async createAuction(): Promise<void> {
    console.log(chalk.blue.bold('\n🎨 Create Digital Art Auction\n'));

    try {
      await this.initializeConnection();

      // Check for USDC channel
      const spinner = ora('Checking for USDC channel...').start();
      const channelId = await this.auctionService.findUSDCChannel();
      
      if (!channelId) {
        spinner.fail('No active USDC channel found');
        console.log(chalk.red('❌ You need an active USDC channel to create auctions.'));
        console.log(chalk.gray('Please create a channel with USDC balance first.'));
        return;
      }
      
      spinner.succeed(`Found USDC channel: ${channelId}`);

      // Get auction details
      const answers = await inquirer.prompt([
        {
          type: 'input',
          name: 'title',
          message: 'Auction title:',
          validate: (input) => input.trim().length > 0 || 'Title is required'
        },
        {
          type: 'input',
          name: 'description',
          message: 'Description:',
          validate: (input) => input.trim().length > 0 || 'Description is required'
        },
        {
          type: 'list',
          name: 'category',
          message: 'Category:',
          choices: [
            { name: '🎨 Digital Art', value: 'digital_art' },
            { name: '🖼️  NFT', value: 'nft' },
            { name: '💎 Collectible', value: 'collectible' },
            { name: '📦 Other', value: 'other' }
          ]
        },
        {
          type: 'input',
          name: 'startingPrice',
          message: 'Starting price (USDC):',
          validate: (input) => {
            const num = parseFloat(input);
            if (isNaN(num) || num <= 0) return 'Please enter a valid price';
            if (num > 1.5) return 'Starting price cannot exceed your channel balance (1.5 USDC)';
            return true;
          }
        },
        {
          type: 'list',
          name: 'duration',
          message: 'Auction duration:',
          choices: [
            { name: '30 minutes', value: 0.5 },
            { name: '2 hours', value: 2 },
            { name: '1 day', value: 24 },
            { name: '3 days', value: 72 },
            { name: 'Custom', value: 'custom' }
          ]
        }
      ]);

      let duration = answers.duration;
      if (duration === 'custom') {
        const customDuration = await inquirer.prompt([
          {
            type: 'input',
            name: 'hours',
            message: 'Duration in hours:',
            validate: (input) => {
              const num = parseFloat(input);
              return !isNaN(num) && num > 0 || 'Please enter a valid number of hours';
            }
          }
        ]);
        duration = parseFloat(customDuration.hours);
      }

      const createSpinner = ora('Creating auction...').start();
      
      const auctionParams: CreateAuctionParams = {
        title: answers.title,
        description: answers.description,
        category: answers.category,
        startingPrice: answers.startingPrice,
        duration: duration
      };

      const auctionId = await this.auctionService.createAuction(auctionParams);
      createSpinner.succeed('Auction created successfully!');

      console.log(chalk.green('\n✅ Auction Created!'));
      console.log(`ID: ${chalk.cyan(auctionId)}`);
      console.log(`Title: ${chalk.white(answers.title)}`);
      console.log(`Starting Price: ${chalk.yellow('$' + answers.startingPrice)} USDC`);
      console.log(`Duration: ${chalk.blue(duration + ' hours')}`);
      console.log(`Channel: ${chalk.gray(channelId)}`);

    } catch (error) {
      console.error(chalk.red(`\n❌ Error creating auction: ${error}`));
    } finally {
      this.client.disconnect();
    }
  }

  /**
   * List active auctions
   */
  async listAuctions(): Promise<void> {
    console.log(chalk.blue.bold('\n🏛️  Active Auctions\n'));

    try {
      const auctions = this.auctionService.getActiveAuctions();
      
      if (auctions.length === 0) {
        console.log(chalk.gray('No active auctions found.'));
        console.log(chalk.gray('Use "auction create" to create a new auction.'));
        return;
      }

      auctions.forEach((auction, index) => {
        const timeLeft = auction.endTime - Date.now();
        const hoursLeft = Math.max(0, Math.floor(timeLeft / (60 * 60 * 1000)));
        const minutesLeft = Math.max(0, Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000)));
        
        console.log(chalk.white(`\n${index + 1}. ${auction.title}`));
        console.log(`   ${chalk.gray('ID:')} ${chalk.cyan(auction.id)}`);
        console.log(`   ${chalk.gray('Category:')} ${auction.category.replace('_', ' ')}`);
        console.log(`   ${chalk.gray('Description:')} ${auction.description}`);
        console.log(`   ${chalk.gray('Current Bid:')} ${chalk.yellow('$' + formatUSDC(BigInt(auction.currentBid)))} USDC`);
        
        if (auction.currentBidder) {
          console.log(`   ${chalk.gray('Leading Bidder:')} ${chalk.blue(auction.currentBidder.slice(0, 8))}...`);
        } else {
          console.log(`   ${chalk.gray('Leading Bidder:')} ${chalk.gray('None')}`);
        }
        
        console.log(`   ${chalk.gray('Time Left:')} ${chalk.green(hoursLeft + 'h ' + minutesLeft + 'm')}`);
        console.log(`   ${chalk.gray('Seller:')} ${chalk.blue(auction.seller.slice(0, 8))}...`);
      });

    } catch (error) {
      console.error(chalk.red(`\n❌ Error listing auctions: ${error}`));
    }
  }

  /**
   * Place a bid on an auction
   */
  async placeBid(): Promise<void> {
    console.log(chalk.blue.bold('\n💰 Place Bid\n'));

    try {
      await this.initializeConnection();

      const auctions = this.auctionService.getActiveAuctions();
      
      if (auctions.length === 0) {
        console.log(chalk.gray('No active auctions available for bidding.'));
        return;
      }

      const auctionChoices = auctions.map(auction => ({
        name: `${auction.title} - Current: $${formatUSDC(BigInt(auction.currentBid))} USDC`,
        value: auction.id
      }));

      const { auctionId } = await inquirer.prompt([
        {
          type: 'list',
          name: 'auctionId',
          message: 'Select auction to bid on:',
          choices: auctionChoices
        }
      ]);

      const selectedAuction = auctions.find(a => a.id === auctionId)!;
      const currentBidUSDC = formatUSDC(BigInt(selectedAuction.currentBid));
      
      console.log(chalk.white(`\n📋 Auction: ${selectedAuction.title}`));
      console.log(`Current bid: ${chalk.yellow('$' + currentBidUSDC)} USDC`);
      
      const { bidAmount } = await inquirer.prompt([
        {
          type: 'input',
          name: 'bidAmount',
          message: `Your bid (must be > $${currentBidUSDC} USDC):`,
          validate: (input) => {
            const num = parseFloat(input);
            if (isNaN(num) || num <= 0) return 'Please enter a valid bid amount';
            if (num <= parseFloat(currentBidUSDC)) return `Bid must be higher than $${currentBidUSDC}`;
            if (num > 1.5) return 'Bid cannot exceed your channel balance (1.5 USDC)';
            return true;
          }
        }
      ]);

      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Confirm bid of $${bidAmount} USDC?`,
          default: false
        }
      ]);

      if (!confirm) {
        console.log(chalk.gray('Bid cancelled.'));
        return;
      }

      const bidSpinner = ora('Placing bid...').start();
      
      const success = await this.auctionService.placeBid(auctionId, bidAmount);
      
      if (success) {
        bidSpinner.succeed('Bid placed successfully!');
        console.log(chalk.green('\n✅ Bid Placed!'));
        console.log(`Amount: ${chalk.yellow('$' + bidAmount)} USDC`);
        console.log(`Auction: ${chalk.white(selectedAuction.title)}`);
      } else {
        bidSpinner.fail('Failed to place bid');
      }

    } catch (error) {
      console.error(chalk.red(`\n❌ Error placing bid: ${error}`));
    } finally {
      this.client.disconnect();
    }
  }

  /**
   * Watch an auction in real-time
   */
  async watchAuction(): Promise<void> {
    console.log(chalk.blue.bold('\n👀 Watch Auction\n'));

    try {
      const auctions = this.auctionService.getActiveAuctions();
      
      if (auctions.length === 0) {
        console.log(chalk.gray('No active auctions to watch.'));
        return;
      }

      const auctionChoices = auctions.map(auction => ({
        name: `${auction.title} - $${formatUSDC(BigInt(auction.currentBid))} USDC`,
        value: auction.id
      }));

      const { auctionId } = await inquirer.prompt([
        {
          type: 'list',
          name: 'auctionId',
          message: 'Select auction to watch:',
          choices: auctionChoices
        }
      ]);

      const auction = auctions.find(a => a.id === auctionId)!;
      
      console.log(chalk.green('\n🔴 Watching auction live (Press Ctrl+C to exit)\n'));
      console.log(chalk.white(`📋 ${auction.title}`));
      console.log(chalk.gray(`${auction.description}\n`));

      // Simple polling for updates (in a real app, you'd use WebSocket)
      const watchInterval = setInterval(() => {
        const updatedAuction = this.auctionService.getAuction(auctionId);
        if (updatedAuction) {
          const timeLeft = updatedAuction.endTime - Date.now();
          const hoursLeft = Math.max(0, Math.floor(timeLeft / (60 * 60 * 1000)));
          const minutesLeft = Math.max(0, Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000)));
          
          console.clear();
          console.log(chalk.green('🔴 Watching auction live (Press Ctrl+C to exit)\n'));
          console.log(chalk.white(`📋 ${updatedAuction.title}`));
          console.log(chalk.gray(`${updatedAuction.description}\n`));
          console.log(`${chalk.gray('Current Bid:')} ${chalk.yellow('$' + formatUSDC(BigInt(updatedAuction.currentBid)))} USDC`);
          
          if (updatedAuction.currentBidder) {
            console.log(`${chalk.gray('Leading Bidder:')} ${chalk.blue(updatedAuction.currentBidder.slice(0, 8))}...`);
          } else {
            console.log(`${chalk.gray('Leading Bidder:')} ${chalk.gray('None')}`);
          }
          
          console.log(`${chalk.gray('Time Left:')} ${chalk.green(hoursLeft + 'h ' + minutesLeft + 'm')}`);
          console.log(`${chalk.gray('Total Bids:')} ${chalk.blue(updatedAuction.bids.length)}`);
          
          if (timeLeft <= 0) {
            console.log(chalk.red('\n⏰ Auction has ended!'));
            clearInterval(watchInterval);
          }
        }
      }, 5000); // Update every 5 seconds

      // Handle Ctrl+C
      process.on('SIGINT', () => {
        clearInterval(watchInterval);
        console.log(chalk.yellow('\n\n👋 Stopped watching auction'));
        process.exit(0);
      });

    } catch (error) {
      console.error(chalk.red(`\n❌ Error watching auction: ${error}`));
    }
  }

  /**
   * View all bids across auctions
   */
  async viewAllBids(): Promise<void> {
    console.log(chalk.blue.bold('\n📊 All Auction Bids\n'));

    try {
      const allBids = await this.auctionService.getAllBids();
      
      if (allBids.length === 0) {
        console.log(chalk.gray('No bids have been placed yet.'));
        return;
      }

      console.log(chalk.cyan(`Found ${allBids.length} bid(s) across all auctions:\n`));

      allBids.forEach((bid, index) => {
        const timeAgo = this.formatTimeAgo(bid.timestamp);
        const amount = formatUSDC(BigInt(bid.amount));
        
        console.log(`${chalk.yellow(`${index + 1}.`)} ${chalk.white(bid.auctionTitle)}`);
        console.log(`   💰 Bid: ${chalk.green('$' + amount)} USDC`);
        console.log(`   👤 Bidder: ${chalk.blue(bid.bidder.slice(0, 10) + '...')}`);
        console.log(`   🕒 ${timeAgo}\n`);
      });

    } catch (error) {
      console.error(chalk.red('❌ Error fetching bids:'), error);
    }
  }

  /**
   * View bids for a specific auction
   */
  async viewAuctionBids(): Promise<void> {
    console.log(chalk.blue.bold('\n📋 Auction Bids\n'));

    try {
      const auctions = await this.auctionService.getUserAuctions();
      
      if (auctions.length === 0) {
        console.log(chalk.gray('No auctions found.'));
        return;
      }

      const auctionChoices = auctions.map(auction => ({
        name: `${auction.title} - ${auction.bids?.length || 0} bid(s)`,
        value: auction.id
      }));

      const { auctionId } = await inquirer.prompt([
        {
          type: 'list',
          name: 'auctionId',
          message: 'Select auction to view bids:',
          choices: auctionChoices
        }
      ]);

      const auction = auctions.find(a => a.id === auctionId)!;
      const bids = await this.auctionService.getAuctionBids(auctionId);

      console.log(chalk.cyan(`\n📋 ${auction.title}`));
      console.log(`Status: ${auction.status === 'active' ? '🟢 Active' : auction.status === 'ended' ? '🔴 Ended' : '✅ Settled'}`);
      
      if (bids.length === 0) {
        console.log(chalk.gray('\nNo bids placed on this auction yet.'));
        return;
      }

      console.log(chalk.cyan(`\n${bids.length} bid(s) placed:\n`));

      bids.forEach((bid, index) => {
        const timeAgo = this.formatTimeAgo(bid.timestamp);
        const amount = formatUSDC(BigInt(bid.amount));
        const isWinning = bid.amount === auction.currentBid;
        
        console.log(`${chalk.yellow(`${index + 1}.`)} ${isWinning ? '🏆 ' : ''}${chalk.green('$' + amount)} USDC`);
        console.log(`   👤 ${chalk.blue(bid.bidder.slice(0, 10) + '...')}`);
        console.log(`   🕒 ${timeAgo}${isWinning ? ' (Winning bid)' : ''}\n`);
      });

    } catch (error) {
      console.error(chalk.red('❌ Error fetching auction bids:'), error);
    }
  }

  /**
   * Format timestamp to relative time
   */
  private formatTimeAgo(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  }

  /**
   * Settle an auction (seller only)
   */
  async settleAuction(): Promise<void> {
    console.log(chalk.blue.bold('\n⚖️  Settle Auction\n'));

    try {
      await this.initializeConnection();

      const userAuctions = await this.auctionService.getUserAuctions();
      const settlableAuctions = userAuctions.filter(a => 
        a.status === 'active' && a.currentBidder && Date.now() > a.endTime
      );
      
      if (settlableAuctions.length === 0) {
        console.log(chalk.gray('No auctions available for settlement.'));
        console.log(chalk.gray('Only ended auctions with bids can be settled.'));
        return;
      }

      const auctionChoices = settlableAuctions.map(auction => ({
        name: `${auction.title} - Winner: $${formatUSDC(BigInt(auction.currentBid))} USDC`,
        value: auction.id
      }));

      const { auctionId } = await inquirer.prompt([
        {
          type: 'list',
          name: 'auctionId',
          message: 'Select auction to settle:',
          choices: auctionChoices
        }
      ]);

      const auction = settlableAuctions.find(a => a.id === auctionId)!;
      
      console.log(chalk.white(`\n📋 Settling: ${auction.title}`));
      console.log(`Winner: ${chalk.blue(auction.currentBidder!.slice(0, 8))}...`);
      console.log(`Final Price: ${chalk.yellow('$' + formatUSDC(BigInt(auction.currentBid)))} USDC`);

      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Confirm settlement? This will transfer funds to you.',
          default: false
        }
      ]);

      if (!confirm) {
        console.log(chalk.gray('Settlement cancelled.'));
        return;
      }

      const settleSpinner = ora('Settling auction...').start();
      
      const success = await this.auctionService.settleAuction(auctionId);
      
      if (success) {
        settleSpinner.succeed('Auction settled successfully!');
        console.log(chalk.green('\n✅ Auction Settled!'));
        console.log(`You received: ${chalk.yellow('$' + formatUSDC(BigInt(auction.currentBid)))} USDC`);
        console.log(`Winner: ${chalk.blue(auction.currentBidder!)}`);
      } else {
        settleSpinner.fail('Failed to settle auction');
      }

    } catch (error) {
      console.error(chalk.red(`\n❌ Error settling auction: ${error}`));
    } finally {
      this.client.disconnect();
    }
  }
}

/**
 * Register auction commands
 */
export function registerAuctionCommands(program: Command): void {
  const auctionCommands = new AuctionCommands();

  const auction = program
    .command('auction')
    .description('Digital art auction operations');

  auction
    .command('create')
    .description('Create a new digital art auction')
    .action(() => auctionCommands.createAuction());

  auction
    .command('list')
    .description('List active auctions')
    .action(() => auctionCommands.listAuctions());

  auction
    .command('bid')
    .description('Place a bid on an auction')
    .action(() => auctionCommands.placeBid());

  auction
    .command('watch')
    .description('Watch an auction in real-time')
    .action(() => auctionCommands.watchAuction());

  auction
    .command('settle')
    .description('Settle an auction (seller only)')
    .action(() => auctionCommands.settleAuction());

  auction
    .command('bids')
    .description('View all bids across auctions')
    .action(() => auctionCommands.viewAllBids());

  auction
    .command('auction-bids')
    .description('View bids for a specific auction')
    .action(() => auctionCommands.viewAuctionBids());
}
