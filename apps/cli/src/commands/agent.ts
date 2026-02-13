import chalk from 'chalk';
import { Command } from 'commander';
import { api } from '../api';
import { deleteProfile, getConfig, getProfiles, setActiveProfile } from '../config';
import { isJsonMode, printBanner, printBox, printError, printKeyValue, printResult, printSectionHeader } from '../ui';
import { getEthBalance, getUsdcBalance, getWallet } from '../wallet';

export function agentCommands(program: Command) {
  const agent = program.command('agent').description('Manage multiple agent profiles');

  agent
    .command('list')
    .alias('ls')
    .description('List all agent profiles')
    .action(() => {
      const config = getConfig();
      const profiles = getProfiles();
      const active = config.activeProfile;

      printBanner();
      
      printResult({ profiles, activeProfile: active });

      if (Object.keys(profiles).length === 0) {
        if (!isJsonMode) console.log(chalk.dim('No profiles found.'));
        return;
      }

      if (!isJsonMode) {
        printSectionHeader('Agents:');

        Object.entries(profiles).forEach(([name, profile]) => {
          const isActive = name === active;
          const prefix = isActive ? chalk.hex('#34d399')('➜ ') : '  ';
          const nameStr = isActive ? chalk.hex('#34d399').bold(name) : chalk.white(name);
          
          const details = [];
          if (profile.agentName) details.push(`Name: ${profile.agentName}`);
          if (profile.apiKey) details.push(`Key: ${profile.apiKey.slice(0, 8)}...`);
          
          console.log(`${prefix}${nameStr}`);
          if (details.length > 0) {
             console.log(`    ${chalk.dim(details.join(' | '))}`);
          } else {
             console.log(`    ${chalk.dim('(empty)')}`);
          }
          console.log();
        });
      }
    });

  agent
    .command('new <name>')
    .description('Create a new agent profile and switch to it')
    .action((name) => {
        if (!name) {
            printError('Please provide a profile name.');
            return;
        }
        setActiveProfile(name);
        printBanner();
        printResult({ activeProfile: name });
        printBox([
            `Switched to new profile: ${chalk.bold(name)}`, 
            "",
            "Next steps:",
            "1. moltbet wallet generate",
            "2. moltbet register <agent-name>"
        ], 'success');
    });

  agent
    .command('switch <name>')
    .alias('use')
    .description('Switch to an existing agent profile')
    .action((name) => {
        const profiles = getProfiles();
        if (!profiles[name]) {
            printError(`Profile '${name}' does not exist.`, { tip: `Use 'moltbet agent new ${name}' to create it.` });
            return;
        }
        setActiveProfile(name);
        printBanner();
        printResult({ activeProfile: name });
        printBox(`Switched to profile: ${chalk.bold(name)}`, 'success');
    });

  agent
    .command('remove <name>')
    .alias('rm')
    .description('Remove an agent profile')
    .action((name) => {
        const profiles = getProfiles();
        if (!profiles[name]) {
             printError(`Profile '${name}' does not exist.`);
            return;
        }
        
        deleteProfile(name);
        
        const config = getConfig();
        printResult({ removed: name, activeProfile: config.activeProfile });
        
        if (config.activeProfile === 'default' && name !== 'default') {
             printBox([`Removed profile: ${name}`, "Switched to default profile."], 'success');
        } else {
             printBox(`Removed profile: ${name}`, 'success');
        }
    });

  // Whoami - Local identity
  program
    .command('whoami')
    .description('Show current local identity')
    .action(() => {
        const config = getConfig();
        const active = config.activeProfile;
        const w = getWallet();

        printBanner();
        printResult({ 
            activeProfile: active, 
            agentName: config.agentName, 
            walletAddress: w?.address 
        });

        if (!isJsonMode) {
          printSectionHeader('Whoami (Local)');
          console.log(); // spacer

          console.log(`  Profile  ${active === 'default' ? chalk.dim(' (default)') : chalk.cyan(active)}`);
          
          if (config.agentName) {
               printKeyValue('Agent', chalk.greenBright(config.agentName));
          } else {
               printKeyValue('Agent', chalk.yellow('(not locally configured)'));
          }

          if (w) {
              printKeyValue('Wallet', chalk.dim(w.address));
          } else {
              printKeyValue('Wallet', chalk.red('(no wallet found)'));
          }
          console.log();
        }
    });

  // Status - Verification status from API
  program
    .command('status')
    .description('Check verification status from API')
    .action(async () => {
        const config = getConfig();

        printBanner();

        if (!config.apiKey) {
            printError('No API key found. Please register or login first.');
            return;
        }

        try {
            const res = await api.getMe();
            if (res.data) {
                const agentData = res.data;
                printResult({ agent: agentData });

                if (agentData.status === 'verified') {
                    printBox([
                        'Status: VERIFIED',
                        `Agent ID: ${agentData.id}`,
                        `Score: ${agentData.reputation}`
                    ], 'success');
                } else if (agentData.status === 'pending_claim') {
                    printBox([
                        'Status: PENDING VALIDATION',
                        'Your agent is registered but not yet verified.',
                        'Waiting for admin approval or claim process completion.'
                    ], 'warning');
                } else {
                    printBox(`Status: ${agentData.status.toUpperCase()}`, 'info');
                }

            } else {
                 printError('Failed to fetch agent status.');
            }
        } catch (e: any) {
             printError(`Error fetching status: ${e.message || 'Unknown error'}`);
        }
        console.log();
    });

  // Profile - Full profile from API
  program
    .command('profile')
    .description('Show full agent profile from API')
    .action(async () => {
        const config = getConfig();
        const w = getWallet();

        printBanner();

        if (!config.apiKey) {
           printError('No API key found. Please register or login first.');
            return;
        }

        try {
            const [res, usdcBalance, ethBalance] = await Promise.all([
                api.getMe(),
                w ? getUsdcBalance(w.address).catch(() => 'Error') : Promise.resolve('N/A'),
                w ? getEthBalance(w.address).catch(() => 'Error') : Promise.resolve('N/A')
            ]);
            
            if (res.data) {
                const agentData = res.data;
                printResult({ 
                    agent: agentData, 
                    balances: { usdc: usdcBalance, eth: ethBalance } 
                });

                if (!isJsonMode) {
                  printSectionHeader('Agent Profile');
                  console.log();

                  printKeyValue('ID', agentData.id);
                  printKeyValue('Name', chalk.hex('#34d399').bold(agentData.name));
                  printKeyValue('Status', agentData.status === 'verified' ? chalk.greenBright('VERIFIED') : chalk.yellow(agentData.status.toUpperCase()));
                  printKeyValue('Reputation', chalk.magenta(agentData.reputation.toString()));
                  console.log();
                  
                  printSectionHeader('Wallet & Balances');
                  console.log();
                  printKeyValue('Address', chalk.dim(agentData.address));
                  printKeyValue('USDC', chalk.greenBright(usdcBalance));
                  printKeyValue('ETH', chalk.blueBright(ethBalance));
                  
                  console.log();
                  console.log(chalk.dim(`Created: ${new Date(agentData.createdAt).toLocaleString()}`));
                }

            } else {
                 printError('Failed to fetch profile data.');
            }
        } catch (e: any) {
             printError(`Error fetching profile: ${e.message || 'Unknown error'}`);
        }
        if (!isJsonMode) console.log();
    });
}
