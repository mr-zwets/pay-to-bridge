# Pay-To-Bridge

One-way bridge for NFTs (ERC721) from SmartBCH (EVM) to CashTokens, with [prompt.cash](https://prompt.cash/) integration for payments.

## Outline

To bridge the NFTs the user first sends them to a burn address.
Then, the user provides a cashtokens payout address with a proof of burn to the server.
Next, the user makes the payment to the prompt.cash gateway.
The server re-mints the NFTs as CashTokens to the provided address.

## Details

A subscription monitors all NFT burns of an ERC721 contract, and writes them to a postgres database.
A simple API server exposes the burn & bridging info through several endpoints.
A user makes a bridging order by providing a cashtokens payout address with a proof of burn to the server,.
The server validates the proof before registering the order.
Upon payment this order is processed and the server re-issues the NFTs in the order to the provided address and mark the NFTs as bridged in the database.
The matching front-end code can be found in the repo for the Poolside Puffers website.

## Advantages

### non-custodial payment integration

Able to configure your own xPub in [prompt.cash](https://prompt.cash/) and receive BCH payments directly to your Electron Cash wallet.

### batch briding

Many NFTs can be batch burned together using the Mantra bundle transfer, the NFTs will also be re-issued together to the payout address in one transaction.

### auditable

Because of the public API endpoints anyone can see all the burning and bridging that has taken place. For each bridged NFT there is a `signatureProof` which is the signature from the origin address signing the cashtokens receiving address. This proves the bridging destination is the one provided by the user.

### reflective supply

By re-issuing the NFTs as they are burned, there never exists more than the maximum supply of NFTs in circulation. Fetching the supply on CashTokens will get you the amount of NFTs that have been bridged.

## API Endpoints

- /
- /all
- /recent
- /signbridging
- /address/:originAddress
- /orders
- /recentorders
- /callback

The home endpoint simply provides the number of `nftsBridged`, the `all` endpoint provides data of all burned & bridged NFTs, /recent only of the latest 20 items.
/orders & /recentorders provide the recent requests to bridge with prompt cash payment info.
/signbridging is the POST endpoint for users to provide their cashtokens payout address together with proof authorizing the bridging to that address.
/callback serves as the public endpoint used by prompt.cash to notify the server of payments.
Lastly, /address/:originAddress provides all the minting and burning info with a specific `originAddress`

## Installation

```bash
git git@github.com:mr-zwets/pay-to-bridge.git
npm install
```

## Usage

example .env

```bash
SEEDPHRASE=""
DERIVATIONPATH="m/44'/145'/0'/0/0"
NETWORK=""
TOKENID=""
CONTRACTADDR=""
SERVER_URL=""
SECRET_TOKEN=""

PGHOST=''
PGUSER=
PGDATABASE=
PGPASSWORD=
PGPORT=5432
```