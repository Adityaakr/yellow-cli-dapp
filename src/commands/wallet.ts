import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { WalletManager } from '../services/wallet-manager.js';

export class WalletCommands {
  private walletManager: WalletManager;

  constructor() {
    this.walletManager = new WalletManager();
  }

  /**
   * Show wallet information
   */
  async showWallet(): Promise<void> {
    console.log(chalk.blue.bold('\n💼 Wallet Information\n'));

    try {
      const walletInfo = await this.walletManager.getWalletInfo();
      
      if (!walletInfo) {
        console.log(chalk.gray('No wallet found. Use "wallet create" to create a new wallet.'));
        return;
      }

      console.log(`Address: ${chalk.green(walletInfo.address)}`);
      console.log(`Status: ${chalk.green('✅ Active')}`);
      
    } catch (error) {
      console.error(chalk.red(`❌ Error loading wallet: ${error}`));
    }
  }

  /**
   * Create a new wallet
   */
  async createWallet(): Promise<void> {
    console.log(chalk.blue.bold('\n🔑 Create New Wallet\n'));

    try {
      const existingWallet = await this.walletManager.getWalletInfo();
      
      if (existingWallet) {
        console.log(chalk.yellow('⚠️  Wallet already exists:'), existingWallet.address);
        const { overwrite } = await inquirer.prompt([{
          type: 'confirm',
          name: 'overwrite',
          message: 'Do you want to overwrite the existing wallet?',
          default: false
        }]);
        
        if (!overwrite) {
          console.log(chalk.blue('Keeping existing wallet'));
          return;
        }
      }

      const wallet = await this.walletManager.createNewWallet();
      console.log(chalk.green(`✅ Wallet created successfully!`));
      console.log(`Address: ${chalk.cyan(wallet.address)}`);
      console.log(chalk.yellow('\n⚠️  Make sure to backup your wallet using: wallet export'));
      
    } catch (error) {
      console.error(chalk.red('❌ Error creating wallet:'), error);
    }
  }

  /**
   * Import wallet from private key
   */
  async importWallet(): Promise<void> {
    console.log(chalk.blue.bold('\n📥 Import Wallet\n'));

    try {
      const { privateKey } = await inquirer.prompt([
        {
          type: 'password',
          name: 'privateKey',
          message: 'Enter your private key (0x...):',
          validate: (input) => {
            if (!input.startsWith('0x') || input.length !== 66) {
              return 'Private key must be 64 characters long and start with 0x';
            }
            return true;
          },
        },
      ]);

      const existingWallet = await this.walletManager.getWalletInfo();
      
      if (existingWallet) {
        const { overwrite } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'overwrite',
            message: `Wallet already exists (${existingWallet.address}). Overwrite?`,
            default: false,
          },
        ]);

        if (!overwrite) {
          console.log(chalk.gray('Wallet import cancelled.'));
          return;
        }
      }

      const keypair = await this.walletManager.importWallet(privateKey);
      
      console.log(chalk.green('\n✅ Wallet imported successfully!'));
      console.log(`Address: ${chalk.cyan(keypair.address)}`);
      
    } catch (error) {
      console.error(chalk.red(`❌ Error importing wallet: ${error}`));
    }
  }

  /**
   * Export private key
   */
  async exportPrivateKey(): Promise<void> {
    console.log(chalk.blue.bold('\n🔐 Export Private Key\n'));

    try {
      const walletInfo = await this.walletManager.getWalletInfo();
      
      if (!walletInfo) {
        console.log(chalk.gray('No wallet found. Create or import a wallet first.'));
        return;
      }

      console.log(chalk.red('⚠️  WARNING: Your private key gives full access to your wallet!'));
      console.log(chalk.red('Never share it with anyone or store it in insecure locations.\n'));

      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Do you understand the risks and want to export your private key?',
          default: false,
        },
      ]);

      if (!confirm) {
        console.log(chalk.gray('Export cancelled.'));
        return;
      }

      const privateKey = await this.walletManager.exportPrivateKey();
      
      if (!privateKey) {
        console.log(chalk.red('❌ Could not export private key'));
        return;
      }

      console.log(chalk.yellow('\n🔑 Your Private Key:'));
      console.log(chalk.white(privateKey));
      console.log(chalk.red('\n⚠️  Keep this safe and never share it!'));
      
    } catch (error) {
      console.error(chalk.red(`❌ Error exporting private key: ${error}`));
    }
  }

  /**
   * Delete wallet
   */
  async deleteWallet(): Promise<void> {
    console.log(chalk.blue.bold('\n🗑️  Delete Wallet\n'));

    try {
      const walletInfo = await this.walletManager.getWalletInfo();
      
      if (!walletInfo) {
        console.log(chalk.gray('No wallet found to delete.'));
        return;
      }

      console.log(chalk.red('⚠️  WARNING: This will permanently delete your wallet!'));
      console.log(chalk.red('Make sure you have backed up your private key.\n'));
      console.log(`Current wallet: ${chalk.cyan(walletInfo.address)}`);

      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to delete this wallet?',
          default: false,
        },
      ]);

      if (!confirm) {
        console.log(chalk.gray('Deletion cancelled.'));
        return;
      }

      const { doubleConfirm } = await inquirer.prompt([
        {
          type: 'input',
          name: 'doubleConfirm',
          message: 'Type "DELETE" to confirm:',
          validate: (input) => input === 'DELETE' || 'You must type "DELETE" to confirm',
        },
      ]);

      await this.walletManager.deleteWallet();
      console.log(chalk.green('\n✅ Wallet deleted successfully.'));
      
    } catch (error) {
      console.error(chalk.red(`❌ Error deleting wallet: ${error}`));
    }
  }
}

/**
 * Register wallet commands
 */
export function registerWalletCommands(program: Command): void {
  const walletCommands = new WalletCommands();

  const wallet = program
    .command('wallet')
    .description('Wallet management operations');

  wallet
    .command('show')
    .description('Show wallet information')
    .action(() => walletCommands.showWallet());

  wallet
    .command('create')
    .description('Create a new wallet')
    .action(() => walletCommands.createWallet());

  wallet
    .command('import')
    .description('Import wallet from private key')
    .action(() => walletCommands.importWallet());

  wallet
    .command('export')
    .description('Export private key')
    .action(() => walletCommands.exportPrivateKey());

  wallet
    .command('delete')
    .description('Delete current wallet')
    .action(() => walletCommands.deleteWallet());
}
