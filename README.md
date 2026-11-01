# KoraFlow — African SME Payment Manager

A TypeScript + React payment workspace for African small businesses, powered by Stellar.

## Features
- Connect a Freighter wallet on Stellar **Testnet**.
- View XLM balance and recent incoming/outgoing native XLM payments from Horizon.
- Send XLM payments with an optional memo after Freighter approval.
- Maintain a local customer/supplier address book.
- Create and track simple invoices locally, and mark them paid or pending.
- Search recent activity and export payment records as CSV.
- Open transactions and wallet addresses in Stellar Expert Testnet.

## Run locally
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Deploy
The GitHub Actions workflow builds the Vite app and deploys the `dist` directory to GitHub Pages.

## Important notes
- This is a Testnet prototype. Testnet XLM has no monetary value.
- Install and unlock the Freighter browser extension to connect and sign payments.
- Invoice and contact records are stored in this browser's localStorage; they are not on-chain or shared between devices.
- The dashboard shows up to 100 recent native XLM payment operations returned by Horizon. It is not a complete accounting ledger and does not currently process fiat, mobile-money, or issued-asset payments.
- Verify recipient public addresses before signing any payment.
