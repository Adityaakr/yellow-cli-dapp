import inquirer from 'inquirer';
import chalk from 'chalk';
import { WalletCommands } from './wallet.js';
import { AuctionCommands } from './auction.js';
import { ChannelCommands } from './channel.js';

export class InteractiveMenu {
  private walletCommands: WalletCommands;
  private auctionCommands: AuctionCommands;
  private channelCommands: ChannelCommands;

  constructor() {
    this.walletCommands = new WalletCommands();
    this.auctionCommands = new AuctionCommands();
    this.channelCommands = new ChannelCommands();
  }

  /**
   * Show main menu and handle user selection
   */
  async showMainMenu(): Promise<void> {
    console.clear();
    console.log(chalk.yellow.bold(`
╔══════════════════════════════════════════╗
║           🟡 Yellow CLI Dapp             ║
║     Gasless transactions via Nitrolite   ║
╚══════════════════════════════════════════╝
`));

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: '💼 Wallet Management', value: 'wallet' },
          { name: '🎨 Digital Art Auctions', value: 'auction' },
          { name: '🌐 State Channels', value: 'channel' },
          { name: '❌ Exit', value: 'exit' }
        ]
      }
    ]);

    switch (action) {
      case 'wallet':
        await this.showWalletMenu();
        break;
      case 'auction':
        await this.showAuctionMenu();
        break;
      case 'channel':
        await this.showChannelMenu();
        break;
      case 'exit':
        console.log(chalk.yellow('\n👋 Goodbye!'));
        process.exit(0);
        break;
    }
  }

  /**
   * Show wallet management menu
   */
  async showWalletMenu(): Promise<void> {
    console.log(chalk.blue.bold('\n💼 Wallet Management\n'));

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Select wallet operation:',
        choices: [
          { name: '📋 Show wallet info', value: 'show' },
          { name: '🔑 Create new wallet', value: 'create' },
          { name: '📥 Import wallet', value: 'import' },
          { name: '📤 Export private key', value: 'export' },
          { name: '🗑️  Delete wallet', value: 'delete' },
          { name: '← Back to main menu', value: 'back' }
        ]
      }
    ]);

    if (action === 'back') {
      await this.showMainMenu();
      return;
    }

    try {
      switch (action) {
        case 'show':
          await this.walletCommands.showWallet();
          break;
        case 'create':
          await this.walletCommands.createWallet();
          break;
        case 'import':
          await this.walletCommands.importWallet();
          break;
        case 'export':
          await this.walletCommands.exportPrivateKey();
          break;
        case 'delete':
          await this.walletCommands.deleteWallet();
          break;
      }
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error}`));
    }

    // Return to main menu after operation
    await this.promptReturnToMenu();
  }

  /**
   * Show auction menu
   */
  async showAuctionMenu(): Promise<void> {
    console.log(chalk.blue.bold('\n🎨 Digital Art Auctions\n'));

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Select auction operation:',
        choices: [
          { name: '🎨 Create auction', value: 'create' },
          { name: '🏛️  List active auctions', value: 'list' },
          { name: '💰 Place bid', value: 'bid' },
          { name: '👀 Watch auction', value: 'watch' },
          { name: '📊 View all bids', value: 'viewAllBids' },
          { name: '📋 View auction bids', value: 'viewAuctionBids' },
          { name: '⚖️  Settle auction', value: 'settle' },
          { name: '← Back to main menu', value: 'back' }
        ]
      }
    ]);

    if (action === 'back') {
      await this.showMainMenu();
      return;
    }

    try {
      switch (action) {
        case 'create':
          await this.auctionCommands.createAuction();
          break;
        case 'list':
          await this.auctionCommands.listAuctions();
          break;
        case 'bid':
          await this.auctionCommands.placeBid();
          break;
        case 'watch':
          await this.auctionCommands.watchAuction();
          break;
        case 'viewAllBids':
          await this.auctionCommands.viewAllBids();
          break;
        case 'viewAuctionBids':
          await this.auctionCommands.viewAuctionBids();
          break;
        case 'settle':
          await this.auctionCommands.settleAuction();
          break;
      }
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error}`));
    }

    // Return to main menu after operation (except for watch which handles its own exit)
    if (action !== 'watch') {
      await this.promptReturnToMenu();
    }
  }

  /**
   * Show channel menu
   */
  async showChannelMenu(): Promise<void> {
    console.log(chalk.blue.bold('\n🌐 State Channels\n'));

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Select channel operation:',
        choices: [
          { name: '📋 List channels', value: 'list' },
          { name: '💰 View balances', value: 'balances' },
          { name: '📡 Connection status', value: 'status' },
          { name: '← Back to main menu', value: 'back' }
        ]
      }
    ]);

    if (action === 'back') {
      await this.showMainMenu();
      return;
    }

    try {
      switch (action) {
        case 'list':
          await this.channelCommands.listChannels();
          break;
        case 'balances':
          await this.channelCommands.getBalances();
          break;
        case 'status':
          await this.channelCommands.status();
          break;
      }
    } catch (error) {
      console.error(chalk.red(`\n❌ Error: ${error}`));
    }

    // Return to main menu after operation
    await this.promptReturnToMenu();
  }

  /**
   * Prompt user to return to main menu
   */
  async promptReturnToMenu(): Promise<void> {
    console.log('\n');
    const { returnToMenu } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'returnToMenu',
        message: 'Return to main menu?',
        default: true
      }
    ]);

    if (returnToMenu) {
      await this.showMainMenu();
    } else {
      console.log(chalk.yellow('\n👋 Goodbye!'));
      process.exit(0);
    }
  }

  /**
   * Start the interactive menu system
   */
  async start(): Promise<void> {
    try {
      await this.showMainMenu();
    } catch (error) {
      if ((error as any)?.name === 'ExitPromptError') {
        console.log(chalk.yellow('\n👋 Goodbye!'));
        process.exit(0);
      } else {
        console.error(chalk.red(`\n❌ Unexpected error: ${error}`));
        process.exit(1);
      }
    }
  }
}

/**
 * Start interactive mode
 */
export async function startInteractiveMode(): Promise<void> {
  const menu = new InteractiveMenu();
  await menu.start();
}