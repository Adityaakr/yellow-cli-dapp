import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { NitroliteClient } from '../services/nitrolite-client.js';
import { WalletManager } from '../services/wallet-manager.js';
import { formatUSDC } from '../utils/crypto.js';
import { CONFIG } from '../config/index.js';

export class ChannelCommands {
  private client: NitroliteClient;
  private walletManager: WalletManager;

  constructor() {
    this.client = new NitroliteClient(CONFIG.CLEARNODE_URL);
    this.walletManager = new WalletManager();
  }

  /**
   * Initialize connection
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
   * List all channels
   */
  async listChannels(): Promise<void> {
    console.log(chalk.blue.bold('\n🌐 State Channels\n'));

    try {
      await this.initializeConnection();

      const spinner = ora('Fetching channels...').start();
      const channels = await this.client.getChannels();
      spinner.succeed(`Found ${channels.length || 0} channels`);

      if (!channels || channels.length === 0) {
        console.log(chalk.gray('No channels found.'));
        return;
      }

      channels.forEach((channel: any, index: number) => {
        const channelId = channel.channel_id || channel.id;
        const status = channel.status;
        const amount = channel.amount;
        const token = channel.token;
        const chainId = channel.chain_id;
        
        console.log(chalk.white(`\n${index + 1}. Channel ${channelId?.slice(0, 10)}...${channelId?.slice(-6)}`));
        console.log(`   Status: ${status === 'open' ? chalk.green('Open') : chalk.red('Closed')}`);
        console.log(`   Chain: ${chalk.blue(`Polygon (${chainId})`)}`);
        console.log(`   Token: ${chalk.cyan('USDC')}`);
        if (amount) {
          console.log(`   Balance: ${chalk.yellow('$' + formatUSDC(BigInt(amount)))} USDC`);
        }
        console.log(`   Participant: ${chalk.gray(channel.participant?.slice(0, 8))}...`);
      });

    } catch (error) {
      console.error(chalk.red(`\n❌ Error fetching channels: ${error}`));
    } finally {
      this.client.disconnect();
    }
  }

  /**
   * Get channel balances
   */
  async getBalances(): Promise<void> {
    console.log(chalk.blue.bold('\n💰 Channel Balances\n'));

    try {
      await this.initializeConnection();

      // First get channels
      const spinner = ora('Fetching channels...').start();
      const channels = await this.client.getChannels();
      spinner.stop();

      if (!channels || channels.length === 0) {
        console.log(chalk.gray('No channels found.'));
        return;
      }

      const channelChoices = channels.map((channel: any, index: number) => ({
        name: `Channel ${channel.id} (${channel.status})`,
        value: channel.id,
      }));

      const { channelId } = await inquirer.prompt([
        {
          type: 'list',
          name: 'channelId',
          message: 'Select channel to view balances:',
          choices: channelChoices,
        },
      ]);

      const balanceSpinner = ora('Fetching balances...').start();
      const balances = await this.client.getLedgerBalances(channelId);
      balanceSpinner.succeed('Balances retrieved');

      console.log(chalk.green(`\n💰 Balances for Channel ${channelId}:`));
      
      if (!balances || Object.keys(balances).length === 0) {
        console.log(chalk.gray('No balances found.'));
        return;
      }

      Object.entries(balances).forEach(([participant, balance]: [string, any]) => {
        console.log(`${chalk.blue(participant.slice(0, 8))}...: ${chalk.yellow('$' + formatUSDC(BigInt(balance)))} USDC`);
      });

    } catch (error) {
      console.error(chalk.red(`\n❌ Error fetching balances: ${error}`));
    } finally {
      this.client.disconnect();
    }
  }

