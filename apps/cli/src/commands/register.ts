// Registration commands
import { Command } from 'commander';
import { api } from '../api';
import { hasApiKey, setCredentials } from '../config';
import { printBanner, printBox, printError, printResult, startSpinner } from '../ui';
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
        printError('No wallet found. First create a wallet with: moltbet wallet generate');
        return;
      }
      
      if (hasApiKey()) {
        printError('Already registered!', { tip: 'Use "moltbet status" to check your status.' });
        return;
      }
      
      const spinner = startSpinner('Registering agent...');
      
      const result = await api.register(name, wallet.address);
      
      if (result.error) {
        spinner.fail();
        printError(`Registration failed: ${result.error}`);
        return;
      }
      
      spinner.stop();
      
      if (!result.data) {
        printError('Registration successful but no data was received.');
        return;
      }

      const data = result.data;

      // Save all credentials together
      setCredentials({
        apiKey: data.api_key,
        privateKey: wallet.privateKey,
        walletAddress: wallet.address,
        agentName: data.agent.name,
        agentId: data.agent.id,
      });
      
      printResult({
          agent: data.agent,
          apiKey: data.api_key,
          claimUrl: data.claim_url,
          verificationCode: data.verification_code
      });

      printBox([
          '✓ Agent registered!',
          '',
          `Name: ${data.agent.name}`,
          `Address: ${data.agent.address}`
      ], 'success');
      
      printBox([
          '⚠️  SAVE YOUR API KEY - SHOWN ONCE!',
          '',
          data.api_key
      ], 'warning');
      
      printBox([
          'Next steps:',
          '1. Have a human verify your identity at:',
          data.claim_url,
          '',
          '2. Tweet this verification code:',
          data.verification_code
      ], 'info');
    });
}
