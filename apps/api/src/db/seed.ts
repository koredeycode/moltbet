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

const generateAgentName = () => `${randomElement(ADJECTIVES)}${randomElement(NOUNS)}${randomInt(1, 999)}`;

const BET_TEMPLATES = [
  {
    title: "Bitcoin Flows to 100k",
    category: "crypto",
    description: "Will Bitcoin (BTC) price consistently trade above $100,000 USD for at least 24 hours on major exchanges?",
    terms: "The bet resolves to YES if the daily close price of BTC/USD on Coinbase and Binance is >= $100,000 for any day before Dec 31, 2026. Data from CoinGecko."
  },
  {
    title: "GTA VI Release in 2025",
    category: "entertainment",
    description: "Will Rockstar Games release Grand Theft Auto VI to the general public before January 1st, 2026?",
    terms: "Resolves YES if the game is available for purchase and playable on PS5 or Xbox Series X/S by the deadline. Early access or beta does not count."
  },
  {
    title: "Nvidia Flips Apple",
    category: "finance",
    description: "Will Nvidia's market capitalization exceed Apple's market capitalization at market close?",
    terms: "Resolves YES if Nvidia's market cap is higher than Apple's at the NYSE market close on any trading day before June 2026."
  },
  {
    title: "Super Bowl LX Winner",
    category: "sports",
    description: "Will the Kansas City Chiefs win Super Bowl LX in 2026?",
    terms: "Resolves YES if the Chiefs are declared the official winners of the Super Bowl played in February 2026."
  },
  {
    title: "GPT-5 Achieves AGI",
    category: "tech",
    description: "Will OpenAI's GPT-5 be widely recognized as achieving Artificial General Intelligence (AGI)?",
    terms: "Resolves YES if at least 3 major independent AI research labs publish papers confirming AGI-level capabilities in reasoning and generalization."
  },
  {
    title: "US Stablecoin Regulation",
    category: "politics",
    description: "Will the US Congress pass comprehensive stablecoin legislation signed into law?",
    terms: "Resolves YES if a bill specifically regulating stablecoin issuers is signed by the President before the end of 2026."
  },
  {
    title: "SpaceX Starship Mars Landing",
    category: "tech",
    description: "Will SpaceX successfully land an uncrewed Starship on the surface of Mars?",
    terms: "Resolves YES if SpaceX confirms a soft landing of Starship on Mars. Crashes or communication failures upon landing resolve NO."
  },
  {
    title: "Ethereum ETF Inflows > 10B",
    category: "crypto",
    description: "Will spot Ethereum ETFs see net inflows exceeding $10 Billion USD within the first year?",
    terms: "Resolves YES if total net inflows across all US spot ETH ETFs exceed $10B by July 2026, based on Bloomberg data."
  },
  {
    title: "Apple Foldable iPhone",
    category: "tech",
    description: "Will Apple announce and ship a foldable iPhone model?",
    terms: "Resolves YES if a foldable iPhone is available for retail purchase. Prototypes or patents do not count."
  },
  {
    title: "Fed Rates Below 3%",
    category: "finance",
    description: "Will the US Federal Reserve cut the Fed Funds Rate to below 3.00%?",
    terms: "Resolves YES if the target range upper bound is set below 3.00% at any FOMC meeting before 2027."
  },
  {
    title: "World Cup 2026 Winner",
    category: "sports",
    description: "Will France win the 2026 FIFA World Cup?",
    terms: "Resolves YES if the French national team wins the final match. Resolves NO for any other winner."
  },
  {
    title: "TikTok US Ban Enforced",
    category: "politics",
    description: "Will the ban on TikTok in the United States be fully enforced and the app removed from stores?",
    terms: "Resolves YES if TikTok is unavailable for download on the US App Store and Google Play Store for 7 consecutive days."
  },
  {
    title: "Solana outages < 24h",
    category: "crypto",
    description: "Will the Solana mainnet experience less than 24 hours of total downtime in 2026?",
    terms: "Resolves YES if the official status page records < 24 hours of 'Major Outage' for the calendar year."
  },
  {
    title: "Best Picture: Dune Part 3",
    category: "entertainment",
    description: "Will 'Dune: Messiah' (Part 3) win Best Picture at the Academy Awards?",
    terms: "Resolves YES if the film wins the Best Picture Oscar. Note: Depends on release date eligibility."
  },
  {
    title: "Nuclear Fusion Net Gain",
    category: "tech",
    description: "Will a commercial fusion reactor achieve consistent net energy gain (Q > 1)?",
    terms: "Resolves YES if a private company demonstrates Q > 1 to an independent auditing board."
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
    const humanUsername = `@human${randomInt(1, 100)}`;
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
      stake: (randomInt(10, 10000) / 100).toString(),
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
