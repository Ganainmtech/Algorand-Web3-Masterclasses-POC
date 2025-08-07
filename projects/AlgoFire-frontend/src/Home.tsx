// src/components/Home.tsx
import { useWallet } from '@txnlab/use-wallet-react'
import React, { useState } from 'react'
import ConnectWallet from './components/ConnectWallet'
import Transact from './components/Transact'
import AppCalls from './components/AppCalls'

interface HomeProps {}

const Home: React.FC<HomeProps> = () => {
  const [openWalletModal, setOpenWalletModal] = useState<boolean>(false)
  const [openDemoModal, setOpenDemoModal] = useState<boolean>(false)
  const [claimed, setClaimed] = useState<boolean>(false)
  const { activeAddress, wallets } = useWallet()

  const toggleWalletModal = () => {
    setOpenWalletModal(!openWalletModal)
  }

  const toggleDemoModal = () => {
    setOpenDemoModal(!openDemoModal)
  }

  // Reset claim message if wallet disconnects
  React.useEffect(() => {
    if (!activeAddress) setClaimed(false)
  }, [activeAddress])

  // Wallet hover disconnect logic
  const [showDisconnect, setShowDisconnect] = useState(false)
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-400 via-cyan-300 to-pink-200">
      <div className="w-full max-w-lg bg-white/90 rounded-3xl shadow-2xl p-8 flex flex-col items-center border-4 border-pink-200">
        <h1 className="text-4xl md:text-5xl font-extrabold text-teal-700 mb-2 drop-shadow-sm">
          Welcome to <span className="text-pink-500">MasterPass</span> <span role="img" aria-label="ticket">🎟️</span>
        </h1>
        <p className="text-lg text-gray-700 mt-2 mb-6 font-medium">
          Your exclusive ticket to join the next-gen Web3 event. Connect your wallet, claim your pass, and be part of something special!
        </p>
        <div className="flex flex-col gap-4 w-full items-center mt-2">
          {!activeAddress && (
            <button
              data-test-id="connect-wallet"
              className="btn btn-primary w-60 text-lg bg-gradient-to-r from-teal-400 to-pink-400 border-0 shadow-md hover:scale-105 transition-transform"
              onClick={toggleWalletModal}
            >
              Connect Wallet
            </button>
          )}
          <button
            data-test-id="transactions-demo"
            className={`btn w-60 text-lg bg-gradient-to-r from-pink-400 to-teal-400 border-0 shadow-md hover:scale-105 transition-transform ${!activeAddress ? 'btn-disabled opacity-60' : ''}`}
            onClick={toggleDemoModal}
            disabled={!activeAddress}
          >
            Send Payment
          </button>
          <button
            className={`btn w-60 text-lg bg-gradient-to-r from-yellow-300 to-pink-400 border-0 shadow-md hover:scale-105 transition-transform ${!activeAddress || claimed ? 'btn-disabled opacity-60' : ''}`}
            onClick={() => setClaimed(true)}
            disabled={!activeAddress || claimed}
            data-test-id="claim-masterpass"
          >
            {claimed ? 'MasterPass Claimed!' : 'Get Your MasterPass'}
          </button>
          {claimed && (
            <div className="mt-2 text-green-600 font-bold text-lg animate-bounce" data-test-id="claim-success">
              🎉 You&apos;ve claimed your ticket!
            </div>
          )}
        </div>
        <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} />
        <Transact openModal={openDemoModal} setModalState={setOpenDemoModal} />
      </div>
    </div>
  )
}

export default Home
