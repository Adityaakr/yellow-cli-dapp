# 🟡 Yellow CLI Dapp - Multi-Wallet Auction System

A command-line interface application built on Yellow Network's Nitrolite SDK that enables gasless, multi-wallet auction bidding using ERC-7824 state channels. Multiple users can participate in digital art auctions simultaneously without paying gas fees.

## 🚀 Key Features

- **🔗 Gasless Transactions**: Off-chain bidding via Yellow Network's state channels
- **👥 Multi-Wallet Support**: Independent wallet authentication per terminal session
- **🏛️ Digital Art Auctions**: Create auctions for digital art, NFTs, and collectibles
- **⚡ Real-time Updates**: Live auction updates via WebSocket connections
- **🔐 Secure Authentication**: EIP-712 structured data signing with ClearNode
- **🌐 Multi-chain Support**: Polygon, Base, and Celo networks
- **💰 USDC Integration**: Native USDC token support for auctions

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Make CLI executable globally (optional)
npm link
```

## Configuration

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Configure your settings in `.env`:
```env
CLEARNODE_URL=wss://your-clearnode-url.com
PRIVATE_KEY=0x1234... # Optional: Use existing private key
NETWORK=polygon
RPC_URL=https://polygon-rpc.com
APP_NAME=Yellow CLI Dapp
SCOPE=app.cli.dapp
```

## Usage

### Basic Commands

```bash
# Interactive mode (recommended)
npm run cli interactive

# Show help
npm run cli --help

# Wallet operations
npm run cli wallet create
npm run cli wallet show
npm run cli wallet import
npm run cli wallet export

# Auction operations
npm run cli auction create
npm run cli auction list
npm run cli auction bid <auction-id> <amount>
npm run cli auction watch <auction-id>
npm run cli auction settle

# Interactive mode (recommended)
npm run cli interactive
```

### Multi-Wallet Usage

**Terminal 1 (Wallet A):**
```bash
# Create first wallet and auction
npm run cli interactive
# Select: Wallet Operations → Create New Wallet
# Select: Auction Operations → Create Auction
```

**Terminal 2 (Wallet B):**
```bash
# Create second wallet and bid
npm run cli interactive
# Select: Wallet Operations → Create New Wallet
# Select: Auction Operations → List Auctions
# Select: Auction Operations → Place Bid
```

**Both terminals can see shared auction state!**

### Example Workflow

1. **Start interactive mode**:
```bash
npm run cli interactive
```

2. **Create a wallet**:
- Select "Wallet Operations"
- Choose "Create New Wallet"

3. **Create an auction**:
- Select "Auction Operations" 
- Choose "Create Auction"
- Follow prompts for title, description, category, duration

4. **List active auctions**:
- Select "Auction Operations"
- Choose "List Active Auctions"

5. **Place a bid** (from different terminal):
- Run `npm run cli interactive` in new terminal
- Create wallet, then select "Auction Operations"
- Choose "Place Bid" and follow prompts

## 🔐 Authentication System

### EIP-712 Structured Signing
The CLI uses EIP-712 structured data signing for secure authentication with ClearNode:

```typescript
// Authentication message structure
{
  challenge: "uuid-from-clearnode",
  scope: "app.cli.dapp", 
  wallet: "0x...",        // Main wallet address
  application: "0x...",   // Application address
  participant: "0x...",   // Session key address
  expire: 1234567890,
  allowances: []
}
```

### Multi-Key Architecture
- **Main Wallet**: Your primary wallet for signing transactions
- **Session Key**: Separate keypair for participant role isolation
- **Dual Authentication**: Wallet signs auth messages, session key handles participant role

### Authentication Flow
1. **Wallet Loading**: CLI loads your session-specific wallet
2. **ClearNode Connection**: WebSocket connection to Yellow's message relay
3. **Auth Request**: Send wallet address + session key to ClearNode
4. **Challenge Response**: Receive UUID challenge from ClearNode
5. **EIP-712 Signing**: Sign structured message with wallet private key
6. **JWT Token**: Receive authentication token for the session

## Architecture

### Core Components

- **NitroliteClient**: WebSocket client for ClearNode communication with EIP-712 auth
- **AuthManager**: Session-based authentication with ClearNode
- **WalletManager**: Secure local wallet management with session isolation
- **AuctionService**: Auction creation, bidding, and settlement
- **Multi-Wallet Support**: Independent authentication per terminal session

### Technology Stack

- **@erc7824/nitrolite**: Core SDK for state channel operations
- **ethers.js**: Ethereum wallet and EIP-712 signing functionality
- **commander**: CLI framework and command parsing
- **inquirer**: Interactive command-line prompts
- **chalk**: Terminal styling and colors
- **WebSocket**: Real-time communication with ClearNode

## Development

```bash
# Development mode with hot reload
npm run dev

# Build TypeScript
npm run build

# Run built version
npm start
```

## 🔐 Multi-Wallet Security

### Session-Based Isolation
- Each terminal session maintains its own wallet: `~/.yellow-cli/wallet-{sessionId}.json`
- Independent authentication sessions: `~/.yellow-cli/session-{sessionId}.json`
- Shared auction marketplace: `~/.yellow-cli/auctions.json`

### Security Best Practices
- Private keys are encrypted and stored locally
- Always backup your private key before deleting the wallet
- Never share your private key or commit it to version control
- Use environment variables for sensitive configuration
- Each wallet uses separate session keys for ClearNode authentication

## Troubleshooting

### Connection Issues
- Verify ClearNode URL is correct and accessible
- Check network connectivity
- Ensure wallet is properly initialized

### Authentication Failures
- Regenerate wallet if authentication consistently fails
- Verify EIP-712 signing is working correctly
- Check ClearNode compatibility

### Transaction Errors
- Ensure sufficient balance for operations
- Verify auction parameters are valid
- Check if auction is still active

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

---

Built with ❤️ using Yellow's Nitrolite SDK
