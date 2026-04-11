'use client'

import { useEffect, useRef, useState } from 'react'

const methods = [
  { emoji: '💵', name: 'Cash',        desc: 'Payez à la livraison', color: 'from-green-500/22 to-green-500/5',              border: 'border-green-500/35',        glow: 'shadow-green-500/22' },
  { emoji: '🟠', name: 'Orange Money', desc: 'Paiement sécurisé Orange',    color: 'from-orange-500/22 to-orange-500/5',             border: 'border-orange-500/35',       glow: 'shadow-orange-500/22' },
  { emoji: '🔵', name: 'Moov Money',  desc: 'Transfert Moov',      color: 'from-nyme-blue-light/22 to-nyme-blue-light/5',  border: 'border-nyme-blue-light/35',  glow: 'shadow-nyme-blue-light/22' },
  { emoji: '💜', name: 'Wave',        desc: 'Paiement Wave',        color: 'from-purple-500/22 to-purple-500/5',             border: 'border-purple-500/35',       glow: 'shadow-purple-500/22' },
]

const rows = [
  { label: 'Frais de départ (course courte — 2 km)',    value: '800 FCFA' },
  { label: 'Tarif kilométrique (600 FCFA × 2 km)',      value: '1 200 FCFA' },
  { label: 'Frais de service NYME',                     value: '200 FCFA' },
]

export default function PaymentSection() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible,       setVisible]       = useState(false)
  const [activeMethod,  setActiveMethod]  = useState(0)

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.1 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const t = setInterval(() => setActiveMethod(m => (m + 1) % methods.length), 1800)
    return () => clearInterval(t)
  }, [])

  return (
    <section id="tarifs" className="py-16 sm:py-24 bg-nyme-blue-mid relative overflow-hidden" ref={ref}>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center mb-10 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full glass border border-nyme-orange/22 mb-4">
            <span className="text-nyme-orange text-xs sm:text-sm font-semibold font-body">💳 Paiement</span>
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-3 sm:mb-4">
            Payez comme vous voulez
          </h2>
          <p className="text-white/70 font-body text-base sm:text-lg max-w-xl mx-auto px-4">
            Cash à la livraison ou Mobile Money — 100% adapté au marché burkinabè, sans frais cachés.
          </p>
        </div>

        {/* Méthodes */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-10 sm:mb-16">
          {methods.map((m, i) => (
            <div
              key={m.name}
              onClick={() => setActiveMethod(i)}
              className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-gradient-to-br ${m.color} border ${m.border} text-center cursor-pointer transition-all duration-300 ${
                activeMethod === i ? `scale-105 shadow-lg ${m.glow} -translate-y-1` : 'hover:scale-[1.02] hover:-translate-y-0.5'
              } ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="text-2xl sm:text-4xl mb-2 sm:mb-3">{m.emoji}</div>
              <h3 className="font-heading text-sm sm:text-lg font-bold text-white mb-1 sm:mb-2 leading-tight">{m.name}</h3>
              <p className="text-white/65 text-[10px] sm:text-xs font-body hidden sm:block">{m.desc}</p>
              {activeMethod === i && <div className="mt-2 w-4 h-0.5 bg-nyme-orange rounded-full mx-auto" />}
            </div>
          ))}
        </div>

        {/* Calculateur */}
        <div className={`max-w-2xl mx-auto glass rounded-2xl sm:rounded-3xl p-5 sm:p-8 border border-nyme-orange/22 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h3 className="font-heading text-xl sm:text-2xl font-bold text-white mb-1 sm:mb-2 text-center">Exemple de tarification</h3>
          <p className="text-white/55 text-xs sm:text-sm text-center mb-5 sm:mb-6 font-body">Pour une livraison courte distance à Ouagadougou (2 km)</p>

          <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
            {rows.map((row) => (
              <div key={row.label} className="flex justify-between items-center py-2 border-b border-white/12 gap-4">
                <span className="text-white/70 text-xs sm:text-sm font-body">{row.label}</span>
                <span className="text-white text-xs sm:text-sm font-semibold shrink-0 font-body">{row.value}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center p-3 sm:p-4 rounded-xl bg-nyme-orange/12 border border-nyme-orange/25">
            <span className="text-white font-bold text-sm sm:text-base font-body">Total client</span>
            <span className="text-nyme-orange font-heading text-xl sm:text-2xl font-bold">2 200 FCFA</span>
          </div>

          <p className="text-center text-white/40 text-[10px] sm:text-xs mt-3 sm:mt-4 font-body">
            * Le client peut négocier ce prix à la hausse ou à la baisse selon l'accord avec le coursier
          </p>
          <p className="text-center text-nyme-orange/70 text-[10px] sm:text-xs mt-1 font-body font-semibold">
            📌 Prix minimum garanti : 800 FCFA · Tarifs dégressifs selon la distance
          </p>
        </div>
      </div>
    </section>
  )
}