import { Asset, Horizon, Memo, Networks, Operation, TransactionBuilder } from '@stellar/stellar-sdk'
import { getAddress, isConnected, signTransaction } from '@stellar/freighter-api'

export const server = new Horizon.Server('https://horizon-testnet.stellar.org')
const passphrase = Networks.TESTNET

export type PaymentRecord = {
  id: string
  hash: string
  from: string
  to: string
  amount: string
  createdAt: string
  memo: string
}

export async function connectFreighter(): Promise<string> {
  const connection = await isConnected()
  if (!connection.isConnected) throw new Error('Freighter wallet was not found. Install or unlock the Freighter browser extension.')
  const result = await getAddress()
  if (!result.address) throw new Error('Wallet connection was not approved.')
  return result.address
}

export async function accountBalances(address: string) {
  const account = await server.loadAccount(address)
  return account.balances.map((item) => ({
    asset: item.asset_type === 'native' ? 'XLM' : ('asset_code' in item ? item.asset_code : 'TOKEN'),
    balance: item.balance,
  }))
}

export async function recentPayments(address: string): Promise<PaymentRecord[]> {
  const page = await server.payments().forAccount(address).limit(100).order('desc').call()
  return page.records
    .filter((record: any) => record.type === 'payment' && record.asset_type === 'native')
    .map((record: any) => ({
      id: record.id, hash: record.transaction_hash, from: record.from, to: record.to,
      amount: record.amount, createdAt: record.created_at, memo: record.transaction?.memo ?? '',
    }))
}

export async function payXlm(sender: string, recipient: string, amount: string, memoText: string) {
  if (!/^G[A-Z2-7]{55}$/.test(recipient)) throw new Error('Enter a valid Stellar public address.')
  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) throw new Error('Enter an amount greater than zero.')
  const account = await server.loadAccount(sender)
  const builder = new TransactionBuilder(account, { fee: (await server.fetchBaseFee()).toString(), networkPassphrase: passphrase })
    .addOperation(Operation.payment({ destination: recipient, asset: Asset.native(), amount: Number(amount).toFixed(7) }))
    .setTimeout(180)
  if (memoText.trim()) builder.addMemo(Memo.text(memoText.trim().slice(0, 28)))
  const tx = builder.build()
  const signed = await signTransaction(tx.toXDR(), { networkPassphrase: passphrase })
  if (!signed.signedTxXdr) throw new Error('Transaction signing was cancelled.')
  const signedTx = TransactionBuilder.fromXDR(signed.signedTxXdr, passphrase)
  const result = await server.submitTransaction(signedTx)
  return result.hash
}

export const explorerTx = (hash: string) => `https://stellar.expert/explorer/testnet/tx/${hash}`
export const explorerAccount = (address: string) => `https://stellar.expert/explorer/testnet/account/${address}`
