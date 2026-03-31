'use client'

import { useEffect, useRef } from 'react'
import { ArrowRight, Star, Shield, MapPin, Clock } from 'lucide-react'

export default function HeroSection() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.opacity = '0'
    el.style.transform = 'translateY(30px)'
    setTimeout(() => {
      el.style.transition = 'all 0.8s ease-out'
      el.style.opacity = '1'
      el.style.transform = 'translateY(0)'
    }, 100)
  }, [])

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-nyme-dark noise">
      {/* Animated background layers */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-nyme-blue/40 blur-3xl animate-pulse-slow" />
        <div className="absolute top-40 right-16 w-96 h-96 rounded-full bg-nyme-orange/10 blur-3xl animate-float" style={{ animationDelay: '-2s' }} />
        <div className="absolute bottom-20 left-1/3 w-80 h-80 rounded-full bg-nyme-blue-light/15 blur-3xl animate-pulse-slow" style={{ animationDelay: '-4s' }} />

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'linear-gradient(rgba(249,115,22,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.5) 1px, transparent 1px)',
            backgroundSize: '80px 80px'
          }}
        />

        {/* Floating orbs */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-nyme-orange/20 animate-float"
            style={{
              width: `${8 + i * 4}px`,
              height: `${8 + i * 4}px`,
              top: `${15 + i * 12}%`,
              left: `${5 + i * 15}%`,
              animationDelay: `${-i * 1.2}s`,
              animationDuration: `${5 + i}s`
            }}
          />
        ))}
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* Left: Content */}
          <div ref={ref}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-nyme-orange/30 mb-6">
              <div className="w-2 h-2 rounded-full bg-nyme-orange animate-pulse" />
              <span className="text-sm text-nyme-orange font-body font-medium">🇧🇫 Disponible à Ouagadougou</span>
            </div>

            <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] mb-6">
              <span className="text-white">Livraison</span>
              <br />
              <span className="text-gradient">Rapide &</span>
              <br />
              <span className="text-white">Intelligente</span>
            </h1>

            <p className="text-white/60 text-lg font-body leading-relaxed mb-8 max-w-lg">
              Envoyez vos colis en quelques secondes. Négociez votre prix, suivez votre coursier en temps réel, payez avec Orange Money, Moov Money ou Wave.
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-4 mb-8">
              {[
                { icon: Shield, text: 'Coursiers vérifiés' },
                { icon: MapPin, text: 'Suivi GPS live' },
                { icon: Clock, text: 'Livraison en 30 min' },
                { icon: Star, text: '4.8★ satisfaction' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                  <Icon size={14} className="text-nyme-orange" />
                  <span className="text-white/70 text-xs font-body">{text}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4">
              <a
                href="#telecharger"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-gradient-to-r from-nyme-orange to-nyme-red text-white font-body font-semibold hover:shadow-xl hover:shadow-nyme-orange/30 transition-all duration-300 hover:-translate-y-1"
              >
                Commander maintenant
                <ArrowRight size={18} />
              </a>
              <a
                href="/#devenir-coursier"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl glass border border-white/20 text-white font-body font-medium hover:border-nyme-orange/40 transition-all duration-300"
              >
                Devenir coursier
              </a>
            </div>

            {/* Social proof */}
            <div className="mt-10 flex items-center gap-4">
              <div className="flex -space-x-2">
                {['bg-nyme-orange', 'bg-nyme-blue-light', 'bg-nyme-red', 'bg-green-500'].map((c, i) => (
                  <div key={i} className={`w-8 h-8 rounded-full ${c} border-2 border-nyme-dark flex items-center justify-center text-xs font-bold text-white`}>
                    {['A', 'M', 'S', 'F'][i]}
                  </div>
                ))}
              </div>
              <div>
                <div className="text-white font-semibold text-sm">+2 000 utilisateurs</div>
                <div className="text-white/40 text-xs">nous font déjà confiance</div>
              </div>
            </div>
          </div>

          {/* Right: Visual */}
          <div className="relative flex items-center justify-center">
            {/* Phone mockup */}
            <div className="relative animate-float">
              <div className="w-72 h-[560px] rounded-[3rem] bg-gradient-to-br from-nyme-blue to-nyme-dark border-2 border-nyme-orange/20 shadow-2xl shadow-nyme-orange/10 overflow-hidden relative">
                {/* Status bar */}
                <div className="h-10 bg-nyme-blue-mid/80 flex items-center justify-between px-6 pt-2">
                  <span className="text-white/60 text-xs">09:41</span>
                  <div className="flex gap-1">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className={`h-2.5 w-1 rounded-sm ${i < 3 ? 'bg-white/60' : 'bg-white/20'}`} />
                    ))}
                  </div>
                </div>

                {/* Map area */}
                <div className="mx-3 mt-2 h-48 rounded-2xl overflow-hidden relative bg-gradient-to-br from-nyme-blue-mid to-nyme-blue">
                  {/* Fake map grid */}
                  <div className="absolute inset-0 opacity-20"
                    style={{
                      backgroundImage: 'linear-gradient(rgba(249,115,22,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.6) 1px, transparent 1px)',
                      backgroundSize: '20px 20px'
                    }}
                  />
                  {/* Route line */}
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 200">
                    <path d="M60,160 Q100,80 180,60 Q220,50 250,40" stroke="#F97316" strokeWidth="3" fill="none" strokeDasharray="8,4" className="animate-dash" />
                    <circle cx="60" cy="160" r="8" fill="#10B981" />
                    <circle cx="250" cy="40" r="8" fill="#F97316" />
                    <circle cx="150" cy="95" r="12" fill="#F97316" opacity="0.9" />
                    <circle cx="150" cy="95" r="20" fill="#F97316" opacity="0.2" className="animate-pulse" />
                  </svg>
                  <div className="absolute bottom-2 right-2 bg-white/10 backdrop-blur rounded-lg px-2 py-1">
                    <span className="text-white text-xs font-semibold">~12 min</span>
                  </div>
                </div>

                {/* Delivery card */}
                <div className="mx-3 mt-3 p-4 rounded-2xl bg-gradient-to-br from-nyme-orange/20 to-nyme-orange/5 border border-nyme-orange/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white font-semibold text-sm">Course en cours</span>
                    <span className="text-nyme-orange text-xs px-2 py-0.5 rounded-full bg-nyme-orange/10">En route</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-nyme-orange flex items-center justify-center text-white font-bold text-sm">M</div>
                    <div>
                      <div className="text-white text-sm font-medium">Moussa K.</div>
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={10} className="fill-nyme-orange text-nyme-orange" />
                        ))}
                      </div>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="text-nyme-orange font-bold">3 500</div>
                      <div className="text-white/40 text-xs">FCFA</div>
                    </div>
                  </div>
                </div>

                {/* Bottom actions */}
                <div className="mx-3 mt-3 grid grid-cols-3 gap-2">
                  {['Appeler', 'Chat', 'Partager'].map((action, i) => (
                    <div key={action} className="py-2 rounded-xl bg-white/5 border border-white/10 text-center text-xs text-white/60">
                      {action}
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating notification */}
              <div className="absolute -top-6 -right-12 glass border border-nyme-orange/30 rounded-2xl px-4 py-3 shadow-xl animate-float" style={{ animationDelay: '-3s' }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-nyme-orange/20 flex items-center justify-center text-nyme-orange text-lg">📦</div>
                  <div>
                    <div className="text-white text-xs font-semibold">Colis récupéré !</div>
                    <div className="text-white/40 text-xs">il y a 2 min</div>
                  </div>
                </div>
              </div>

              {/* Price chip */}
              <div className="absolute -bottom-4 -left-10 glass border border-nyme-blue-light/30 rounded-xl px-4 py-2 shadow-xl animate-float" style={{ animationDelay: '-1.5s' }}>
                <div className="text-white/50 text-xs">Prix négocié</div>
                <div className="text-nyme-orange font-heading text-lg font-bold">3 500 FCFA</div>
              </div>
            </div>

            {/* Pulse rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-80 h-80 rounded-full border border-nyme-orange/10 animate-ping" style={{ animationDuration: '3s' }} />
              <div className="absolute w-96 h-96 rounded-full border border-nyme-orange/5 animate-ping" style={{ animationDuration: '4s', animationDelay: '-1s' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
        <span className="text-white/30 text-xs tracking-widest uppercase">Défiler</span>
        <div className="w-5 h-8 rounded-full border border-white/20 flex justify-center pt-2">
          <div className="w-1 h-2 rounded-full bg-nyme-orange animate-bounce" />
        </div>
      </div>
    </section>
  )
}
