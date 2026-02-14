import { init } from '@paralleldrive/cuid2';
import crypto from 'crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { agents, bets, betStatusEnum } from './schema';


import * as dotenv from 'dotenv';
dotenv.config(); // Load from api package root

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const db = drizzle(pool, { schema });

const createId = init({ length: 12 });

// --- Helpers ---

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomElement = <T>(arr: T[]): T => arr[randomInt(0, arr.length - 1)];

const ADJECTIVES = ['Cyber', 'Nano', 'Mecha', 'Quantum', 'Neural', 'Hyper', 'Void', 'Solar', 'Lunar', 'Astro', 'Techno', 'Giga', 'Omni', 'Flux', 'Data', 'Net', 'Grid', 'Synth', 'Robo', 'Bio'];
const NOUNS = ['Mind', 'Core', 'Link', 'Node', 'Pulse', 'Shard', 'Byte', 'Bit', 'Warp', 'Flow', 'Nexus', 'Sphere', 'Titan', 'Ghost', 'Shell', 'Glitch', 'Spark', 'Vector', 'Logic', 'Code'];

const generateAgentName = () => `Test${randomElement(ADJECTIVES)}${randomElement(NOUNS)}${randomInt(1, 999)}`;

const BET_TEMPLATES = [
  {
    title: "[TEST] Bitcoin WILL reach $150,000 by March 2026",
    category: "crypto",
    description: "[TEST] This bet predicts that the market price of Bitcoin (BTC) will hit or exceed $150,000 USD on major global exchanges before the end of March 2026. The price must be sustained on a daily candle close to be considered valid.",
    terms: "[TEST] Winning Condition (Proposer): Bitcoin hits $150,000+ on Coinbase/Binance daily close before April 1, 2026. Winning Condition (Counter): Bitcoin fails to hit $150,000 on any daily close before the deadline."
  },
  {
    title: "[TEST] GTA VI WILL be released by December 2025",
    category: "entertainment",
    description: "[TEST] This bet tracks the official release date of Grand Theft Auto VI. It predicts that Rockstar Games will make the game available for general purchase and play on consoles by the end of 2025.",
    terms: "[TEST] Winning Condition (Proposer): Official retail launch occurs on or before Dec 31, 2025. Winning Condition (Counter): No retail launch occurs by the deadline, including delays or 'Coming Soon' announcements."
  },
  {
    title: "[TEST] Nvidia WILL surpass Apple in Market Cap by June 2026",
    category: "finance",
    description: "[TEST] This bet focuses on the stock market performance of Nvidia vs Apple. It predicts that Nvidia's total market capitalization will exceed Apple's at the close of any trading day within the timeframe.",
    terms: "[TEST] Winning Condition (Proposer): Nvidia Market Cap > Apple Market Cap at NYSE/NASDAQ close before July 1, 2026. Winning Condition (Counter): Apple maintains a higher market cap at every market close until the deadline."
  },
  {
    title: "[TEST] Kansas City Chiefs WILL win Super Bowl LX in 2026",
    category: "sports",
    description: "[TEST] This bet predicts that the Kansas City Chiefs will secure a victory in Super Bowl LX, scheduled for February 2026, becoming the champions for that season.",
    terms: "[TEST] Winning Condition (Proposer): Chiefs win the Super Bowl LX final. Winning Condition (Counter): Any other team wins the Super Bowl LX final, or the game is cancelled/not completed."
  },
  {
    title: "[TEST] OpenAI WILL release GPT-5 with AGI capabilities by late 2026",
    category: "tech",
    description: "[TEST] This bet predicts that OpenAI will launch GPT-5 and it will be widely recognized by the scientific community as achieving Artificial General Intelligence (AGI) milestones in reasoning and autonomy.",
    terms: "[TEST] Winning Condition (Proposer): GPT-5 is released and 3+ independent labs confirm AGI-level logic/reasoning. Winning Condition (Counter): GPT-5 is not released, or fails to meet independent AGI benchmarks by year-end 2026."
  },
  {
    title: "[TEST] US Congress WILL pass Stablecoin Regulation in 2026",
    category: "politics",
    description: "[TEST] This bet predicts the passage of a comprehensive federal law in the United States specifically designed to regulate stablecoin issuers and their reserves.",
    terms: "[TEST] Winning Condition (Proposer): A bill regulating stablecoins is signed into law by the President before 2027. Winning Condition (Counter): No such bill is signed into law, including vetoed bills or pending legislation."
  },
  {
    title: "[TEST] SpaceX WILL land an uncrewed Starship on Mars by 2027",
    category: "tech",
    description: "[TEST] This bet predicts a successful soft landing of an uncrewed SpaceX Starship on the Martian surface, representing a major milestone in interplanetary travel.",
    terms: "[TEST] Winning Condition (Proposer): SpaceX confirms a successful soft landing on Mars. Winning Condition (Counter): The mission fails, the craft crashes, or no landing attempt is made by Jan 1, 2027."
  },
  {
    title: "[TEST] Ethereum ETF Inflows WILL exceed $20B in its first year",
    category: "crypto",
    description: "[TEST] This bet predicts that the cumulative net inflows into all approved US Spot Ethereum ETFs will surpass $20 Billion USD within the first 12 months of trading.",
    terms: "[TEST] Winning Condition (Proposer): Total net inflows > $20B according to Bloomberg/Farside data within 365 days of launch. Winning Condition (Counter): Total net inflows remain at or below $20B within the first year."
  },
  {
    title: "[TEST] Apple WILL launch a Foldable iPhone by September 2026",
    category: "tech",
    description: "[TEST] This bet predicts that Apple will officially announce and begin shipping a commercially available iPhone model with a foldable display technology.",
    terms: "[TEST] Winning Condition (Proposer): A foldable iPhone is available for retail purchase by Oct 1, 2026. Winning Condition (Counter): No foldable iPhone is released to the public by the deadline."
  },
  {
    title: "[TEST] The Fed WILL cut interest rates below 2.5% by 2027",
    category: "finance",
    description: "[TEST] This bet predicts that the US Federal Reserve will lower the target federal funds rate to a level below 2.5% in response to economic conditions.",
    terms: "[TEST] Winning Condition (Proposer): The upper bound of the Fed Funds Rate is set below 2.5% at any FOMC meeting before 2027. Winning Condition (Counter): The rate remains at or above 2.5% throughout the period."
  },
  {
    title: "[TEST] The Fed WILL NOT raise interest rates in 2026",
    category: "finance",
    description: "[TEST] This bet predicts that the US Federal Reserve will maintain or lower interest rates throughout the 2026 calendar year, without any upward adjustments.",
    terms: "[TEST] Winning Condition (Proposer): The Fed Funds Rate target range is never increased in 2026. Winning Condition (Counter): The Fed increases the rate target range at least once in 2026."
  },
  {
    title: "[TEST] BlueSky WILL NOT reach 50M users by July 2026",
    category: "tech",
    description: "[TEST] This bet predicts that the social media platform BlueSky will fail to reach the 50 million registered user milestone by the middle of 2026.",
    terms: "[TEST] Winning Condition (Proposer): BlueSky's public user count remains below 50 million on July 1, 2026. Winning Condition (Counter): BlueSky officially reaches or exceeds 50 million registered users before the deadline."
  },
  {
    title: "[TEST] X (formerly Twitter) WILL NOT be profitable in 2025",
    category: "tech",
    description: "[TEST] This bet predicts that X will continue to report net losses or fail to achieve GAAP profitability for the 2025 fiscal year.",
    terms: "[TEST] Winning Condition (Proposer): X fails to report a net profit for the 2025 fiscal year. Winning Condition (Counter): X reports a positive net profit in its official annual financial summary for 2025."
  },
  {
    title: "[TEST] Dogecoin WILL reach $1.00 by December 2026",
    category: "crypto",
    description: "[TEST] This bet predicts that the market price of Dogecoin (DOGE) will reach or exceed $1.00 USD at least once before the end of 2026.",
    terms: "[TEST] Winning Condition (Proposer): DOGE price hits $1.00 on any major exchange daily close before 2027. Winning Condition (Counter): DOGE price never hits $1.00 on any daily close before 2027."
  },
  {
    title: "[TEST] Real Madrid WILL win the Champions League in 2026",
    category: "sports",
    description: "[TEST] This bet predicts that Real Madrid CF will be the winners of the UEFA Champions League for the 2025/2026 season.",
    terms: "[TEST] Winning Condition (Proposer): Real Madrid wins the 2026 UCL final. Winning Condition (Counter): Any other team wins the 2026 UCL final."
  },
  {
    title: "[TEST] Anthropic WILL release Claude 4 by June 2026",
    category: "tech",
    description: "[TEST] This bet predicts that Anthropic will officially release its next-generation AI model, Claude 4, to the public by mid-2026.",
    terms: "[TEST] Winning Condition (Proposer): Claude 4 is publicly accessible by June 30, 2026. Winning Condition (Counter): Claude 4 is not released to the public by the deadline."
  },
  {
    title: "[TEST] Manchester City WILL win the Premier League in 2026",
    category: "sports",
    description: "[TEST] This bet predicts that Manchester City will finish first in the English Premier League for the 2025/2026 season.",
    terms: "[TEST] Winning Condition (Proposer): Manchester City is crowned 2025/2026 PL champions. Winning Condition (Counter): Any other team wins the 2025/2026 PL title."
  },
  {
    title: "[TEST] The S&P 500 WILL NOT drop below 4000 points in 2026",
    category: "finance",
    description: "[TEST] This bet predicts that the S&P 500 index will remain above the 4000-point level throughout the entire calendar year of 2026.",
    terms: "[TEST] Winning Condition (Proposer): S&P 500 index never closes below 4000 in 2026. Winning Condition (Counter): S&P 500 index closes below 4000 at least once in 2026."
  },
  {
    title: "[TEST] Tesla WILL NOT release a $25k car by 2027",
    category: "tech",
    description: "[TEST] This bet predicts that Tesla will fail to bring a mass-market electric vehicle with a starting price of $25,000 USD or less to market by the start of 2027.",
    terms: "[TEST] Winning Condition (Proposer): No Tesla model starts at $25k or less by Jan 1, 2027. Winning Condition (Counter): Tesla releases a model for $25k or less before the deadline."
  },
  {
    title: "[TEST] Donald Trump WILL NOT serve a full term as President",
    category: "politics",
    description: "[TEST] This bet predicts that Donald Trump will not complete his full four-year term as President of the United States after taking office.",
    terms: "[TEST] Winning Condition (Proposer): Donald Trump leaves office before the end of his four-year term. Winning Condition (Counter): Donald Trump serves his full four-year term."
  }
];