  /**
   * Create a new channel
   */
  async createChannel(): Promise<void> {
    console.log(chalk.blue.bold('\n🆕 Create New Channel\n'));

    // Show current wallet info first
    try {
      const keypair = await this.walletManager.loadOrCreateWallet();
      console.log(chalk.cyan('📱 Your Wallet Address:'));
      console.log(`   ${chalk.white(keypair.address)}\n`);
    } catch (error) {
      console.log(chalk.red('❌ Could not load wallet. Please create a wallet first.\n'));
      return;
    }

    console.log(chalk.yellow('ℹ️  Channel Creation via Web Interface\n'));
    
    console.log('Due to API limitations, channels must be created through the Yellow Network web interface.');
    console.log('This interactive guide will walk you through the process:\n');
    
    // Interactive step-by-step guide
    const { proceed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Ready to create a new channel? This will open apps.yellow.com',
        default: true
      }
    ]);

    if (!proceed) {
      console.log(chalk.gray('Channel creation cancelled.'));
      return;
    }

    console.log(chalk.cyan.bold('\n🌐 Step-by-Step Channel Creation Guide\n'));
    
    // Step 1: Open website
    console.log(chalk.green('Step 1: Open Yellow Network Apps'));
    console.log(`   🔗 Visit: ${chalk.blue.underline('https://apps.yellow.com')}`);
    console.log('   💡 The website should open automatically in your browser\n');
    
    await this.waitForUserConfirmation('Have you opened apps.yellow.com?');

    // Step 2: Connect wallet
    console.log(chalk.green('Step 2: Connect Your Wallet'));
    console.log('   🔌 Click "Connect Wallet" button');
    console.log('   🦊 Select your wallet provider (MetaMask, WalletConnect, etc.)');
    console.log(`   ✅ Ensure you're connected with: ${chalk.white(await this.getWalletAddress())}`);
    console.log('   🌐 Switch to Polygon network if prompted\n');
    
    await this.waitForUserConfirmation('Is your wallet connected?');

    // Step 3: Navigate to channels
    console.log(chalk.green('Step 3: Navigate to Channels'));
    console.log('   📋 Look for "Channels" or "State Channels" in the navigation menu');
    console.log('   🖱️  Click on the Channels section');
    console.log('   👀 You should see your existing channels (if any)\n');
    
    await this.waitForUserConfirmation('Are you in the Channels section?');

    // Step 4: Create new channel
    console.log(chalk.green('Step 4: Create New Channel'));
    console.log('   ➕ Click "Create Channel" or "New Channel" button');
    console.log('   ⚙️  Configure channel settings:');
    console.log('      • Token: Select USDC');
    console.log('      • Network: Choose Polygon (recommended)');
    console.log('      • Amount: Enter desired funding amount (e.g., 10 USDC)');
    console.log('      • Duration: Set channel lifetime (optional)\n');
    
    await this.waitForUserConfirmation('Have you configured the channel settings?');

    // Step 5: Fund and confirm
    console.log(chalk.green('Step 5: Fund the Channel'));
    console.log('   💰 Review the channel details');
    console.log('   🔐 Approve the transaction in your wallet');
    console.log('   ⏳ Wait for blockchain confirmation');
    console.log('   ✅ Channel should appear in your channels list\n');
    
    await this.waitForUserConfirmation('Has the channel been created successfully?');

    // Step 6: Verify in CLI
    console.log(chalk.green('Step 6: Verify in CLI'));
    console.log('   🔄 Return to this CLI application');
    console.log('   📋 Run channel list to see your new channel\n');

    const { testNow } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'testNow',
        message: 'Would you like to list your channels now to verify?',
        default: true
      }
    ]);

    if (testNow) {
      console.log(chalk.blue('\n🔍 Fetching your channels...\n'));
      await this.listChannels();
    }

    console.log(chalk.green.bold('\n🎉 Channel Creation Complete!\n'));
    console.log(chalk.cyan('Next Steps:'));
    console.log('   • Use your new channel for gasless transactions');
    console.log('   • Create auctions with your funded channel');
    console.log('   • Monitor channel balances and activity');
    console.log('   • Manage channels through this CLI or web interface\n');
    
    console.log(chalk.gray('💡 Pro Tip: Keep some USDC in your channel for transaction fees'));
    console.log(chalk.gray('   and to participate in auctions and other dApp activities.'));

    // Commented out: Programmatic channel creation code (ClearNode API not available)
    /*
    try {
      // Get channel parameters from user
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'token',
          message: 'Select token:',
          choices: [
            { name: 'USDC (Polygon)', value: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' },
            { name: 'USDC (Base)', value: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
            { name: 'USDC (Celo)', value: '0xcebA9300f2b948710d2653dD7B07f33A8B32118C' }
          ]
        },
        {
          type: 'input',
          name: 'amount',
          message: 'Enter amount (in USDC):',
          validate: (input) => {
            const num = parseFloat(input);
            if (isNaN(num) || num <= 0) {
              return 'Please enter a valid positive number';
            }
            return true;
          },
          filter: (input) => {
            // Convert to wei (6 decimals for USDC)
            return (parseFloat(input) * 1000000).toString();
          }
        },
        {
          type: 'list',
          name: 'chainId',
          message: 'Select blockchain:',
          choices: [
            { name: 'Polygon', value: 137 },
            { name: 'Base', value: 8453 },
            { name: 'Celo', value: 42220 }
          ]
        }
      ]);

      await this.initializeConnection();

      const spinner = ora('Creating channel...').start();
      
      const channelResult = await this.client.createChannel({
        token: answers.token,
        amount: answers.amount,
        chainId: answers.chainId
      });

      spinner.succeed('Channel created successfully!');

      console.log(chalk.green('\n✅ Channel Details:'));
      if (channelResult.channel_id) {
        console.log(`   ID: ${chalk.cyan(channelResult.channel_id)}`);
      }
      console.log(`   Token: ${chalk.yellow('USDC')}`);
      console.log(`   Amount: ${chalk.yellow('$' + formatUSDC(BigInt(answers.amount)))} USDC`);
      console.log(`   Chain: ${chalk.blue(answers.chainId === 137 ? 'Polygon' : answers.chainId === 8453 ? 'Base' : 'Celo')}`);
      
      if (channelResult.channel && channelResult.channel.participants) {
        console.log(`   Participants: ${chalk.gray(channelResult.channel.participants.length)}`);
      }

    } catch (error) {
      console.error(chalk.red(`\n❌ Error creating channel: ${error}`));
    } finally {
      this.client.disconnect();
    }
    */
  }

  /**
   * Helper method to wait for user confirmation
   */
  private async waitForUserConfirmation(message: string): Promise<void> {
    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: message,
        default: true
      }
    ]);

    if (!confirmed) {
      console.log(chalk.yellow('\n⏸️  Process paused. You can continue when ready.'));
      await this.waitForUserConfirmation('Ready to continue?');
    }
  }

  /**
   * Helper method to get wallet address
   */
  private async getWalletAddress(): Promise<string> {
    try {
      const keypair = await this.walletManager.loadOrCreateWallet();
      return keypair.address;
    } catch (error) {
      return 'Unable to load wallet address';
    }
  }

  /**
   * Show connection status
   */
  async status(): Promise<void> {
    console.log(chalk.blue.bold('\n📡 Connection Status\n'));

    try {
      await this.initializeConnection();

      console.log(`Status: ${chalk.green('✅ Connected')}`);
      console.log(`ClearNode: ${chalk.cyan(CONFIG.CLEARNODE_URL)}`);
      console.log(`Address: ${chalk.blue(this.client.getAddress())}`);
      console.log(`Authenticated: ${chalk.green('✅ Yes')}`);

    } catch (error) {
      console.log(`Status: ${chalk.red('❌ Disconnected')}`);
      console.log(`Error: ${chalk.red(error)}`);
    } finally {
      this.client.disconnect();
    }
  }
}

/**
 * Register channel commands
 */
export function registerChannelCommands(program: Command): void {
  const channelCommands = new ChannelCommands();

  const channel = program
    .command('channel')
    .description('State channel operations');

  channel
    .command('list')
    .description('List all state channels')
    .action(() => channelCommands.listChannels());

  channel
    .command('create')
    .description('Create a new state channel')
    .action(() => channelCommands.createChannel());

  channel
    .command('balances')
    .description('View channel balances')
    .action(() => channelCommands.getBalances());

  channel
    .command('status')
    .description('Show connection status')
    .action(() => channelCommands.status());
}
