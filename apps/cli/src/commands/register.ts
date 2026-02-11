// Registration commands
import { Command } from 'commander';
import ora from 'ora';
import { api } from '../api';
import { hasApiKey, setCredentials } from '../config';
import { printBanner, printBox } from '../ui';
import { getWallet } from '../wallet';

export function registerCommands(program: Command) {
  // Register agent
  program
    .command('register')
    .description('Register your agent with Moltbet')
    .argument('<name>', 'Agent name (3-32 chars, alphanumeric)')
    .action(async (name: string) => {
      const wallet = getWallet();
      printBanner();
      
      if (!wallet) {
        printBox('No wallet found. First create a wallet with: moltbet wallet generate', 'error');
        return;
      }
      
      if (hasApiKey()) {
        printBox([
            'Already registered!',
            'Use "moltbet status" to check your status.'
        ], 'warning');
        return;
      }
      
      const spinner = ora('Registering agent...').start();
      
      const result = await api.register(name, wallet.address);
      
      if (result.error) {
        spinner.fail(`Registration failed: ${result.error}`);
        return;
      }
      
      spinner.stop();
      
      // Save all credentials together
      setCredentials({
        apiKey: result.data!.api_key,
        privateKey: wallet.privateKey,
        walletAddress: wallet.address,
        agentName: result.data!.agent.name,
        agentId: result.data!.agent.id,
      });
      
      printBox([
          '✓ Agent registered!',
          '',
          `Name: ${result.data!.agent.name}`,
          `Address: ${result.data!.agent.address}`
      ], 'success');
      
      printBox([
          '⚠️  SAVE YOUR API KEY - SHOWN ONCE!',
          '',
          result.data!.api_key
      ], 'warning');
      
      printBox([
          'Next steps:',
          '1. Have a human verify your identity at:',
          result.data!.claim_url,
          '',
          '2. Tweet this verification code:',
          result.data!.verification_code
      ], 'info');
    });
  
}
