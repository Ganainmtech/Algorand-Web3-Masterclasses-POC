import { SupportedWallet, useWallet, WalletId, WalletManager, WalletProvider } from '@txnlab/use-wallet-react'
import { SnackbarProvider } from 'notistack'
import React, { useEffect, useState } from 'react'
import AddressQRModal from './components/AddressQRModal'
import Home from './Home'
import { ellipseAddress } from './utils/ellipseAddress'
import { getAlgodConfigFromViteEnvironment, getKmdConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs'

function AlgoPrice() {
  const [price, setPrice] = useState<string | null>(null)
  const [change, setChange] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchPrice = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/coins/algorand?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false',
      )
      const data = await res.json()
      setPrice(data.market_data.current_price.usd.toFixed(3))
      setChange(data.market_data.price_change_percentage_24h)
    } catch (e) {
      setPrice(null)
      setChange(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchPrice()
    const interval = setInterval(fetchPrice, 15 * 60 * 1000) // 15 minutes
    return () => clearInterval(interval)
  }, [])

  let changeColor = 'text-gray-500'
  if (typeof change === 'number') {
    if (change > 0.1) changeColor = 'text-green-600'
    else if (change < -0.1) changeColor = 'text-red-600'
  }

  return (
    <div className="fixed top-4 right-6 z-50 bg-white/90 rounded-xl shadow-lg px-4 py-2 flex flex-col items-end border-2 border-pink-200 min-w-[120px]">
      <div className="flex items-center">
        <span className="font-bold text-teal-600 mr-2">ALGO</span>
        <span className="text-gray-700 text-lg">{loading ? '...' : price ? `$${price}` : 'N/A'}</span>
        <span className="ml-1 text-xs text-gray-400">USD</span>
      </div>
      <div className="flex items-center mt-1">
        <span className={`text-xs font-semibold ${changeColor}`}>
          {loading ? '' : change !== null ? (change > 0 ? '+' : '') + change.toFixed(2) + '%' : ''}
        </span>
        <span className="ml-1 text-xs text-gray-400">24h</span>
      </div>
    </div>
  )
}

type SelectableNetwork = 'testnet' | 'mainnet'

