import React from 'react'
import QRCode from 'react-qr-code'

interface AddressQRModalProps {
  open: boolean
  onClose: () => void
  address: string
  balanceAlgos?: string | null
  balanceUsd?: string | null
  networkLabel: string
  onRefreshBalance?: () => void
  loading?: boolean
}

export default function AddressQRModal({
  open,
  onClose,
  address,
  balanceAlgos,
  balanceUsd,
  networkLabel,
  onRefreshBalance,
  loading,
}: AddressQRModalProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1200)
  }

  return (
    <dialog className={`modal ${open ? 'modal-open' : ''}`}>
      <form method="dialog" className="modal-box max-w-md relative">
        <button type="button" className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" title="Close" onClick={onClose}>
          ✕
        </button>

        <div className="flex items-start justify-between mb-2 pr-8">
          <div className="text-sm text-gray-500">Generated: {new Date().toLocaleDateString()}</div>
        </div>

        <div className="text-sm text-gray-600">Network: {networkLabel}</div>
        <div className="mt-1 text-gray-800">
          {typeof balanceAlgos === 'string' && (
            <div>
              Balance:{' '}
              <button
                type="button"
                className="underline decoration-dotted text-teal-700 hover:text-teal-800 disabled:text-gray-400"
                onClick={onRefreshBalance}
                disabled={!onRefreshBalance || !!loading}
                title="Refresh balance"
              >
                {loading ? '...' : balanceAlgos}
              </button>{' '}
              ALGO
            </div>
          )}
          {typeof balanceUsd === 'string' && <div>Value: {balanceUsd}</div>}
        </div>

        <div className="w-full flex items-center justify-center my-6">
          <div className="bg-white p-3 rounded-lg shadow border">
            <QRCode value={address} size={220} />
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <code className="text-xs break-all text-gray-700">{address}</code>
          <button type="button" className="ml-2 p-2 rounded hover:bg-gray-200" title="Copy address" onClick={handleCopy}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <rect x="9" y="9" width="13" height="13" rx="2" strokeWidth="2" stroke="currentColor" fill="none" />
              <rect x="3" y="3" width="13" height="13" rx="2" strokeWidth="2" stroke="currentColor" fill="none" />
            </svg>
          </button>
        </div>
        {copied && <div className="mt-1 text-xs text-green-600">Copied!</div>}
      </form>
      <form method="dialog" className="modal-backdrop" onClick={onClose}>
        <button aria-label="Close backdrop" />
      </form>
    </dialog>
  )
}
