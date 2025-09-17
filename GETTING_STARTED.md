# Getting Started with Yellow CLI Auction Platform

A comprehensive guide to installing, configuring, and running the Yellow Network CLI auction system for gasless digital art auctions.

## ✨ Key Features

- **🚫 Zero Gas Fees**: Bid unlimited times without paying transaction costs
- **🎯 Auctions**: Bid, Create, Watch & Settle Auctions - all auctions track auction ID
- **🔗 State Channels**: Check open and close state channels across EVM Chains
- **📡 Connection Status**: Verify and check anytime
- **💼 Wallet Management**: Show wallet info, create new wallet, import/export wallet
- **⚡ Real-time Updates**: Instant bid processing via WebSocket connections
- **🔐 Production Security**: EIP-712 authentication with dual-key architecture
- **💰 Real USDC Integration**: Uses actual USDC channels on Polygon network
- **👥 Multi-user Support**: Multiple terminals can participate simultaneously

## Prerequisites

Before you begin, ensure you have the following:

- **Node.js 18+** installed on your system
- **npm** or **yarn** package manager
- **Wallet with USDC** on Polygon network (for real auctions)
- **Private key access** to your wallet
- **Terminal/Command Line** experience

## Quick Start

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/your-username/yellow-cli-auction
cd yellow-cli-auction

# Install dependencies
npm install

# Build the project
npm run build
```

### 2. Configuration

Create your environment file:

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` with your private key:
```env
PRIVATE_KEY=0x1234567890abcdef...  # Your actual private key
CLEARNODE_URL=wss://clearnet.yellow.com/ws
NETWORK=polygon
APP_NAME=Yellow CLI Dapp
SCOPE=app.cli.dapp
```

⚠️ **Security Note**: Never commit your `.env` file with real private keys to version control.

### 3. Authentication Setup

The Yellow SDK uses a dual-key authentication pattern:

- **Main Wallet**: Your actual wallet that holds USDC (signs authentication)
- **Session Key**: Temporary key generated for each session (used for participant role)

This separation ensures security while enabling gasless transactions through state channels.

### 4. First Run

Test the installation:
```bash
npm run cli interactive
```

You should see the interactive menu with wallet and auction operations.

## Step-by-Step Tutorial

### Step 1: Create Your First Wallet

```bash
npm run cli interactive
```

Then select:
- "Wallet Operations"
- "Create New Wallet"

**What happens:**
- A new Ethereum wallet is generated
- Private key is securely stored in `~/.yellow-cli/wallet-{sessionId}.json`
- You'll see your wallet address displayed

**Example Output:**
```
✨ Created new wallet: 0xBdDa92101ca5DbD1D43CFBecC47f73D4BC68Ed37
✅ Wallet created successfully!
Address: 0xBdDa92101ca5DbD1D43CFBecC47f73D4BC68Ed37

⚠️  Make sure to backup your wallet using: wallet export
```

### Step 2: View Wallet Information

In the interactive menu:
- Select "Wallet Operations"
- Choose "Show Wallet Information"

**What you'll see:**
- Your wallet address
- Current status
- Session information

### Step 3: Start Interactive Mode

```bash
npm run cli interactive
```

**What you'll see:**
```
? What would you like to do?
❯ Wallet Operations
  Auction Operations
  Channel Operations
  Exit
```

Select "Auction Operations" then "List Active Auctions"

