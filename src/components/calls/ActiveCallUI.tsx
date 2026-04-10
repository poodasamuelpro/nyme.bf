// src/components/calls/ActiveCallUI.tsx
// ═══════════════════════════════════════════════════════════════════════════
// INTERFACE D'APPEL EN COURS — NYME
// Affiché pendant un appel WebRTC actif (audio uniquement)
// Chronomètre, bouton sourdine, bouton raccrocher
// Compatible : client et coursier
// ═══════════════════════════════════════════════════════════════════════════
'use client'
import { useState, useEffect, useRef } from 'react'
import { Phone, PhoneOff, Mic, MicOff, Volume2 } from 'lucide-react'

interface Props {
  remoteStream:   MediaStream | null
  remoteUserName: string
  remoteAvatar?:  string | null
  onHangUp:       () => void
  onToggleMute:   () => boolean  // retourne true si maintenant muet
  callStatus:     'connecting' | 'connected' | 'ended'
}

export default function ActiveCallUI({
  remoteStream,
  remoteUserName,
  remoteAvatar,
  onHangUp,
  onToggleMute,
  callStatus,
}: Props) {
  const [elapsed,  setElapsed]  = useState(0)
  const [isMuted,  setIsMuted]  = useState(false)
  const audioRef   = useRef<HTMLAudioElement | null>(null)
  const timerRef   = useRef<NodeJS.Timeout | null>(null)

  // Démarrer le chronomètre quand connecté
  useEffect(() => {
    if (callStatus === 'connected') {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [callStatus])

  // Attacher le flux audio distant au tag <audio>
  useEffect(() => {
    if (audioRef.current && remoteStream) {
      audioRef.current.srcObject = remoteStream
      audioRef.current.play().catch(err => {
        console.warn('[ActiveCallUI] audio.play() error:', err)
      })
    }
  }, [remoteStream])

  // Formater le temps écoulé mm:ss
  const formatTime = (sec: number): string => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0')
    const s = (sec % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const handleToggleMute = () => {
    const nowMuted = onToggleMute()
    setIsMuted(nowMuted)
  }

  const statusLabel = {
    connecting: '🔄 Connexion...',
    connected:  '🟢 En communication',
    ended:      '⚫ Appel terminé',
  }[callStatus]

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/80 backdrop-blur-sm pb-10">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl shadow-2xl p-8 flex flex-col items-center gap-6 w-80 max-w-[90vw]">

        {/* Audio tag caché — joue le flux distant */}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio ref={audioRef} autoPlay playsInline className="hidden" />

        {/* Indicateur de signal sonore */}
        {callStatus === 'connected' && (
          <div className="flex items-center gap-1.5">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-green-400 rounded-full"
                style={{
                  height: `${8 + i * 6}px`,
                  animation: `soundBar 0.8s ease-in-out ${i * 0.1}s infinite alternate`,
                }}
              />
            ))}
          </div>
        )}

        {/* Avatar */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl">
          {remoteAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={remoteAvatar} alt={remoteUserName} className="w-20 h-20 rounded-full object-cover" />
          ) : (
            <span className="text-white text-3xl font-black select-none">
              {remoteUserName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Nom + statut */}
        <div className="text-center">
          <h2 className="text-xl font-black text-white">{remoteUserName}</h2>
          <p className="text-sm text-gray-400 mt-1">{statusLabel}</p>
          {callStatus === 'connected' && (
            <p className="text-2xl font-mono text-green-400 font-bold mt-2 tabular-nums">
              {formatTime(elapsed)}
            </p>
          )}
        </div>

        {/* Boutons d'action */}
        <div className="flex items-center gap-6">
          {/* Sourdine */}
          <button
            onClick={handleToggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${
              isMuted
                ? 'bg-red-500/20 border-2 border-red-500'
                : 'bg-white/10 border border-white/20 hover:bg-white/20'
            }`}
            aria-label={isMuted ? 'Activer le micro' : 'Couper le micro'}
          >
            {isMuted
              ? <MicOff  size={22} className="text-red-400" />
              : <Mic     size={22} className="text-white"   />
            }
          </button>

          {/* Volume (décoratif — impossible de couper le son distant via WebRTC sans AudioContext) */}
          <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
            <Volume2 size={22} className="text-white/60" />
          </div>

          {/* Raccrocher */}
          <button
            onClick={onHangUp}
            className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/40 hover:bg-red-600 active:scale-95 transition-all"
            aria-label="Raccrocher"
          >
            <PhoneOff size={22} className="text-white" />
          </button>
        </div>

        {isMuted && (
          <p className="text-xs text-red-400 font-semibold animate-pulse">
            🎙️ Microphone coupé — l'autre personne ne vous entend pas
          </p>
        )}
      </div>

      <style jsx>{`
        @keyframes soundBar {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1.0); }
        }
      `}</style>
    </div>
  )
}