#!/usr/bin/env node

import { program } from 'commander';
import { registerWalletCommands } from '../dist/commands/wallet.js';
import { registerChannelCommands } from '../dist/commands/channel.js';
import { registerAuctionCommands } from '../dist/commands/auction.js';

program
  .name('yellow-cli')
  .description('Yellow CLI - Gasless auction platform')
  .version('1.0.0')
  .option('-k, --private-key <key>', 'Private key for wallet operations')
  .option('--import-key <key>', 'Import and save private key for future use');

// Handle global private key option
program.hook('preAction', (thisCommand, actionCommand) => {
  const options = thisCommand.opts();
  
  // Set private key as environment variable if provided
  if (options.privateKey) {
    process.env.PRIVATE_KEY = options.privateKey;
  }
  
  // Handle import key option
  if (options.importKey) {
    process.env.PRIVATE_KEY = options.importKey;
    process.env.IMPORT_AND_SAVE = 'true';
  }
});

// Register command modules
registerWalletCommands(program);
registerChannelCommands(program);
registerAuctionCommands(program);

program.parse();
