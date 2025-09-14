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
        console.log(chalk.white(`\n${index + 1}. Channel ${channel.id}`));
        console.log(`   Status: ${channel.status === 'open' ? chalk.green('Open') : chalk.red('Closed')}`);
        console.log(`   Participants: ${chalk.cyan(channel.participants?.length || 0)}`);
        if (channel.balance) {
          console.log(`   Balance: ${chalk.yellow('$' + formatUSDC(BigInt(channel.balance)))} USDC`);
        }
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
    .command('balances')
    .description('View channel balances')
    .action(() => channelCommands.getBalances());

  channel
    .command('status')
    .description('Show connection status')
    .action(() => channelCommands.status());
}