function AccountInfo({
  selectedNetwork,
  onNetworkChange,
}: {
  selectedNetwork: SelectableNetwork
  onNetworkChange: (network: SelectableNetwork) => void
}) {
  const { activeAddress, wallets } = useWallet()
  const [balance, setBalance] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [algoPrice, setAlgoPrice] = React.useState<number | null>(null)
  const [copied, setCopied] = React.useState(false)
  const [error, setError] = React.useState(false)
  const [qrOpen, setQrOpen] = React.useState(false)

  // Fetch ALGO balance (exposed for manual refresh on click)
  const fetchBalance = React.useCallback(async () => {
    if (!activeAddress) {
      setBalance(null)
      setError(false)
      return
    }
    setLoading(true)
    setError(false)
    try {
      const normalizeBase = (base: string) => base.replace(/\/+$/, '')
      const buildHeaders = (token?: string) => {
        const headers: Record<string, string> = {}
        if (token && token.length > 0) headers['X-Algo-API-Token'] = token
        return headers
      }

      const endpoints: Record<SelectableNetwork, { indexer: string; algod: string }> = {
        testnet: {
          indexer: 'https://testnet-idx.algonode.cloud',
          algod: 'https://testnet-api.algonode.cloud',
        },
        mainnet: {
          indexer: 'https://mainnet-idx.algonode.cloud',
          algod: 'https://mainnet-api.algonode.cloud',
        },
      }

      // Try Indexer first
      try {
        const indexerBase = normalizeBase(endpoints[selectedNetwork].indexer)
        const indexerHeaders = buildHeaders(undefined)
        const indexerResp = await fetch(`${indexerBase}/v2/accounts/${activeAddress}`, { headers: indexerHeaders })
        if (indexerResp.ok) {
          const data = await indexerResp.json()
          const idxAmount =
            typeof data?.account?.amount === 'number' ? data.account.amount : typeof data?.amount === 'number' ? data.amount : undefined
          if (typeof idxAmount === 'number') {
            setBalance((idxAmount / 1e6).toFixed(3))
            setLoading(false)
            return
          }
        }
      } catch {}

      // Fallback to Algod
      let fetched = false
      try {
        const algodBase = normalizeBase(endpoints[selectedNetwork].algod)
        const algodHeaders = buildHeaders(undefined)
        const algodResp = await fetch(`${algodBase}/v2/accounts/${activeAddress}`, { headers: algodHeaders })
        if (algodResp.ok) {
          const algodData = await algodResp.json()
          const algodAmount =
            typeof algodData?.account?.amount === 'number'
              ? algodData.account.amount
              : typeof algodData?.amount === 'number'
                ? algodData.amount
                : undefined
          if (typeof algodAmount === 'number') {
            setBalance((algodAmount / 1e6).toFixed(3))
            fetched = true
          }
        }
      } catch {}

      // Last-resort: public AlgoExplorer indexer when on testnet
      if (!fetched && selectedNetwork === 'testnet') {
        try {
          const explorerBase = 'https://algoindexer.testnet.algoexplorerapi.io'
          const resp = await fetch(`${explorerBase}/v2/accounts/${activeAddress}`)
          if (resp.ok) {
            const data = await resp.json()
            const expAmount = typeof data?.account?.amount === 'number' ? data.account.amount : undefined
            if (typeof expAmount === 'number') {
              setBalance((expAmount / 1e6).toFixed(3))
              setLoading(false)
              return
            }
          }
        } catch {}
      }
    } catch (e) {
      setBalance(null)
      setError(true)
    }
    setLoading(false)
  }, [activeAddress, selectedNetwork])

  React.useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  // Fetch ALGO price
  React.useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=algorand&vs_currencies=usd')
        const data = await res.json()
        setAlgoPrice(data.algorand.usd)
      } catch (e) {
        setAlgoPrice(null)
      }
    }
    fetchPrice()
    const interval = setInterval(fetchPrice, 60000)
    return () => clearInterval(interval)
  }, [])

  const handleCopy = () => {
    if (activeAddress) {
      navigator.clipboard.writeText(activeAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    }
  }

  const openQR = () => setQrOpen(true)
  const closeQR = () => setQrOpen(false)

  const handleDisconnect = async () => {
    if (wallets) {
      const activeWallet = wallets.find((w) => w.isActive)
      if (activeWallet) {
        await activeWallet.disconnect()
      } else {
        localStorage.removeItem('@txnlab/use-wallet:v3')
        window.location.reload()
      }
    }
  }

  if (!activeAddress) return null
  const usdValue = balance && algoPrice ? (parseFloat(balance) * algoPrice).toFixed(2) : null
  const usdDisplay = React.useMemo(() => {
    if (!usdValue) return null
    const cleaned = String(usdValue).replace(/^\$+/, '')
    return `$${cleaned}`
  }, [usdValue])
  const explorerBase =
    selectedNetwork === 'testnet' ? 'https://testnet.explorer.perawallet.app/address' : 'https://explorer.perawallet.app/address'
  return (
    <div className="fixed top-4 left-6 z-50 bg-white/90 rounded-xl shadow-lg px-4 py-2 flex flex-col border-2 border-pink-200 min-w-[220px]">
      <div className="flex items-center mb-1 gap-2">
        <span className="font-bold text-teal-600 text-xs mr-1">WALLET</span>
        <select
          className="select select-xs select-bordered h-7 min-h-0 text-xs text-gray-700"
          value={selectedNetwork}
          onChange={(e) => onNetworkChange(e.target.value as SelectableNetwork)}
          title="Select network"
        >
          <option value="testnet">Testnet</option>
          <option value="mainnet">Mainnet</option>
        </select>
        <button
          className="text-xs bg-pink-400 hover:bg-pink-500 text-white px-2 py-1 rounded transition ml-1"
          onClick={handleDisconnect}
          title="Disconnect wallet"
        >
          Disconnect
        </button>
      </div>
      <span className="flex items-center text-gray-700 text-sm mb-1">
        <button className="mr-2 p-1 rounded hover:bg-gray-200" onClick={openQR} title="Show address QR code">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm6-2h2v4h4V3h2v6h-8V3zm8 8h-6v2h2v2h2v-2h2v-2zm0 4h-2v2h-2v2h4v-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5z" />
          </svg>
        </button>
        <a href={`${explorerBase}/${activeAddress}`} target="_blank" rel="noreferrer" title={activeAddress} className="hover:underline">
          {ellipseAddress(activeAddress, 7)}
        </a>
        <button className="ml-2 p-1 rounded hover:bg-gray-200 transition relative" onClick={handleCopy} title="Copy address">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            className="inline-block align-middle text-gray-500"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" strokeWidth="2" stroke="currentColor" fill="none" />
            <rect x="3" y="3" width="13" height="13" rx="2" strokeWidth="2" stroke="currentColor" fill="none" />
          </svg>
          {copied && (
            <span className="absolute left-1/2 -translate-x-1/2 top-7 bg-pink-400 text-white text-xs rounded px-2 py-1 shadow-lg animate-fade-in-out">
              Copied!
            </span>
          )}
        </button>
      </span>
      <AddressQRModal
        open={qrOpen}
        onClose={closeQR}
        address={activeAddress}
        balanceAlgos={balance ?? undefined}
        balanceUsd={usdDisplay ?? undefined}
        networkLabel={selectedNetwork === 'mainnet' ? 'Mainnet' : 'Testnet'}
        onRefreshBalance={fetchBalance}
        loading={loading}
      />
      <span className="text-gray-700 text-lg min-h-[1.5em] flex items-center">
        {loading ? <span className="loading loading-spinner loading-xs mr-2" /> : null}
        {!loading && !error && balance ? (
          <button
            type="button"
            className="text-left text-gray-700 text-lg cursor-pointer hover:opacity-90"
            onClick={fetchBalance}
            title="Click to refresh balance"
            disabled={loading}
          >
            {balance} ALGO
          </button>
        ) : null}
        {!loading && error ? 'N/A' : null}
        {!loading && !error && usdDisplay ? <span className="ml-2 text-gray-500 text-sm">({usdDisplay} USD)</span> : null}
        {selectedNetwork === 'testnet' && (
          <a
            href="https://bank.testnet.algorand.network/"
            target="_blank"
            rel="noreferrer"
            title="Get testnet coins from this faucet"
            className="ml-2 p-1 rounded hover:bg-gray-200 text-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M12 3 3 7v2h18V7l-9-4Zm7 6H5v9h14V9Zm-12 2h2v5H7v-5Zm5 0h-2v5h2v-5Zm2 0h2v5h-2v-5Z" />
            </svg>
          </a>
        )}
      </span>
      {/* Bank icon moved inline with balance */}
    </div>
  )
}

