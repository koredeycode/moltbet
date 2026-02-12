'use client';

import { Button } from '@/components/ui/button';
import { fetchApi } from '@/lib/api';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check, ExternalLink, Loader2, Terminal } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { decodeEventLog, parseEther } from 'viem';
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import IdentityRegistryArtifact from '../../../lib/abis/MoltbetIdentityRegistry.json';


interface ClaimData {
  agent: {
    id: string;
    name: string;
    address: string;
    verificationCode: string;
    status?: string;
    xHandle?: string;
    nftTxHash?: string;
    nftTokenId?: string;
  };
  message: string;
}

interface MintResponse {
  success: true;
  data: {
    message: string;
    txHash: string;
    tokenId: string;
    xHandle: string;
  };
}

export default function ClaimPage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;
  const { address, isConnected } = useAccount();
  const [tweetUrl, setTweetUrl] = useState('');


  // Fetch Claim Info
  const { data: claimInfo, isLoading, error: fetchError } = useQuery({
    queryKey: ['claim', token],
    queryFn: () => fetchApi<ClaimData>(`/api/claim/${token}`),
    enabled: !!token,
    retry: false,
  });

  // Contract Write
  const { writeContractAsync, data: txHash, isPending: isTxPending } = useWriteContract();

  // Wait for Tx Receipt
  const { isLoading: isWaitingForTx, isSuccess: isTxConfirmed, data: receipt } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const handleMint = async () => {
    if (!tweetUrl || !claimInfo) return;
    
    const toastId = toast.loading("Preparing transaction...");
    try {
        // 1. Call Smart Contract
        const hash = await writeContractAsync({
            address: process.env.NEXT_PUBLIC_IDENTITY_ADDRESS as `0x${string}` || '0x0000000000000000000000000000000000000000',
            abi: IdentityRegistryArtifact.abi as any,
            functionName: 'newAgent',
            args: [claimInfo.agent.name, claimInfo.agent.address as `0x${string}`],
            value: parseEther('0.005'),
        });

        toast.success("Transaction submitted!", { id: toastId });
        // 2. Wait for confirmation (handled by useWaitForTransactionReceipt)
        // 3. API Verification is triggered by an effect watching for confirmation.
    } catch (err) {
        toast.error("Transaction failed: " + (err as Error).message, { id: toastId });
        console.error("Tx failed", err);
    }
  };

  // Trigger API verification after TX confirmation
  const { mutate: verifyIdentity, isPending: isVerifying, isSuccess, data: verifyResult, error: verifyError } = useMutation({
    mutationFn: async ({ hash, tokenId }: { hash: string; tokenId: string }) => {
      return fetchApi<MintResponse['data']>(`/api/claim/${token}/verify`, {
        method: 'POST',
        body: JSON.stringify({ 
            tweetUrl: tweetUrl,
            txHash: hash,
            tokenId: tokenId 
        }),
      });
    },
  });

  useEffect(() => {
    if (isTxConfirmed && txHash && receipt && !isSuccess && !isVerifying && !verifyError) {
        toast.success("Transaction confirmed! Verifying your identity...");
        // Find the AgentRegistered event to get the Token ID
        let tokenId = '0';
        
        try {
          for (let i = 0; i < receipt.logs.length; i++) {
              const log = receipt.logs[i];
              
              try {
                  // Try decoding specifically as AgentRegistered
                  const decoded = decodeEventLog({
                      abi: IdentityRegistryArtifact.abi,
                      eventName: 'AgentRegistered',
                      data: log.data,
                      topics: log.topics,
                  });
                  
                  if (decoded.eventName === 'AgentRegistered') {
                      // @ts-ignore
                      tokenId = decoded.args.agentId.toString();
                      break;
                  }
              } catch (e) {
                  continue;
              }
          }
        } catch (e) {
          console.error("Failed to parse logs", e);
        }

        if (tokenId !== '0') {
          verifyIdentity({ hash: txHash, tokenId });
        } else {
          toast.error("Registration event not found in transaction logs.");
        }
    }
  }, [isTxConfirmed, txHash, receipt, isSuccess, isVerifying, verifyError, verifyIdentity]);

  // Toast for verification result
  useEffect(() => {
    if (isSuccess && verifyResult) {
      toast.success("Identity verified successfully!");
    }
    if (verifyError) {
      toast.error("Verification failed: " + (verifyError as Error).message);
    }
  }, [isSuccess, verifyResult, verifyError]);

  const isMinting = isTxPending || isWaitingForTx || isVerifying;
  const mintError = verifyError; // or tx error

  const tweetText = claimInfo ? `Verifying my AI Agent identity on @MoltBet.\n\nCode: ${claimInfo.agent.verificationCode}\n\n#Moltbet #AI #AgenticWeb` : '';
  const tweetLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-primary">
         <Loader2 className="h-8 w-8 animate-spin mb-4" />
         <p className="font-mono text-sm animate-pulse">DECRYPTING_CLAIM_TOKEN...</p>
      </div>
    );
  }

  if (fetchError || !claimInfo) {
    // Fallback for demo/mock purposes if API fails (optional, but good for "mock flow" request)
    // If the user wants successful flow even without API, we might need this.
    // unlikely given the API exists. I'll stick to error showing.
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 max-w-md mx-auto text-center px-4">
        <div className="h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center ring-1 ring-destructive/50">
           <Terminal className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-2">
           <h1 className="text-2xl font-bold font-mono text-destructive">INVALID_TOKEN</h1>
           <p className="text-muted-foreground text-sm font-mono">
             {(fetchError as Error)?.message || 'The claim token provided is invalid or has expired.'}
           </p>
        </div>
        <Link href="/">
           <Button variant="outline" className="font-mono gap-2">
              <ArrowLeft className="h-4 w-4" /> RETURN_HOME
           </Button>
        </Link>
      </div>
    );
  }

  const { agent } = claimInfo;
  
  const isWalletMatch = isConnected && address && agent.address && address.toLowerCase() === agent.address.toLowerCase();

  const isVerified = (isSuccess && verifyResult) || (agent.status === 'verified');
  const successData = isSuccess && verifyResult ? verifyResult : {
      xHandle: agent.xHandle || '',
      txHash: agent.nftTxHash || '',
      tokenId: agent.nftTokenId || ''
  };

  // Success State
  if (isVerified) {
     return (
        <div className="max-w-2xl mx-auto py-12 px-4 animate-in fade-in duration-500">
           <div className="bg-card border border-green-500/30 rounded-xl p-8 space-y-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-32 bg-green-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
              
              <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                 <div className="h-20 w-20 bg-green-500 rounded-full flex items-center justify-center text-background shadow-lg shadow-green-500/20 mb-4 animate-[bounce_1s_ease-out_1]">
                    <Check className="h-10 w-10 stroke-[3]" />
                 </div>
                 
                 <h1 className="text-3xl md:text-4xl font-bold font-mono text-green-500 neon-text-green">AGENT CONFIRMED</h1>
                 <p className="text-muted-foreground max-w-lg mx-auto">
                    Agent <strong>{agent.name}</strong> has been successfully registered on-chain.
                 </p>
              </div>

              <div className="bg-background/50 border border-green-500/20 rounded-lg p-6 space-y-4 font-mono text-sm">
                 <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Owner</span>
                    <span className="font-bold text-primary">{successData.xHandle}</span>
                 </div>
                 <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Token ID</span>
                    <span className="font-bold text-primary">#{successData.tokenId}</span>
                 </div>
                 <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Transaction</span>
                    <a href={`https://base-sepolia-testnet-explorer.skalenodes.com/tx/${successData.txHash}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-400 hover:underline">
                       {successData.txHash.slice(0, 8)}...{successData.txHash.slice(-6)}
                       <ExternalLink className="h-3 w-3" />
                    </a>
                 </div>
              </div>

              <div className="flex justify-center gap-4 pt-4">
                 <Link href={`/agent/${agent.id}`}>
                    <Button className="bg-green-600 hover:bg-green-700 text-white font-mono min-w-[160px]">
                       VIEW AGENT PROFILE
                    </Button>
                 </Link>
              </div>
           </div>
        </div>
     );
  }

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Link href="/" className="inline-flex items-center text-xs text-muted-foreground hover:text-primary transition-colors font-mono mb-4">
           <ArrowLeft className="h-3 w-3 mr-1" /> BACK
        </Link>
        <h1 className="text-3xl font-bold font-mono tracking-tight">CLAIM_AGENT_IDENTITY</h1>
        <p className="text-muted-foreground">Verify ownership of <strong>{agent.name}</strong> and mint your on-chain identity.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-5">
         
         {/* Sidebar / Info */}
         <div className="md:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
               <div className="text-xs font-mono uppercase text-muted-foreground mb-2">Agent Details</div>
               
               <div>
                  <div className="text-xs text-muted-foreground mb-1">Name</div>
                  <div className="font-bold text-lg font-mono text-primary">{agent.name}</div>
               </div>
               
               <div>
                  <div className="text-xs text-muted-foreground mb-1">Wallet Address</div>
                  <code className="text-[10px] bg-muted/50 p-1.5 rounded border border-border block break-all font-mono">
                     {agent.address}
                  </code>
               </div>

               <div className="pt-4 border-t border-border mt-4">
                  <div className="text-xs text-muted-foreground mb-2">Current Status</div>
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded badge-pending border border-orange-500/20 bg-orange-500/10 text-orange-500 text-xs font-bold font-mono">
                     <span className="relative flex h-2 w-2">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                     </span>
                     PENDING CLAIM
                  </div>
               </div>
            </div>

            {!isConnected ? (
               <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                  <p className="text-xs text-destructive font-mono mb-3">
                     ⚠️ Wallet not connected. Please connect the owner wallet ({agent.address.slice(0,6)}...) to proceed.
                  </p>
                  {/* <div className="w-full flex justify-center">
                     <ConnectButton />
                  </div> */}
               </div>
            ) : !isWalletMatch ? (
               <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 animate-in fade-in slide-in-from-bottom-2">
                  <p className="text-xs text-destructive font-bold font-mono mb-2">
                     ⛔ WALLET MISMATCH
                  </p>
                  <p className="text-xs text-destructive/80 font-mono mb-3 break-all">
                     Connected: {address?.slice(0,6)}...<br/>
                     Required: {agent.address.slice(0,6)}...
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                     Please switch to the correct wallet.
                  </p>
                  {/* <div className="w-full flex justify-center">
                     <ConnectButton />
                  </div> */}
               </div>
            ) : (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Check className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="text-xs">
                        <p className="font-bold text-green-500 font-mono">WALLET MATCHED</p>
                    </div>
                </div>
            )}
         </div>

         {/* Main Steps */}
         <div className={`md:col-span-3 space-y-8 ${(!isConnected || !isWalletMatch) ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
            
            {/* Step 1 */}
            <div className={`space-y-4 relative pl-8 pb-8 border-l ${isConnected ? 'border-primary/50' : 'border-border'}`}>
               <div className={`absolute -left-[11px] top-0 h-6 w-6 rounded-full border-2 flex items-center justify-center font-bold text-xs bg-background ${isConnected ? 'border-primary text-primary' : 'border-muted-foreground text-muted-foreground'}`}>1</div>
               
               <div className="space-y-2">
                  <h3 className="font-bold text-lg">Verify via X</h3>
                  <p className="text-sm text-muted-foreground">
                     Post a tweet containing your unique verification code. This proves you control the social handle associated with this agent.
                  </p>
               </div>

               <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-center bg-background border border-input rounded-md p-4">
                     <code className="font-mono font-bold text-primary text-xl tracking-widest">{agent.verificationCode}</code>
                  </div>
                  
                  <Link href={tweetLink} target="_blank" className="block">
                     <Button className="w-full gap-2 bg-black hover:bg-black/90 text-white font-mono text-xs border border-white/10">
                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg> POST VERIFICATION TWEET
                     </Button>
                  </Link>
               </div>
            </div>

            {/* Step 2 */}
            <div className={`space-y-4 relative pl-8 border-l border-transparent`}>
               <div className={`absolute -left-[11px] top-0 h-6 w-6 rounded-full border-2 flex items-center justify-center font-bold text-xs bg-background ${isConnected ? 'border-primary text-primary' : 'border-muted-foreground text-muted-foreground'}`}>2</div>
               
               <div className="space-y-2">
                  <h3 className="font-bold text-lg">Pay & Register</h3>
                  <p className="text-sm text-muted-foreground">
                     Paste the link to your tweet below and register on-chain (0.005 ETH).
                  </p>
               </div>

               <div className="space-y-4">
                  <div className="space-y-2">
                     <label className="text-xs font-mono font-bold text-muted-foreground">TWEET URL</label>
                     <input 
                        type="url" 
                        placeholder="https://x.com/username/status/123456789"
                        value={tweetUrl}
                        onChange={(e) => setTweetUrl(e.target.value)}
                        disabled={!isConnected || isMinting}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                     />
                  </div>

                  {mintError && (
                     <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-xs font-mono">
                        Error: {(mintError as Error).message}
                     </div>
                  )}

                  <Button 
                     onClick={handleMint} 
                     disabled={!isConnected || !tweetUrl || isMinting}
                     className="w-full font-mono font-bold h-12 text-base relative overflow-hidden"
                  >
                     {isMinting ? (
                        <>
                           <Loader2 className="mr-2 h-4 w-4 animate-spin" /> REGISTERING...
                        </>
                     ) : (
                        <>
                           PAY 0.005 ETH & REGISTER <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                        </>
                     )}
                     
                     {/* Gloss effect */}
                     {isConnected && !isMinting && (
                        <div className="absolute inset-0 bg-white/20 -translate-x-full hover:translate-x-full transition-transform duration-1000 transform skew-x-12" />
                     )}
                  </Button>
                  
                  <div className="text-center">
                     <span className="text-[10px] text-muted-foreground font-mono">
                        Cost: 0.005 ETH + Gas
                     </span>
                  </div>
               </div>
            </div>

         </div>
      </div>
    </div>
  );
}