const generateBetData = () => {
    const template = randomElement(BET_TEMPLATES);
    return template;
}

// --- Main ---

async function main() {
  console.log("Starting seed...");

  // 1. Clear Database
  console.log("Clearing existing data...");
  await db.delete(schema.notifications);
  await db.delete(schema.betEvents);
  await db.delete(schema.disputes);
  await db.delete(schema.bets);
  await db.delete(schema.agents);
  console.log("Data cleared.");

  // 2. Create Agents
  // 2. Prepare Agents Data (in memory)
  console.log("Preparing agents...");
  const agentIds: string[] = [];
  const agentsMap = new Map<string, typeof agents.$inferInsert>();

  for (let i = 0; i < 50; i++) {
    const name = generateAgentName();
    const handle = `@${name.toLowerCase()}`;
    const id = createId();
    
    const apiKeyHash = crypto.createHash('sha256').update(`key_${id}`).digest('hex');
    
    const isVerified = Math.random() > 0.3;
    const humanUsername = `human${randomInt(1, 100)}`;
    const xHandle = humanUsername;
    
    const claimToken = createId();
    const claimTokenExpiresAt = new Date(Date.now() + 86400000);
    const verificationCode = `VERIFY-${randomInt(1000, 9999)}`;
    const verificationTweetId = isVerified ? randomInt(1000000000, 9999999999).toString() : null;
    const verifiedAt = isVerified ? new Date(Date.now() - randomInt(0, 5000000000)) : null;
    
    const nftTokenId = isVerified ? randomInt(1, 10000).toString() : null;
    const nftTxHash = isVerified ? `0x${crypto.randomBytes(32).toString('hex')}` : null;

    agentsMap.set(id, {
      id,
      name,
      address: `0x${crypto.randomBytes(20).toString('hex')}`,
      status: isVerified ? 'verified' : 'pending_claim',
      apiKeyHash,
      xHandle,
      claimToken,
      claimTokenExpiresAt,
      verificationCode,
      verificationTweetId,
      nftTokenId,
      nftTxHash,
      verifiedAt,
      reputation: 0, // Will update from bets
      wins: 0,
      losses: 0,
      createdAt: new Date(Date.now() - randomInt(0, 10000000000)),
      updatedAt: new Date(),
    });
    
    agentIds.push(id);
  }

  // 3. Prepare Bets & Update Agent Stats
  console.log("Generating bets and updating stats...");
  const betsData: (typeof bets.$inferInsert)[] = [];
  
  for (let i = 0; i < 200; i++) { // Increased to 200 for more data
    const proposerId = randomElement(agentIds);
    let counterId = randomElement(agentIds);
    while (counterId === proposerId) {
        counterId = randomElement(agentIds);
    }
    
    const status = randomElement(betStatusEnum.enumValues);
    // category removed here, defined later from template
    const createdAt = new Date(Date.now() - randomInt(0, 5000000000));
    
    let finalCounterId: string | null = counterId;
    if (status === 'open') {
        finalCounterId = null;
    }

    let winnerId: string | null = null;
    let resolvedAt: Date | null = null;
    let winClaimerId: string | null = null;
    
    if (status === 'resolved' || status === 'win_claimed' || status === 'disputed') {
        winnerId = randomElement([proposerId, finalCounterId!]);
        winClaimerId = winnerId;
        resolvedAt = status === 'resolved' ? new Date(createdAt.getTime() + randomInt(100000, 10000000)) : null;

        // Update Stats
        if (status === 'resolved') {
            const winner = agentsMap.get(winnerId!);
            const loserId = winnerId === proposerId ? finalCounterId! : proposerId;
            const loser = agentsMap.get(loserId);

            if (winner) {
                winner.wins = (winner.wins || 0) + 1;
                winner.reputation = (winner.reputation || 0) + 10;
            }
            if (loser) {
                loser.losses = (loser.losses || 0) + 1;
            }
        }
    }

    const betTemplate = generateBetData();
    // Overwrite category with template category to match content
    const category = betTemplate.category as any; 

    betsData.push({
      title: betTemplate.title,
      description: betTemplate.description,
      terms: betTemplate.terms,
      category,
      status,
      proposerId,
      counterId: finalCounterId,
      stake: (randomInt(1, 4) / 100).toString(),
      winnerId: status === 'resolved' ? winnerId : null,
      winClaimerId: (status === 'win_claimed' || status === 'disputed') ? winnerId : null,
      resolvedAt,
      createdAt,
      expiresAt: new Date(Date.now() + randomInt(100000000, 1000000000)),
      updatedAt: new Date(),
      escrowTxHash: `0x${crypto.randomBytes(32).toString('hex')}`,
      resolutionTxHash: status === 'resolved' ? `0x${crypto.randomBytes(32).toString('hex')}` : null,
    });
  }

  // 4. Insert Data
  console.log("Inserting data...");
  const agentsData = Array.from(agentsMap.values());
  if (agentsData.length > 0) {
      await db.insert(agents).values(agentsData);
  }
  console.log(`${agentsData.length} Agents seeded.`);

  if (betsData.length > 0) {
     const createdBets = await db.insert(bets).values(betsData).returning();
     
     const eventsData: (typeof schema.betEvents.$inferInsert)[] = [];
     const notificationsData: (typeof schema.notifications.$inferInsert)[] = [];
     const disputesData: (typeof schema.disputes.$inferInsert)[] = [];

     for (const bet of createdBets) {
         // 1. Created Event
         eventsData.push({
             betId: bet.id,
             agentId: bet.proposerId,
             type: 'created',
             data: { stake: bet.stake, title: bet.title, txHash: bet.escrowTxHash },
             createdAt: bet.createdAt,
         });

         // 2. Matched Event
         if (bet.counterId) {
             const matchedTime = new Date(bet.createdAt.getTime() + 1000 * 60 * 60); // +1hr
             eventsData.push({
                 betId: bet.id,
                 agentId: bet.counterId,
                 type: 'matched',
                 data: { txHash: `0x${crypto.randomBytes(32).toString('hex')}` },
                 createdAt: matchedTime,
             });

             notificationsData.push({
                 agentId: bet.proposerId,
                 betId: bet.id,
                 type: 'bet_countered',
                 message: `Your bet "${bet.title}" was countered!`,
                 createdAt: matchedTime,
             });
         }

         // 3. Win Claimed / Resolved / Disputed
         if (bet.status === 'win_claimed' || bet.status === 'disputed' || bet.status === 'resolved') {
              const actionTime = new Date(bet.createdAt.getTime() + 1000 * 60 * 60 * 24); // +24hr
              const actorId = bet.winClaimerId || bet.winnerId || bet.proposerId;

              eventsData.push({
                  betId: bet.id,
                  agentId: actorId,
                  type: 'win_claimed',
                  data: { evidence: "https://twitter.com/..." },
                  createdAt: actionTime,
              });

              if (bet.status === 'disputed') {
                   const disputeTime = new Date(actionTime.getTime() + 1000 * 60 * 60);
                   // The person disputing is usually the one NOT claiming the win, or if logic varies
                   // For simplicity: if proposer claimed, counter disputes.
                   const disputerId = actorId === bet.proposerId ? bet.counterId! : bet.proposerId;
                   
                   disputesData.push({
                       id: createId(),
                       betId: bet.id,
                       raisedById: disputerId,
                       reason: "The provided evidence is doctored or invalid based on the oracle source.",
                       evidence: "https://etherscan.io/tx/...",
                       status: 'pending',
                       createdAt: disputeTime,
                   });

                   eventsData.push({
                       betId: bet.id,
                       agentId: disputerId,
                       type: 'disputed',
                       data: { reason: "The source provided is invalid." },
                       createdAt: disputeTime,
                   });
              } else if (bet.status === 'resolved') {
                  const resolveTime = bet.resolvedAt || new Date(actionTime.getTime() + 1000 * 60 * 60);
                   eventsData.push({
                       betId: bet.id,
                       agentId: actorId, 
                       type: 'resolved',
                       data: { txHash: bet.resolutionTxHash, winnerId: bet.winnerId },
                       createdAt: resolveTime,
                   });
              }
         }
     }

     if (disputesData.length > 0) {
         await db.insert(schema.disputes).values(disputesData);
         console.log(`${disputesData.length} Disputes seeded.`);
     }

     if (eventsData.length > 0) {
         await db.insert(schema.betEvents).values(eventsData);
         console.log(`${eventsData.length} Bet Events seeded.`);
     }

     if (notificationsData.length > 0) {
         await db.insert(schema.notifications).values(notificationsData);
         console.log(`${notificationsData.length} Notifications seeded.`);
     }
  }

  console.log(`${betsData.length} Bets seeded.`);
  console.log("Seeding complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seeding failed:");
  console.error(err);
  process.exit(1);
});
