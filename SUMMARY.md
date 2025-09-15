# Yellow CLI Dapp - Multi-Wallet Auction System

## Overview

A production-ready command-line interface (CLI) application built on Yellow Network's Nitrolite SDK that enables gasless, multi-wallet auction bidding using ERC-7824 state channels. This comprehensive system allows multiple users to participate in digital art auctions simultaneously without paying gas fees, with only the winning bid settling on-chain. The CLI serves as an excellent entry point for developers to learn Yellow Network integration patterns.

## Key Features

### 🔗 **Gasless Transactions**
- Off-chain bidding via Yellow Network's state channels
- Zero gas fees for auction participation
- Only winning bids settle on-chain
- Instant transaction processing without blockchain delays

### 👥 **Multi-Wallet Support**
- Independent wallet authentication per terminal session
- Shared auction marketplace across all participants
- Process-based wallet isolation for concurrent usage
- Session-specific wallet and authentication management

### 🏛️ **Digital Art Auctions**
- Create auctions for digital art, NFTs, collectibles, and other items
- Real-time bidding with live updates via WebSocket
- Automatic auction settlement and winner determination
- Comprehensive bid tracking and history
- Custom auction durations (30min to custom hours)

### 🔐 **Secure Authentication**
- EIP-712 structured data signing with dual-key architecture
- Session-based authentication with ClearNode
- Separate session keys for enhanced security
- UUID-based challenge-response authentication
- JWT token management with expiration

### 🎯 **Interactive CLI Experience**
- Menu-driven interface with comprehensive navigation
- Real-time auction watching with live updates
- Detailed bid history and auction analytics
- Channel operations and balance management
- Comprehensive wallet management (create, import, export, delete)

## Architecture Components

### Core Technologies
- **@erc7824/nitrolite SDK (v0.2.6)**: Yellow Network's state channel implementation
- **ethers.js (v6.14.3)**: Ethereum wallet operations and blockchain interaction
- **ws (v8.18.2)**: WebSocket client for real-time ClearNode communication
- **commander.js (v11.1.0)**: CLI framework and command parsing
- **inquirer (v9.2.12)**: Interactive command-line prompts and menus
- **chalk (v5.4.1)**: Terminal styling and colors
- **ora (v7.0.1)**: Terminal spinners and loading indicators
- **TypeScript (v5.3.3)**: Type-safe development with full type coverage

### Yellow Network Integration
- **ClearNode**: Message relay and state synchronization at wss://clearnet.yellow.com/ws
- **State Channels**: ERC-7824 compliant off-chain transaction processing
- **Multi-Chain Support**: Polygon (primary), Base, and Celo networks
- **USDC Integration**: Native USDC token support with real channel detection
- **Real Channel Usage**: Finds and uses actual USDC channels with balances
- **Authentication Scope**: app.cli.dapp scope for ClearNode access

## System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Terminal 1    │    │   Terminal 2    │    │   Terminal N    │
│   Wallet A      │    │   Wallet B      │    │   Wallet C      │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │      ClearNode            │
                    │   (Message Relay)         │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │   Shared Auction State    │
                    │     (~/.yellow-cli/)      │
                    └───────────────────────────┘
