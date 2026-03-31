'use client'

import { useState } from 'react'

export default function DownloadSection() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  return (
    <section id="telecharger" className="py-16 sm:py-24 bg-nyme-dark relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-nyme-orange/10 via-transparent to-nyme-blue/20 pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(249,115,22,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(249,115,22,0.8) 1px,transparent 1px)', backgroundSize: '60px 60px' }} />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="text-5xl sm:text-6xl mb-4 sm:mb-6 animate-bounce">📱</div>

        <h2 className="font-heading text-3xl sm:text-4xl lg:text-6xl font-extrabold text-white mb-4 sm:mb-6">
          Téléchargez NYME<br />
          <span className="text-gradient">gratuitement</span>
        </h2>

        <p className="text-white/60 font-body text-base sm:text-lg mb-6 sm:mb-8 max-w-xl mx-auto px-4">
          L'application est en cours de développement. Laissez votre email pour être notifié au lancement officiel à Ouagadougou.
        </p>

        {/* Waitlist */}
        {!submitted ? (
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-8 sm:mb-10 px-4 sm:px-0">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="votre@email.com"
              className="flex-1 px-4 sm:px-5 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-white/5 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-nyme-orange/50 font-body text-sm"
            />
            <button
              onClick={() => { if (email.includes('@')) setSubmitted(true) }}
              className="px-5 sm:px-6 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-gradient-to-r from-nyme-orange to-nyme-red text-white font-semibold text-sm hover:shadow-lg hover:shadow-nyme-orange/30 transition-all duration-300 whitespace-nowrap"
            >
              M'alerter au lancement
            </button>
          </div>
        ) : (
          <div className="mb-8 sm:mb-10 p-4 rounded-2xl glass border border-green-400/30 max-w-md mx-auto">
            <div className="text-3xl mb-2">✅</div>
            <p className="text-green-400 font-body font-medium text-sm">Parfait ! Vous serez notifié dès le lancement à Ouagadougou.</p>
          </div>
        )}

        {/* Stores (désactivés — app en dev) */}
        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 mb-8 sm:mb-10 px-4 sm:px-0 opacity-50">
          {[
            { icon: '🤖', store: 'Google Play', sub: 'Bientôt disponible' },
            { icon: '🍎', store: 'App Store', sub: 'Bientôt disponible' },
          ].map(({ icon, store, sub }) => (
            <div key={store} className="flex items-center gap-3 px-5 sm:px-6 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl bg-white/10 border border-white/20 cursor-not-allowed">
              <span className="text-2xl">{icon}</span>
              <div className="text-left">
                <div className="text-white/40 text-[10px] sm:text-xs leading-none">{sub}</div>
                <div className="text-white/60 text-sm sm:text-base font-bold font-heading">{store}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-white/30 text-xs sm:text-sm font-body">
          <span>✓ Téléchargement gratuit</span>
          <span>✓ Sans abonnement</span>
          <span>✓ Aucune carte requise</span>
        </div>
      </div>
    </section>
  )
}