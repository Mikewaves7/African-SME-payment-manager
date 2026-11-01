import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Activity, ArrowDownLeft, ArrowUpRight, BadgeCheck, Banknote, Bell, BriefcaseBusiness, Check, ChevronDown, CircleHelp, Clock3, Copy, Download, ExternalLink, FileText, Globe2, LayoutDashboard, LoaderCircle, Plus, RefreshCw, Search, Send, Settings2, ShieldCheck, Wallet, X } from 'lucide-react'
import { accountBalances, connectFreighter, explorerAccount, explorerTx, payXlm, recentPayments, type PaymentRecord } from './stellar'

type Contact = { id: string; name: string; business: string; address: string }
type Invoice = { id: string; customer: string; description: string; amount: number; due: string; status: 'Pending' | 'Paid' }
const read = <T,>(key: string, fallback: T): T => { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback } catch { return fallback } }
const short = (value: string, n = 7) => value ? `${value.slice(0,n)}…${value.slice(-5)}` : '—'
const fmt = (value: number | string) => Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 })
const dateFmt = (value: string) => new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

export default function App() {
  const [tab, setTab] = useState('Overview')
  const [wallet, setWallet] = useState('')
  const [balances, setBalances] = useState<{asset:string;balance:string}[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [contacts, setContacts] = useState<Contact[]>(() => read('koraflow:contacts', []))
  const [invoices, setInvoices] = useState<Invoice[]>(() => read('koraflow:invoices', []))
  const [loading, setLoading] = useState(false)
  const [walletBusy, setWalletBusy] = useState(false)
  const [modal, setModal] = useState<'payment'|'contact'|'invoice'|''>('')
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('25')
  const [memo, setMemo] = useState('SME payment')
  const [contactName, setContactName] = useState('')
  const [contactBusiness, setContactBusiness] = useState('')
  const [contactAddress, setContactAddress] = useState('')
  const [invoiceCustomer, setInvoiceCustomer] = useState('')
  const [invoiceDescription, setInvoiceDescription] = useState('')
  const [invoiceAmount, setInvoiceAmount] = useState('100')
  const [invoiceDue, setInvoiceDue] = useState('')

  const xlm = balances.find(b => b.asset === 'XLM')?.balance ?? '0'
  const totalReceived = useMemo(() => payments.filter(p => p.to === wallet).reduce((sum,p) => sum + Number(p.amount), 0), [payments,wallet])
  const totalSent = useMemo(() => payments.filter(p => p.from === wallet).reduce((sum,p) => sum + Number(p.amount), 0), [payments,wallet])
  const filtered = useMemo(() => payments.filter(p => [p.from,p.to,p.memo,p.hash].join(' ').toLowerCase().includes(search.toLowerCase())), [payments,search])

  useEffect(() => { localStorage.setItem('koraflow:contacts', JSON.stringify(contacts)) }, [contacts])
  useEffect(() => { localStorage.setItem('koraflow:invoices', JSON.stringify(invoices)) }, [invoices])

  async function refresh(address = wallet) {
    if (!address) return
    setLoading(true); setError('')
    try {
      const [b, p] = await Promise.all([accountBalances(address), recentPayments(address)])
      setBalances(b); setPayments(p)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load Stellar account data.') }
    finally { setLoading(false) }
  }
  async function connect() {
    setWalletBusy(true); setError('')
    try { const address = await connectFreighter(); setWallet(address); const [b,p] = await Promise.all([accountBalances(address),recentPayments(address)]); setBalances(b); setPayments(p); setNotice('Freighter wallet connected.') }
    catch(e) { setError(e instanceof Error ? e.message : 'Wallet connection failed.') }
    finally { setWalletBusy(false) }
  }
  async function submitPayment(e: FormEvent) {
    e.preventDefault(); setError(''); setNotice('')
    if (!wallet) { setError('Connect your Freighter wallet first.'); return }
    setLoading(true)
    try { const hash = await payXlm(wallet,recipient,amount,memo); setNotice('Payment submitted to Stellar Testnet.'); setModal(''); await refresh(); window.open(explorerTx(hash),'_blank','noopener,noreferrer') }
    catch(e) { setError(e instanceof Error ? e.message : 'Payment could not be submitted.') }
    finally { setLoading(false) }
  }
  function addContact(e: FormEvent) {
    e.preventDefault()
    if (!contactName.trim() || !/^G[A-Z2-7]{55}$/.test(contactAddress.trim())) { setError('Add a contact name and a valid Stellar public address.'); return }
    setContacts([{id:crypto.randomUUID(),name:contactName.trim(),business:contactBusiness.trim(),address:contactAddress.trim()},...contacts])
    setContactName(''); setContactBusiness(''); setContactAddress(''); setModal(''); setNotice('Contact saved on this device.')
  }
  function addInvoice(e: FormEvent) {
    e.preventDefault()
    if (!invoiceCustomer.trim() || Number(invoiceAmount)<=0) { setError('Enter a customer and a valid invoice amount.'); return }
    setInvoices([{id:`KF-${Date.now().toString().slice(-6)}`,customer:invoiceCustomer.trim(),description:invoiceDescription.trim(),amount:Number(invoiceAmount),due:invoiceDue,status:'Pending'},...invoices])
    setInvoiceCustomer(''); setInvoiceDescription(''); setInvoiceAmount('100'); setInvoiceDue(''); setModal(''); setNotice('Invoice added to your local workspace.')
  }
  function exportCsv() {
    const rows = [['Date','From','To','Amount XLM','Memo','Transaction hash'],...payments.map(p=>[p.createdAt,p.from,p.to,p.amount,p.memo,p.hash])]
    const csv = rows.map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv],{type:'text/csv'})); const a=document.createElement('a'); a.href=url; a.download='koraflow-stellar-payments.csv'; a.click(); URL.revokeObjectURL(url)
  }
  async function copy(value:string) { try { await navigator.clipboard.writeText(value); setNotice('Copied to clipboard.') } catch { setError('Clipboard access is unavailable in this browser.') } }

  const nav = [{name:'Overview',icon:LayoutDashboard},{name:'Payments',icon:ArrowUpRight},{name:'Invoices',icon:FileText},{name:'Customers',icon:BriefcaseBusiness}]
  return <div className="app">
    <aside className="sidebar">
      <a className="logo" href="#"><span className="logo-icon"><Activity size={21}/></span><span>Kora<span>Flow</span></span></a>
      <div className="workspace"><div className="workspace-avatar">K</div><div><b>My business</b><small>SME workspace</small></div><ChevronDown size={15}/></div>
      <div className="nav-label">WORKSPACE</div>
      {nav.map(item => <button key={item.name} className={`nav-item ${tab===item.name?'selected':''}`} onClick={()=>setTab(item.name)}><item.icon size={18}/>{item.name}{item.name==='Payments'&&<span className="nav-count">{payments.length}</span>}</button>)}
      <div className="nav-label tools-label">TOOLS</div>
      <button className="nav-item" onClick={()=>setModal('payment')}><Send size={18}/>Send money</button>
      <button className="nav-item" onClick={()=>setModal('invoice')}><Plus size={18}/>Create invoice</button>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={17}/></div><b>Need a hand?</b><p>Learn how KoraFlow works with Stellar.</p><a href="https://developers.stellar.org/" target="_blank" rel="noreferrer">Stellar docs <ExternalLink size={12}/></a></div><div className="profile"><div className="profile-avatar">SM</div><div><b>Business account</b><small>Testnet workspace</small></div><Settings2 size={17}/></div></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><div className="breadcrumb">Workspace <span>/</span> <b>{tab}</b></div><h1>{tab==='Overview'?'Good business starts with clarity.':tab}</h1></div><div className="top-actions"><span className="network-pill"><i/> Stellar Testnet</span><button className="icon-button" aria-label="Notifications"><Bell size={18}/></button><button className="connect-button" onClick={connect} disabled={walletBusy}>{walletBusy?<LoaderCircle className="spin" size={16}/>:<Wallet size={16}/>} {wallet?short(wallet,5):'Connect wallet'}</button></div></header>
      {notice&&<div className="alert success"><Check size={16}/>{notice}<button onClick={()=>setNotice('')}><X size={15}/></button></div>}
      {error&&<div className="alert danger">{error}<button onClick={()=>setError('')}><X size={15}/></button></div>}
      {tab==='Overview'&&<><section className="welcome-row"><div><span className="eyebrow">YOUR BUSINESS, IN SYNC</span><p>Manage incoming funds, pay suppliers and keep every transaction visible.</p></div><button className="primary" onClick={()=>setModal('payment')}><Send size={16}/> New payment</button></section>
        <section className="stats-grid"><article className="balance-card"><div className="card-top"><span>Available balance</span><span className="xlm-tag">XLM <Globe2 size={12}/></span></div><div className="balance-number">{fmt(xlm)} <small>XLM</small></div><div className="balance-foot"><span><span className="green-dot"/> Stellar Testnet</span>{wallet?<a href={explorerAccount(wallet)} target="_blank" rel="noreferrer">View wallet <ExternalLink size={12}/></a>:<span>Connect wallet to view</span>}</div><div className="balance-watermark">K</div></article>
          <article className="stat-card"><div className="stat-icon received"><ArrowDownLeft size={18}/></div><span>Total received</span><strong>{fmt(totalReceived)} <small>XLM</small></strong><p>From recent visible payments</p></article>
          <article className="stat-card"><div className="stat-icon sent"><ArrowUpRight size={18}/></div><span>Total sent</span><strong>{fmt(totalSent)} <small>XLM</small></strong><p>Payments from this wallet</p></article>
          <article className="stat-card"><div className="stat-icon invoices"><FileText size={18}/></div><span>Outstanding invoices</span><strong>{invoices.filter(i=>i.status==='Pending').length}</strong><p>{fmt(invoices.filter(i=>i.status==='Pending').reduce((s,i)=>s+i.amount,0))} XLM awaiting payment</p></article></section>
        <section className="quick-grid"><button onClick={()=>setModal('payment')}><span className="quick-icon"><Send size={18}/></span><span><b>Send a payment</b><small>Pay a supplier or partner</small></span><ArrowUpRight size={16}/></button><button onClick={()=>setModal('invoice')}><span className="quick-icon violet"><FileText size={18}/></span><span><b>Create an invoice</b><small>Record money owed to you</small></span><ArrowUpRight size={16}/></button><button onClick={()=>setModal('contact')}><span className="quick-icon orange"><Plus size={18}/></span><span><b>Add a customer</b><small>Save a Stellar recipient</small></span><ArrowUpRight size={16}/></button></section>
        <section className="panel"><div className="panel-heading"><div><h2>Recent transactions</h2><p>Your latest activity on the Stellar network</p></div><button className="subtle-button" onClick={()=>setTab('Payments')}>View all <ArrowUpRight size={14}/></button></div><PaymentTable items={payments.slice(0,5)} wallet={wallet}/></section>
      </>}
      {tab==='Payments'&&<section className="panel page-panel"><div className="panel-heading"><div><h2>Payment activity</h2><p>Native XLM transfers from your connected Stellar account.</p></div><div className="button-row"><button className="subtle-button" onClick={exportCsv}><Download size={15}/> Export CSV</button><button className="primary compact" onClick={()=>setModal('payment')}><Plus size={15}/> New payment</button></div></div><div className="table-tools"><div className="search-field"><Search size={16}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search address, memo or hash"/></div><button className="icon-button" onClick={()=>refresh()} disabled={!wallet||loading}><RefreshCw size={16} className={loading?'spin':''}/></button></div><PaymentTable items={filtered} wallet={wallet}/></section>}
      {tab==='Invoices'&&<section className="panel page-panel"><div className="panel-heading"><div><h2>Invoices</h2><p>Keep a simple record of what customers owe your business.</p></div><button className="primary compact" onClick={()=>setModal('invoice')}><Plus size={15}/> Create invoice</button></div><div className="invoice-list">{invoices.length===0?<Empty icon={<FileText size={25}/>} title="No invoices yet" text="Create your first invoice to start tracking customer payments."/>:invoices.map(inv=><div className="invoice-row" key={inv.id}><div className="invoice-symbol"><FileText size={18}/></div><div className="invoice-main"><b>{inv.customer}</b><small>{inv.id} · {inv.description||'Business invoice'}</small></div><div className="invoice-due"><small>Due date</small><b>{inv.due?dateFmt(inv.due):'Not set'}</b></div><strong>{fmt(inv.amount)} XLM</strong><span className={`status ${inv.status.toLowerCase()}`}>{inv.status}</span><button className="subtle-button" onClick={()=>setInvoices(invoices.map(x=>x.id===inv.id?{...x,status:x.status==='Paid'?'Pending':'Paid'}:x))}>{inv.status==='Paid'?'Reopen':'Mark paid'}</button></div>)}</div></section>}
      {tab==='Customers'&&<section className="panel page-panel"><div className="panel-heading"><div><h2>Customers & suppliers</h2><p>Save trusted Stellar addresses for faster payments.</p></div><button className="primary compact" onClick={()=>setModal('contact')}><Plus size={15}/> Add contact</button></div><div className="contact-grid">{contacts.length===0?<Empty icon={<BriefcaseBusiness size={25}/>} title="Your contacts live here" text="Add a customer or supplier and save their Stellar public address."/>:contacts.map(c=><article className="contact-card" key={c.id}><div className="contact-avatar">{c.name.slice(0,1).toUpperCase()}</div><b>{c.name}</b><span>{c.business||'Business contact'}</span><code>{short(c.address,10)}</code><div><button className="subtle-button" onClick={()=>{setRecipient(c.address);setModal('payment')}}><Send size={14}/> Pay</button><button className="icon-button" onClick={()=>copy(c.address)}><Copy size={15}/></button><button className="icon-button danger-icon" onClick={()=>setContacts(contacts.filter(x=>x.id!==c.id))}><X size={15}/></button></div></article>)}</div></section>}
      <footer className="footer"><span>© 2026 KoraFlow · Built for African small businesses</span><span><ShieldCheck size={14}/> Secured by Stellar blockchain</span><span>Testnet prototype</span></footer>
    </main>
    {loading&&<div className="sync-indicator"><LoaderCircle className="spin" size={14}/> Syncing Stellar ledger</div>}
    {modal&&<div className="modal-backdrop" onMouseDown={()=>setModal('')}><section className="modal" onMouseDown={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setModal('')}><X size={18}/></button>
      {modal==='payment'&&<><div className="modal-icon"><Send size={21}/></div><span className="eyebrow">STELLAR TESTNET</span><h2>Send a payment</h2><p>Transfer native XLM to a customer, supplier or partner. Freighter will ask you to review and sign.</p><form onSubmit={submitPayment}><label>Recipient Stellar address<input value={recipient} onChange={e=>setRecipient(e.target.value)} placeholder="G… Public key" required spellCheck={false}/></label><label>Amount<div className="amount-input"><input type="number" min="0.0000001" step="any" value={amount} onChange={e=>setAmount(e.target.value)} required/><b>XLM</b></div></label><label>Payment reference / memo<input value={memo} onChange={e=>setMemo(e.target.value)} maxLength={28} placeholder="e.g. Invoice #104"/></label><button className="primary full" disabled={loading||!wallet}>{loading?<LoaderCircle className="spin" size={16}/>:<Wallet size={16}/>} {wallet?'Continue with Freighter':'Connect wallet first'}</button><small className="form-note">Testnet XLM has no monetary value. Always verify the recipient address.</small></form></>}
      {modal==='contact'&&<><div className="modal-icon violet"><BriefcaseBusiness size={21}/></div><span className="eyebrow">ADDRESS BOOK</span><h2>Add a contact</h2><p>Save a customer or supplier's Stellar wallet for future payments.</p><form onSubmit={addContact}><label>Contact name<input value={contactName} onChange={e=>setContactName(e.target.value)} placeholder="e.g. Ada's Textiles" required/></label><label>Business / note<input value={contactBusiness} onChange={e=>setContactBusiness(e.target.value)} placeholder="e.g. Fabric supplier"/></label><label>Stellar public address<input value={contactAddress} onChange={e=>setContactAddress(e.target.value)} placeholder="G… Public key" required spellCheck={false}/></label><button className="primary full"><Plus size={16}/> Save contact</button></form></>}
      {modal==='invoice'&&<><div className="modal-icon violet"><FileText size={21}/></div><span className="eyebrow">SALES & RECEIVABLES</span><h2>Create an invoice</h2><p>Record an amount owed to your business. Invoice data is stored locally on this device.</p><form onSubmit={addInvoice}><label>Customer / business<input value={invoiceCustomer} onChange={e=>setInvoiceCustomer(e.target.value)} placeholder="Customer name" required/></label><label>Description<input value={invoiceDescription} onChange={e=>setInvoiceDescription(e.target.value)} placeholder="e.g. 20 bags of rice"/></label><label>Amount<div className="amount-input"><input type="number" min="0.0000001" step="any" value={invoiceAmount} onChange={e=>setInvoiceAmount(e.target.value)} required/><b>XLM</b></div></label><label>Due date<input type="date" value={invoiceDue} onChange={e=>setInvoiceDue(e.target.value)}/></label><button className="primary full"><Plus size={16}/> Save invoice</button></form></>}
    </section></div>}
  </div>
}

function PaymentTable({items,wallet}:{items:PaymentRecord[];wallet:string}) {
  if (!wallet) return <Empty icon={<Wallet size={25}/>} title="Connect your business wallet" text="Connect Freighter to see your Stellar balance and transaction activity."/>
  if (!items.length) return <Empty icon={<Clock3 size={25}/>} title="No payments to show" text="Your recent XLM payments will appear here after the account is active."/>
  return <div className="table-wrap"><table><thead><tr><th>TRANSACTION</th><th>TYPE</th><th>AMOUNT</th><th>DATE</th><th>STATUS</th></tr></thead><tbody>{items.map(p=>{const incoming=p.to===wallet;return <tr key={p.id}><td><div className="tx-cell"><span className={`tx-icon ${incoming?'in':'out'}`}>{incoming?<ArrowDownLeft size={16}/>:<ArrowUpRight size={16}/>}</span><span><b>{incoming?'Received from':'Sent to'} {short(incoming?p.from:p.to,7)}</b><small>{p.memo||'No memo'} · {short(p.hash,9)}</small></span></div></td><td><span className="type-pill">{incoming?'Incoming':'Outgoing'}</span></td><td><b className={incoming?'positive':'negative'}>{incoming?'+':'−'}{fmt(p.amount)} XLM</b></td><td>{dateFmt(p.createdAt)}</td><td><a className="confirmed" href={explorerTx(p.hash)} target="_blank" rel="noreferrer"><BadgeCheck size={15}/> Confirmed <ExternalLink size={11}/></a></td></tr>})}</tbody></table></div>
}
function Empty({icon,title,text}:{icon:ReactNode;title:string;text:string}) { return <div className="empty-state"><span>{icon}</span><b>{title}</b><p>{text}</p></div> }