**What happens:**
- Connects to ClearNode (Yellow's message relay)
- Authenticates using EIP-712 signing
- Displays all active auctions in the marketplace

**Example Output:**
```
🏛️  Active Auctions

1. Digital Art Piece
   ID: auction-1234567890-abc123
   Category: digital_art
   Description: Beautiful digital artwork
   Current Bid: $0.50 USDC
   Leading Bidder: 0xF710F0...
   Time Left: 2h 15m
   Seller: 0x5A2651...
```

### Step 4: Place Your First Bid

In the interactive menu:
- Select "Auction Operations"
- Choose "Place Bid"
- Select the auction you want to bid on
- Enter your bid amount (e.g., 0.75)

**What happens:**
- Authenticates with ClearNode
- Creates off-chain bid transaction
- Updates auction state via state channels
- No gas fees required!

**Example Output:**
```
💰 Place Bid

✔ Wallet initialized
✔ Connected to ClearNode
✔ Authentication successful
✔ Bid placed successfully!

✅ Bid Placed!
Amount: $0.75 USDC
Auction: Digital Art Piece
```

### Step 5: Watch Auction in Real-Time

In the interactive menu:
- Select "Auction Operations"
- Choose "Watch Auction"
- Select the auction to monitor

**What you'll see:**
- Live updates as other users place bids
- Real-time countdown timer
- Current winning bid information

## Multi-Wallet Setup

### Terminal 1 - Create Auction

```bash
npm run cli interactive
```

Follow the menu:
1. Select "Wallet Operations" → "Create New Wallet"
2. Select "Auction Operations" → "Create Auction"
3. Enter auction details:
   - **Title**: "My Digital Art"
   - **Description**: "Unique digital artwork"
   - **Category**: "digital_art"
   - **Starting Price**: "0.5"
   - **Duration**: "2" (hours)

### Terminal 2 - Bid on Auction

Open a new terminal window:

```bash
npm run cli interactive
```

Follow the menu:
1. Select "Wallet Operations" → "Create New Wallet"
2. Select "Auction Operations" → "List Active Auctions"
3. Select "Auction Operations" → "Place Bid"
4. Choose the auction and enter bid amount: "0.75"

### Terminal 3 - Another Bidder

Open a third terminal:

```bash
npm run cli interactive
```

Follow the menu:
1. Select "Wallet Operations" → "Create New Wallet"
2. Select "Auction Operations" → "Place Bid"
3. Outbid Terminal 2 with amount: "1.0"

**All terminals will see the updated auction state!**

## Interactive Mode

The recommended way to use the CLI is through interactive mode:

```bash
npm run cli interactive
```

This provides a menu-driven interface:
```
? What would you like to do?
❯ Wallet Operations
  Auction Operations
  Channel Operations
  Exit
```

## 🏗️ Core Technical Architecture

Understanding how the Yellow CLI works under the hood will help you build better applications and troubleshoot issues effectively.

### 🔐 Dual-Key Authentication System

The Yellow CLI uses a sophisticated dual-key authentication system that separates wallet identity from session participation:

- **Main Wallet**: Your identity and fund ownership (signs authentication challenges)
- **Session Key**: Temporary key for state channel participation (used in transactions)
- **EIP-712 Signing**: Structured message signing for security and user consent

```typescript
// EIP-712 Domain and Type Definitions
const domain = {
  name: 'Yellow CLI Dapp',
  version: '1'
};

const types = {
  Policy: [
    { name: 'challenge', type: 'string' },
    { name: 'scope', type: 'string' },
    { name: 'wallet', type: 'address' },
    { name: 'application', type: 'address' },
    { name: 'participant', type: 'address' },
    { name: 'expire', type: 'uint256' },
    { name: 'allowances', type: 'Allowance[]' }
  ],
  Allowance: [
    { name: 'asset', type: 'address' },
    { name: 'amount', type: 'uint256' }
  ]
};

// Message Structure for Authentication
const message = {
  challenge: uuid,              // From ClearNode
  scope: 'app.cli.dapp',       // Application scope
  wallet: walletAddress,        // Main wallet (your identity)
  application: walletAddress,   // App identifier
  participant: sessionAddress,  // Session key (temporary)
  expire: timestamp,           // Token expiration
  allowances: []              // Token permissions
};

// EIP-712 Signature Generation
const signature = await wallet._signTypedData(domain, types, message);
```

### 🔄 Complete Authentication Flow

The authentication process follows this sequence:

```typescript
// 1. WebSocket Connection to ClearNode
const ws = new WebSocket('wss://clearnet.yellow.com/ws');

// 2. Send Authentication Request
const authRequest = {
  jsonrpc: '2.0',
  method: 'auth_request',
  params: [{
    scope: 'app.cli.dapp',
    wallet: walletAddress
  }],
  id: 1
};

// 3. Receive Challenge from ClearNode
const challengeResponse = {
  jsonrpc: '2.0',
  result: {
    challenge: '97ee2ce8-9f1d-4368-9801-ba4497cc0659'  // UUID
  },
  id: 1
};

// 4. Sign EIP-712 Message with Challenge
const signature = await wallet._signTypedData(domain, types, {
  challenge: challengeResponse.result.challenge,
  scope: 'app.cli.dapp',
  wallet: walletAddress,
  application: walletAddress,
  participant: sessionAddress,
  expire: Math.floor(Date.now() / 1000) + 86400, // 24 hours
  allowances: []
});

// 5. Send Verification with Signature
const verifyRequest = {
  jsonrpc: '2.0',
  method: 'auth_verify',
  params: [{
    challenge: challengeResponse.result.challenge,
    signature: signature
  }],
  id: 2
};

// 6. Receive JWT Token Response
const tokenResponse = {
  jsonrpc: '2.0',
  result: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    expires: 1757977330
  },
  id: 2
};
```

### 🔑 Session Management

Each terminal maintains isolated authentication:

```typescript
// Terminal Session Isolation
export class WalletManager {
  constructor() {
    const homeDir = os.homedir();
    this.yellowDir = path.join(homeDir, '.yellow-cli');
    
    // Use terminal session ID for wallet isolation
    const sessionId = process.env.TERM_SESSION_ID || process.ppid || 'default';
    this.walletFile = path.join(this.yellowDir, `wallet-${sessionId}.json`);
    this.sessionFile = path.join(this.yellowDir, `session-${sessionId}.json`);
  }
  
  async saveSession(token: string, expires: number) {
    const sessionData = {
      token,
      expires,
      walletAddress: this.wallet.address,
      sessionAddress: this.sessionKey.address,
      timestamp: Date.now()
    };
    
    await fs.writeFile(this.sessionFile, JSON.stringify(sessionData, null, 2));
  }
}
```

**Why This Matters:**
- Your main wallet stays secure and only signs authentication
- Session keys handle all state channel operations
- Each terminal session gets its own isolated authentication
- Compromised session keys don't affect your main wallet
- JWT tokens expire automatically for security

### 🔗 State Channel Operations

State channels enable gasless transactions by moving operations off-chain:

```typescript
// Finding Real USDC Channels
async findUSDCChannel(): Promise<string> {
  try {
    const channels = await this.client.getChannels();
    
    // Look for USDC channel on Polygon with balance
    const usdcChannel = channels.find((channel: any) => {
      return channel.status === 'open' && 
             channel.balance && 
             BigInt(channel.balance) > 0;
    });

    if (usdcChannel) return usdcChannel.id;
  } catch (error) {
    console.log('❌ Could not fetch channels');
  }

  return { error: 'No USDC channels found. Please create a channel first.' };
}
```

**State Channel Benefits:**
- **Zero Gas Fees**: All bidding happens off-chain
- **Instant Updates**: Real-time state synchronization
- **Multi-User Support**: Multiple participants in same channel
- **Secure Settlement**: Final state settles on-chain

### 🎯 Auction Management Pattern

The auction system demonstrates local-first architecture with optional cloud sync:

```typescript
// Local-First Auction Creation
async createAuction(params: CreateAuctionParams): Promise<string> {
  const walletInfo = await this.walletManager.getWalletInfo();
  if (!walletInfo) {
    throw new Error('No wallet found. Create a wallet first.');
  }

  try {
    const channelId = await this.findUSDCChannel();
    const auction = this.buildAuctionObject(params, walletInfo, channelId);
    
    // Try ClearNode sync (optional)
    try {
      await this.client.createSignedRequest('submit_app_state', [auction]);
      console.log('✅ Synced with ClearNode');
    } catch (syncError) {
      console.log('Warning: Local-only mode');
    }
    
    this.saveAuction(auction);
    return auction.id;
    
  } catch (error) {
    if (error.message.includes('channel')) {
      throw new Error('No USDC channels available. Create a channel first.');
    }
    throw new Error(`Failed to create auction: ${error.message}`);
  }
}
```

**Architecture Benefits:**
- **Offline Capability**: Works without internet connection
- **Graceful Degradation**: ClearNode failures don't break functionality
- **Real-time Sync**: When online, all terminals see updates instantly
- **Error Recovery**: Clear error messages guide users to solutions

## Understanding the Architecture

### File Structure
```
~/.yellow-cli/
├── wallet-12345.json       # Terminal 1's wallet
├── wallet-12346.json       # Terminal 2's wallet
├── wallet-12347.json       # Terminal 3's wallet
├── session-12345.json      # Terminal 1's auth session
├── session-12346.json      # Terminal 2's auth session
├── session-12347.json      # Terminal 3's auth session
└── auctions.json           # Shared auction marketplace
```

### How Multi-Wallet Works

1. **Session Isolation**: Each terminal gets its own wallet and auth session
2. **Shared State**: All terminals share the same auction marketplace
3. **Real-time Updates**: Changes in one terminal are visible in all others
4. **Gasless Bidding**: All bids happen off-chain via state channels

### Authentication Flow

1. **Wallet Loading**: CLI loads your session-specific wallet
2. **ClearNode Connection**: WebSocket connection to Yellow's message relay
3. **Challenge-Response**: ClearNode sends a UUID challenge
4. **EIP-712 Signing**: Your wallet signs the challenge using structured data
5. **JWT Token**: Receive authentication token for the session

## 🔐 Understanding Authentication

### What Happens When You Run Commands

Every time you run an auction command, the CLI automatically handles authentication:

```bash
node bin/yellow-cli.js auction list
```

**Behind the scenes:**
1. **Wallet Detection**: Loads `~/.yellow-cli/wallet-{sessionId}.json`
2. **Session Check**: Checks `~/.yellow-cli/session-{sessionId}.json` for valid auth
3. **Auto-Authentication**: If needed, connects to ClearNode and authenticates
4. **Command Execution**: Runs your requested command with authenticated session

### EIP-712 Structured Signing

The CLI uses industry-standard EIP-712 for secure authentication:

```typescript
// Message structure signed by your wallet
{
  challenge: "97ee2ce8-9f1d-4368-9801-ba4497cc0659",  // UUID from ClearNode
  scope: "app.cli.dapp",                              // Application scope
  wallet: "0xBdDa92101ca5DbD1D43CFBecC47f73D4BC68Ed37", // Your wallet address
  application: "0xBdDa92101ca5DbD1D43CFBecC47f73D4BC68Ed37", // App address
  participant: "0x31ed790F2b9BF1776de3874E5590FE0c478601FA", // Session key
  expire: 1757977330,                                 // Expiration timestamp
  allowances: []                                      // Token permissions
}
```

### Multi-Wallet Authentication

Each terminal session maintains independent authentication:

**Terminal 1:**
- Wallet: `wallet-12345.json`
- Session: `session-12345.json`
- Auth Token: Valid for 24 hours

**Terminal 2:**
- Wallet: `wallet-12346.json` 
- Session: `session-12346.json`
- Auth Token: Independent from Terminal 1

**Benefits:**
- No authentication conflicts between terminals
- Each wallet can bid independently
- Shared auction state across all authenticated sessions

## Common Use Cases

### 1. Digital Artist Selling Artwork

```bash
# Create wallet
node bin/yellow-cli.js wallet create

# Create auction for your art
node bin/yellow-cli.js auction create
# Title: "Cosmic Dreams #1"
# Description: "Digital art piece exploring space themes"
# Category: "digital_art"
# Starting Price: "1.0"
# Duration: "24" (hours)

# Monitor bids
node bin/yellow-cli.js auction watch <auction-id>
```

### 2. Collector Bidding on Multiple Auctions

```bash
# List all available auctions
node bin/yellow-cli.js auction list

# Bid on multiple pieces
node bin/yellow-cli.js auction bid auction-123 2.5
node bin/yellow-cli.js auction bid auction-456 1.8
node bin/yellow-cli.js auction bid auction-789 3.2

# View all your bids
node bin/yellow-cli.js auction bids
```

### 3. Auction House Managing Multiple Auctions

```bash
# Create multiple auctions
node bin/yellow-cli.js auction create  # Auction 1
node bin/yellow-cli.js auction create  # Auction 2
node bin/yellow-cli.js auction create  # Auction 3

# Monitor all auctions
node bin/yellow-cli.js auction list

# Settle completed auctions
node bin/yellow-cli.js auction settle
```

## Troubleshooting

### Wallet Issues

**Problem**: "No wallet found"
```bash
# Solution: Create a new wallet
node bin/yellow-cli.js wallet create
```

**Problem**: "Authentication failed"
```bash
# Solution: Delete and recreate wallet
node bin/yellow-cli.js wallet delete
node bin/yellow-cli.js wallet create
```

### Connection Issues

**Problem**: "Connection timeout"
- Check your internet connection
- Verify ClearNode URL in `.env`
- Try again in a few moments

**Problem**: "WebSocket connection failed"
- Ensure ClearNode URL starts with `wss://`
- Check firewall settings
- Verify the ClearNode service is running

### Auction Issues

**Problem**: "Auction not found"
- Verify the auction ID is correct
- Check if auction has expired
- Use `auction list` to see active auctions

**Problem**: "Bid too low"
- Check current bid amount
- Ensure your bid is higher than current bid
- Include sufficient decimal precision

## Advanced Features

### Exporting/Importing Wallets

```bash
# Export private key (be careful!)
node bin/yellow-cli.js wallet export

# Import existing wallet
node bin/yellow-cli.js wallet import
```

### Viewing Detailed Bid History

```bash
# View all bids across all auctions
node bin/yellow-cli.js auction bids

# View bids for specific auction
node bin/yellow-cli.js auction bids <auction-id>
```

### Channel Operations

```bash
# List your state channels
node bin/yellow-cli.js channel list

# Check connection status
node bin/yellow-cli.js channel status
```

## Next Steps

1. **Explore the codebase** to understand Yellow Network integration
2. **Create your own auctions** for digital art or collectibles
3. **Participate in the marketplace** by bidding on interesting items
4. **Experiment with multi-wallet scenarios** using multiple terminals
5. **Build on top of this foundation** for your own dApps

## Getting Help

- Check the `README.md` for detailed technical information
- Review `SUMMARY.md` for architecture overview
- Join the Yellow Network community for support
- Report issues on the project repository

---

**Congratulations!** You're now ready to use the Yellow CLI Dapp for gasless auction bidding. Start by creating your first wallet and exploring the marketplace!