let supportedWallets: SupportedWallet[]
if (import.meta.env.VITE_ALGOD_NETWORK === 'localnet') {
  const kmdConfig = getKmdConfigFromViteEnvironment()
  supportedWallets = [
    {
      id: WalletId.KMD,
      options: {
        baseServer: kmdConfig.server,
        token: String(kmdConfig.token),
        port: String(kmdConfig.port),
      },
    },
  ]
} else {
  supportedWallets = [
    { id: WalletId.DEFLY },
    { id: WalletId.PERA },
    { id: WalletId.EXODUS },
    // If you are interested in WalletConnect v2 provider
    // refer to https://github.com/TxnLab/use-wallet for detailed integration instructions
  ]
}

export default function App() {
  const algodConfig = getAlgodConfigFromViteEnvironment()

  const [selectedNetwork, setSelectedNetwork] = React.useState<SelectableNetwork>(() => {
    const fromStorage = localStorage.getItem('af-network') as SelectableNetwork | null
    if (fromStorage === 'mainnet' || fromStorage === 'testnet') return fromStorage
    const envNet = (algodConfig.network || '').toLowerCase()
    return envNet === 'mainnet' ? 'mainnet' : 'testnet'
  })

  React.useEffect(() => {
    localStorage.setItem('af-network', selectedNetwork)
  }, [selectedNetwork])

  const presetNetworks: Record<SelectableNetwork, { algod: { baseServer: string; port: string | number; token: string } }> = {
    testnet: {
      algod: { baseServer: 'https://testnet-api.algonode.cloud', port: '', token: '' },
    },
    mainnet: {
      algod: { baseServer: 'https://mainnet-api.algonode.cloud', port: '', token: '' },
    },
  }

  const networksConfig =
    algodConfig.network === 'localnet'
      ? {
          localnet: {
            algod: {
              baseServer: algodConfig.server,
              port: algodConfig.port,
              token: String(algodConfig.token),
            },
          },
        }
      : {
          testnet: presetNetworks.testnet,
          mainnet: presetNetworks.mainnet,
        }

  const walletManager = new WalletManager({
    wallets: supportedWallets,
    defaultNetwork: algodConfig.network === 'localnet' ? 'localnet' : selectedNetwork,
    networks: networksConfig as any,
    options: {
      resetNetwork: true,
    },
  })

  return (
    <SnackbarProvider maxSnack={3}>
      <WalletProvider manager={walletManager} key={algodConfig.network === 'localnet' ? 'localnet' : selectedNetwork}>
        <AlgoPrice />
        <AccountInfo selectedNetwork={selectedNetwork} onNetworkChange={setSelectedNetwork} />
        <Home />
      </WalletProvider>
    </SnackbarProvider>
  )
}
