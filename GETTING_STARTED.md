# Getting Started with Yellow CLI Dapp

This guide will walk you through setting up and using the Yellow CLI Dapp for multi-wallet auction bidding.

## Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Terminal/Command Line** access
- **Basic understanding** of cryptocurrency wallets

## Quick Start

### 1. Installation

```bash
# Clone the repository
git clone <repository-url>
cd cli-dapp

# Install dependencies
npm install

# Build the project
npm run build
```

### 2. Environment Setup

Create your environment configuration:

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` with your settings:
```env
CLEARNODE_URL=wss://your-clearnode-url.com
NETWORK=polygon
RPC_URL=https://polygon-rpc.com
APP_NAME=Yellow CLI Dapp
SCOPE=app.cli.dapp
```

### 3. First Run

Test the installation:
```bash
node bin/yellow-cli.js --help
```

You should see the CLI help menu with available commands.

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
