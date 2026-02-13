'use client';

import { Button } from "@/components/ui/button";
import { formatAddress } from "@/lib/utils";
import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit';
import { Wallet } from 'lucide-react';

export function ConnectButton() {
  return (
    <RainbowConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        // Note: If your app doesn't use authentication, you
        // can remove all 'authenticationStatus' checks
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus ||
            authenticationStatus === 'authenticated');

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              'style': {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <Button 
                    onClick={openConnectModal} 
                    variant="outline" 
                    size="sm" 
                    className="font-mono text-xs border-primary text-primary hover:bg-primary/20"
                  >
                    <Wallet className="h-4 w-4 mr-2" />
                    <span>CONNECT_WALLET</span>
                  </Button>
                );
              }

              if (chain.unsupported) {
                return (
                  <Button onClick={openChainModal} variant="destructive" size="sm" className="font-mono text-xs">
                    WRONG_NETWORK
                  </Button>
                );
              }

              return (
                <div style={{ display: 'flex', gap: 12 }}>
                  <Button
                    onClick={openChainModal}
                    variant="outline" 
                    size="sm" 
                    className="font-mono text-xs border-primary/20 text-foreground hover:bg-primary/10 hidden md:flex items-center gap-1"
                  >
                     {chain.hasIcon && (
                        <div
                          style={{
                            background: chain.iconBackground,
                            width: 12,
                            height: 12,
                            borderRadius: 999,
                            overflow: 'hidden',
                            marginRight: 4,
                          }}
                        >
                          {chain.iconUrl && (
                            <img
                              alt={chain.name ?? 'Chain icon'}
                              src={chain.iconUrl}
                              style={{ width: 12, height: 12 }}
                            />
                          )}
                        </div>
                      )}
                    {chain.name}
                  </Button>

                  <Button 
                    onClick={openAccountModal} 
                    variant="outline" 
                    size="sm" 
                    className="font-mono text-xs border-primary text-primary hover:bg-primary/20"
                  >
                    {account.displayName.startsWith('0x') ? formatAddress(account.address) : account.displayName}
                    {account.displayBalance
                      ? <span className="hidden md:inline"> ({account.displayBalance})</span>
                      : ''}
                  </Button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </RainbowConnectButton.Custom>
  );
}