```

## Authentication Flow

1. **Wallet Initialization**: Load or create wallet for current terminal session
2. **ClearNode Connection**: Establish WebSocket connection
3. **Authentication Request**: Send wallet address and session key
4. **Challenge Response**: Receive UUID challenge from ClearNode
5. **EIP-712 Signing**: Sign structured authentication message
6. **JWT Token**: Receive authentication token for session

## Auction Lifecycle

1. **Creation**: User creates auction with title, description, and duration
2. **Channel Setup**: Auction associated with USDC state channel
3. **Bidding**: Multiple users place off-chain bids via state updates
4. **Real-time Updates**: All participants see live bid updates
5. **Settlement**: Winning bid settles on-chain at auction end

## Multi-Wallet Isolation

### Session Management
- Each terminal session uses unique process identifier (PPID)
- Wallet files: `wallet-{sessionId}.json`
- Auth sessions: `session-{sessionId}.json`
- Shared auctions: `auctions.json` (global)

### Benefits
- Multiple users can run CLI simultaneously
- Independent authentication per terminal
- Shared marketplace visibility
- No wallet conflicts or signature errors

## Security Features

### Cryptographic Security
- EIP-712 structured data signing for authentication
- Separate session keypairs for participant isolation
- Private key storage in local encrypted files

### Access Control
- Session-based authentication with expiration
- Wallet-specific permissions and allowances
- Prevention of self-bidding on own auctions

## Performance Optimizations

### State Channel Benefits
- Instant bid processing (no blockchain confirmation delays)
- Unlimited bidding frequency without gas costs
- Efficient state synchronization via ClearNode

### Fallback Mechanisms
- Known channel ID fallback for ClearNode timeouts
- Graceful error handling for network issues
- Automatic reconnection for WebSocket failures

## Supported Operations

### Wallet Management
- Create new wallets with secure key generation
- Import existing wallets from private keys
- Export private keys (with comprehensive security warnings)
- View wallet information and addresses
- Delete wallets with double confirmation
- Session-based wallet isolation per terminal

### Auction Operations
- Create digital art auctions with categories (digital_art, nft, collectible, other)
- List active auctions with real-time data
- Place bids on auctions with validation
- View comprehensive bid history across all auctions
- View bids for specific auctions
- Watch auctions in real-time with live updates
- Settle completed auctions (seller only)
- Custom auction durations (30min, 2h, 1day, 3days, custom)

### Channel Operations
- Create new channels (guided web process)
- List available state channels with balances
- View channel balances and status
- Monitor ClearNode connection status
- Automatic USDC channel detection and usage

## Technical Specifications

### Supported Networks
- **Polygon (Primary)**: USDC token support, low fees
- **Base**: Ethereum L2 with native ETH
- **Celo**: Mobile-first blockchain with CELO token

### Token Standards
- **USDC**: Primary auction currency (6 decimal precision)
- **ERC-20**: Standard token interface support
- **ERC-7824**: State channel standard compliance

### File Structure
```
~/.yellow-cli/
├── wallet-{sessionId}.json     # Session-specific wallets
├── session-{sessionId}.json    # Authentication sessions
└── auctions.json               # Shared auction marketplace
```

## Development Status

### ✅ Completed Features
- Multi-wallet authentication system with dual-key architecture
- Gasless auction bidding with real USDC channels
- Real-time auction updates via WebSocket
- Session-based wallet isolation per terminal
- EIP-712 authentication with ClearNode
- Shared auction state management
- Interactive CLI with comprehensive menus
- Complete auction lifecycle (create, bid, watch, settle)
- Comprehensive bid tracking and analytics
- Channel operations and balance management
- Wallet management (create, import, export, delete)
- Custom auction durations and categories
- Real-time auction watching with live updates

### ✅ Production Ready
- Stable authentication with ClearNode
- Real USDC channel integration
- Multi-terminal concurrent usage
- Comprehensive error handling
- Type-safe TypeScript implementation
- Full CLI command coverage

### 🚀 Future Enhancements
- Web interface integration
- Mobile app support
- Advanced auction types (Dutch, reserve price)
- Multi-token support beyond USDC
- Auction analytics and reporting
- Notification system for bid updates

## Use Cases

### Primary Use Cases
1. **Digital Artists**: Create and sell digital artwork without gas fees
2. **Collectors**: Bid on digital art and NFTs with instant transactions
3. **Developers**: Learn Yellow Network SDK integration patterns and best practices
4. **Researchers**: Study state channel auction mechanisms and gasless transactions
5. **Auction Houses**: Manage multiple concurrent auctions efficiently
6. **Educational**: Demonstrate Yellow Network capabilities to new developers

### Business Benefits
- **Cost Efficiency**: Eliminate gas fees for auction participation
- **User Experience**: Instant bidding with real-time updates and live watching
- **Scalability**: Support unlimited concurrent auctions and bidders
- **Accessibility**: Lower barrier to entry for digital art markets
- **Developer Onboarding**: Excellent entry point for Yellow ecosystem
- **Production Ready**: Stable, tested implementation suitable for real use

This CLI application demonstrates the practical implementation of Yellow Network's vision for gasless, scalable blockchain applications using state channels and off-chain computation. It serves as both a functional auction platform and an excellent educational tool for developers entering the Yellow ecosystem, showcasing production-ready patterns for building dApps with state channels.
