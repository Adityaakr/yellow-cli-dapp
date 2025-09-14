# Yellow CLI Dapp - Multi-Wallet Auction System

## Overview

A command-line interface (CLI) application built on Yellow Network's Nitrolite SDK that enables gasless, multi-wallet auction bidding using ERC-7824 state channels. This system allows multiple users to participate in digital art auctions without paying gas fees, with only the winning bid settling on-chain.

## Key Features

### 🔗 **Gasless Transactions**
- Off-chain bidding via Yellow Network's state channels
- Zero gas fees for auction participation
- Only winning bids settle on-chain

### 👥 **Multi-Wallet Support**
- Independent wallet authentication per terminal session
- Shared auction marketplace across all participants
- Process-based wallet isolation for concurrent usage

### 🏛️ **Digital Art Auctions**
- Create auctions for digital art, NFTs, and collectibles
- Real-time bidding with live updates
- Automatic auction settlement and winner determination

### 🔐 **Secure Authentication**
- EIP-712 structured data signing
- Session-based authentication with ClearNode
- Separate session keys for enhanced security

## Architecture Components

### Core Technologies
- **@erc7824/nitrolite SDK (v0.2.6)**: Yellow Network's state channel implementation
- **ethers.js (v6.14.3)**: Ethereum wallet operations and blockchain interaction
- **WebSocket**: Real-time communication with ClearNode
- **commander.js**: CLI framework and command parsing
- **TypeScript**: Type-safe development

### Yellow Network Integration
- **ClearNode**: Message relay and state synchronization
- **State Channels**: ERC-7824 compliant off-chain transaction processing
- **Multi-Chain Support**: Polygon, Base, and Celo networks
- **USDC Integration**: Native USDC token support for auctions

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
- Create new wallets
- Import existing wallets from private keys
- Export private keys (with security warnings)
- View wallet information and balances

### Auction Operations
- Create digital art auctions
- List active auctions
- Place bids on auctions
- View bid history
- Watch auctions in real-time
- Settle completed auctions

### Channel Operations
- List available state channels
- View channel balances
- Monitor connection status

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
- Multi-wallet authentication system
- Gasless auction bidding
- Real-time auction updates
- Session-based wallet isolation
- EIP-712 authentication with ClearNode
- Shared auction state management

### 🔄 Current Issues
- Auction creation permissions (user-specific)
- ClearNode timeout handling improvements

### 🚀 Future Enhancements
- Web interface integration
- Mobile app support
- Advanced auction types (Dutch, reserve price)
- Multi-token support beyond USDC

## Use Cases

### Primary Use Cases
1. **Digital Artists**: Create and sell digital artwork without gas fees
2. **Collectors**: Bid on digital art and NFTs with instant transactions
3. **Developers**: Learn Yellow Network SDK integration patterns
4. **Researchers**: Study state channel auction mechanisms

### Business Benefits
- **Cost Efficiency**: Eliminate gas fees for auction participation
- **User Experience**: Instant bidding with real-time updates
- **Scalability**: Support unlimited concurrent auctions
- **Accessibility**: Lower barrier to entry for digital art markets

This CLI application demonstrates the practical implementation of Yellow Network's vision for gasless, scalable blockchain applications using state channels and off-chain computation.
