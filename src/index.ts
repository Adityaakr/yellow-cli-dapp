#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { registerWalletCommands } from './commands/wallet.js';
import { registerAuctionCommands } from './commands/auction.js';
import { registerChannelCommands } from './commands/channel.js';
import { startInteractiveMode } from './commands/interactive.js';

const program = new Command();

// CLI Header
console.log(chalk.yellow.bold(`
╔══════════════════════════════════════════╗
║           🟡 Yellow CLI Dapp             ║
║     Gasless transactions via Nitrolite   ║
╚══════════════════════════════════════════╝
`));

program
  .name('yellow-cli')
  .description('CLI-based dapp using Yellow\'s Nitrolite SDK for gasless transactions')
  .version('1.0.0');

// Register command modules
registerWalletCommands(program);
registerAuctionCommands(program);
registerChannelCommands(program);

program
  .command('interactive')
  .alias('i')
  .description('Start interactive menu mode')
  .action(() => startInteractiveMode());

program
  .command('help')
  .description('Show help information')
  .action(() => {
    console.log(chalk.blue.bold('\n📖 Available Commands:\n'));
    
    console.log(chalk.white('Interactive Mode:'));
    console.log('  interactive      - Start interactive menu (recommended)');
    
    console.log(chalk.white('\nWallet Management:'));
    console.log('  wallet show      - Show wallet information');
    console.log('  wallet create    - Create a new wallet');
    console.log('  wallet import    - Import wallet from private key');
    console.log('  wallet export    - Export private key');
    console.log('  wallet delete    - Delete current wallet');
    
    console.log(chalk.white('\nAuction Operations:'));
    console.log('  auction create   - Create a new auction');
    console.log('  auction list     - List active auctions');
    console.log('  auction bid      - Place a bid on an auction');
    console.log('  auction watch    - Watch an auction in real-time');
    console.log('  auction settle   - Settle an auction (seller only)');
    
    console.log(chalk.white('\nChannel Operations:'));
    console.log('  channel list     - List all state channels');
    console.log('  channel balances - View channel balances');
    console.log('  channel status   - Show connection status');
    
    console.log(chalk.gray('\nFor more information on a specific command, use:'));
    console.log(chalk.gray('  yellow-cli <command> --help\n'));
  });

// Show help if no command provided
if (process.argv.length <= 2) {
  program.outputHelp();
  process.exit(0);
}

// Parse command line arguments
program.parse();
