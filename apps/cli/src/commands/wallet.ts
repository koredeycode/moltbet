// Wallet commands - Simplified
import chalk from 'chalk';
import { Command } from 'commander';
import { getConfigPath, hasWallet } from '../config';
import { isJsonMode, printBanner, printBox, printError, printKeyValue, printResult, printSectionHeader, startSpinner } from '../ui';
import {
    generateWallet,
    getEthBalance,
    getUsdcBalance,
    getWallet,
    importWallet,
} from '../wallet';

export function walletCommands(program: Command) {
  const wallet = program
    .command('wallet')
    .description('Wallet management commands');
  
  // Generate new wallet
  wallet
    .command('generate')
    .description('Generate a new wallet')
    .action(async () => {
      printBanner();
      
      if (hasWallet()) {
        const w = getWallet();
        printError('A wallet already exists.', { 
            tip: 'Use "moltbet wallet address" to see your address.',
            address: w?.address
        });
        return;
      }
      
      const { address, privateKey } = generateWallet();
      
      printResult({ address, privateKey, configPath: getConfigPath() });

      printSectionHeader('Wallet Generated');
      console.log();
      printKeyValue('Address', address);
      printKeyValue('Private Key', privateKey);
      console.log();
      console.log(`  Saved to: ${chalk.dim(getConfigPath())}`);
      console.log();
      
      printBox([
          '⚠️  Keep your private key safe!',
          'Never share it with anyone.',
          'We only store it locally in your config file.'
      ], 'warning');
      
      printBox([
          'Next steps:',
          '1. Get testnet ETH/USDC from https://base-sepolia-faucet.skale.space',
          '2. Register with: moltbet register <name>'
      ], 'info');
    });
  
  // Import wallet
  wallet
    .command('import')
    .description('Import an existing private key')
    .argument('<privateKey>', 'Private key (0x...)')
    .action(async (privateKey: string) => {
      printBanner();
      try {
        const address = importWallet(privateKey);
        printResult({ address, configPath: getConfigPath() });
        printBox([
            'Wallet imported successfully!',
            `Address: ${address}`,
            `Saved to: ${getConfigPath()}`
        ], 'success');
      } catch (err) {
        printError(`Failed to import wallet: ${(err as Error).message}`);
      }
    });
  
  // Show address
  wallet
    .command('address')
    .description('Show wallet address')
    .action(() => {
      const w = getWallet();
      printBanner();
      if (!w) {
        printError('No wallet found.', { tip: 'Generate one with: moltbet wallet generate' });
        return;
      }
      printResult({ address: w.address });
      if (!isJsonMode) {
        printKeyValue('Address', w.address);
        console.log();
      }
    });
  
  // Show private key
  wallet
    .command('export')
    .description('Export private key')
    .action(() => {
      const w = getWallet();
      printBanner();
      if (!w) {
        printError('No wallet found.');
        return;
      }
      printResult({ address: w.address, privateKey: w.privateKey });
      printBox([
          'Private Key Export',
          '------------------',
          w.privateKey,
          '',
          '⚠️  Never share this with anyone!'
      ], 'warning');
    });
  
  // Check balance
  wallet
    .command('balance')
    .description('Check wallet balances')
    .action(async () => {
      const w = getWallet();
      printBanner();
      
      if (!w) {
        printError('No wallet found.', { tip: 'Generate one with: moltbet wallet generate' });
        return;
      }
      
      const spinner = startSpinner('Fetching balances...');
      
      try {
        const [usdc, eth] = await Promise.all([
          getUsdcBalance(w.address),
          getEthBalance(w.address),
        ]);
        
        spinner.stop();
        
        printResult({ address: w.address, usdc, eth, chain: 'Skale Base Sepolia', chainId: 324705682 });

        if (!isJsonMode) {
          printSectionHeader('Wallet Balance');
          console.log();
          printKeyValue('Address', chalk.dim(w.address));
          console.log();
          printKeyValue('USDC', chalk.greenBright(`${usdc} USDC`));
          printKeyValue('ETH', chalk.blueBright(`${eth} ETH`));
          console.log();
          console.log(chalk.dim('  Chain: Skale Base Sepolia (324705682)'));
          console.log();
        }
        
      } catch (err) {
        spinner.stop();
        printError('Failed to fetch balances', { error: (err as Error).message });
      }
    });
}
