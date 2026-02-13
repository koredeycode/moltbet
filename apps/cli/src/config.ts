// CLI Configuration - Simple JSON credential storage
import Conf from 'conf';

export interface AgentProfile {
  apiKey?: string;
  privateKey?: string;
  walletAddress?: string;
  agentName?: string;
  agentId?: string;
}

export interface CliConfig {
  // API settings
  apiBase: string;

  // Multi-agent support
  activeProfile: string;
  profiles: Record<string, AgentProfile>;
  
  // Legacy fields (for migration)
  apiKey?: string;
  privateKey?: string;
  walletAddress?: string;
  agentName?: string;
  agentId?: string;
}

const config = new Conf<CliConfig>({
  projectName: 'moltbet',
  projectSuffix: '',
  configName: 'credentials', // ~/.config/moltbet/credentials.json
  defaults: {
    apiBase: 'http://localhost:8000/api',
    // apiBase: 'https://moltbet-api.onrender.com/api'
    activeProfile: 'default',
    profiles: {},
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Migration & Helper
// ─────────────────────────────────────────────────────────────────────────────

function migrateConfig() {
  const c = config.store;
  if (!c.profiles || Object.keys(c.profiles).length === 0) {
    if (c.apiKey || c.privateKey || c.walletAddress) {
       console.log("Migrating legacy config to 'default' profile...");
       const defaultProfile: AgentProfile = {
          apiKey: c.apiKey,
          privateKey: c.privateKey,
          walletAddress: c.walletAddress,
          agentName: c.agentName,
          agentId: c.agentId
       };
       config.set('profiles.default', defaultProfile);
       config.set('activeProfile', 'default');
       
       // Clear legacy (optional, but cleaner)
       config.delete('apiKey' as any);
       config.delete('privateKey' as any);
       config.delete('walletAddress' as any);
       config.delete('agentName' as any);
       config.delete('agentId' as any);
    } else {
        // Init empty default if nothing exists
        if (!config.has('profiles.default')) {
            config.set('profiles.default', {});
        }
    }
  }
}

// Run migration on module load (simple approach)
migrateConfig();

function getActiveProfileName(): string {
    return config.get('activeProfile') || 'default';
}

function getActiveProfile(): AgentProfile {
    const name = getActiveProfileName();
    return config.get(`profiles.${name}`) || {};
}

function updateActiveProfile(data: Partial<AgentProfile>) {
    const name = getActiveProfileName();
    const current = config.get(`profiles.${name}`) || {};
    config.set(`profiles.${name}`, { ...current, ...data });
}

// ─────────────────────────────────────────────────────────────────────────────
// Getters
// ─────────────────────────────────────────────────────────────────────────────

export interface FullConfig extends AgentProfile {
    apiBase: string;
    activeProfile: string;
}

export function getConfig(): FullConfig {
  const profile = getActiveProfile();
  return {
    apiBase: config.get('apiBase'),
    activeProfile: getActiveProfileName(),
    ...profile,
  };
}

export function getPrivateKey(): string | undefined {
  return getActiveProfile().privateKey;
}

export function getApiKey(): string | undefined {
  return getActiveProfile().apiKey;
}

export function getWalletAddress(): string | undefined {
  return getActiveProfile().walletAddress;
}

export function getProfiles(): Record<string, AgentProfile> {
    return config.get('profiles') || {};
}

// ─────────────────────────────────────────────────────────────────────────────
// Setters
// ─────────────────────────────────────────────────────────────────────────────

export function setConfig(key: keyof AgentProfile | 'apiBase', value: string): void {
  if (key === 'apiBase') {
      config.set('apiBase', value);
  } else {
      updateActiveProfile({ [key]: value });
  }
}

export function setCredentials(creds: {
  apiKey: string;
  privateKey: string;
  walletAddress: string;
  agentName: string;
  agentId: string;
}): void {
  updateActiveProfile(creds);
}

export function setWallet(privateKey: string, address: string): void {
  updateActiveProfile({ privateKey, walletAddress: address });
}

export function setActiveProfile(name: string): void {
    if (!config.has(`profiles.${name}`)) {
        config.set(`profiles.${name}`, {});
    }
    config.set('activeProfile', name);
}

export function deleteProfile(name: string): void {
    config.delete(`profiles.${name}`);
    if (config.get('activeProfile') === name) {
        config.set('activeProfile', 'default');
    }
}


// ─────────────────────────────────────────────────────────────────────────────
// Checks
// ─────────────────────────────────────────────────────────────────────────────

export function hasApiKey(): boolean {
  return !!getActiveProfile().apiKey;
}

export function hasWallet(): boolean {
  const p = getActiveProfile();
  return !!p.privateKey && !!p.walletAddress;
}

export function hasCredentials(): boolean {
  return hasApiKey() && hasWallet();
}

// ─────────────────────────────────────────────────────────────────────────────
// Clear
// ─────────────────────────────────────────────────────────────────────────────

export function clearConfig(): void {
  config.clear();
}

export function getConfigPath(): string {
  return config.path;
}
