'use client'

export default function ForCouriersSection() {
  return (
    <section id="devenir-coursier" className="py-24 bg-nyme-dark relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_left,rgba(15,52,96,0.5)_0%,transparent_60%)] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-nyme-blue-light/30 mb-6">
              <span className="text-nyme-blue-light text-sm">🛵 Pour les coursiers</span>
            </div>
            <h2 className="font-heading text-4xl sm:text-5xl font-extrabold text-white mb-6">
              Gagnez de l'argent avec votre
              <span className="text-gradient"> moto ou vélo</span>
            </h2>
            <p className="text-white/60 font-body text-lg leading-relaxed mb-8">
              Rejoignez la communauté NYME et transformez vos déplacements en revenus. Vous choisissez vos horaires, vos zones, vos tarifs.
            </p>

            <div className="space-y-4 mb-8">
              {[
                { emoji: '💰', title: 'Revenus directs', desc: 'Recevez vos gains après chaque livraison dans votre wallet NYME' },
                { emoji: '🗓️', title: 'Flexibilité totale', desc: 'Travaillez quand vous voulez. En ligne, hors ligne, occupé — vous contrôlez' },
                { emoji: '⭐', title: 'Badge "Favori"', desc: 'Construisez votre réputation et soyez demandé en priorité par les clients' },
                { emoji: '📱', title: 'App simple & intuitive', desc: 'Interface conçue pour une utilisation rapide même en mouvement' },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-4 p-4 rounded-xl nyme-card">
                  <span className="text-2xl shrink-0">{item.emoji}</span>
                  <div>
                    <h4 className="text-white font-semibold text-sm mb-1">{item.title}</h4>
                    <p className="text-white/50 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <a
              href="#telecharger"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-gradient-to-r from-nyme-blue to-nyme-blue-light text-white font-body font-semibold hover:shadow-xl hover:shadow-nyme-blue-light/30 transition-all duration-300 hover:-translate-y-1"
            >
              📥 S'inscrire comme coursier
            </a>
          </div>

          {/* Earnings mockup */}
          <div className="relative">
            <div className="glass rounded-3xl p-6 border border-nyme-blue-light/20">
              <h3 className="font-heading text-white text-xl font-bold mb-6">💼 Exemple de gains quotidiens</h3>

              <div className="space-y-4 mb-6">
                {[
                  { route: 'Ouaga 2000 → Hamdallaye', price: '3 500 FCFA', time: '25 min' },
                  { route: 'Tampouy → Patte d\'Oie', price: '2 800 FCFA', time: '18 min' },
                  { route: 'Ouaga Inter → Gounghin', price: '4 200 FCFA', time: '32 min' },
                  { route: 'Zone du Bois → Dapoya', price: '1 900 FCFA', time: '12 min' },
                ].map((delivery, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                    <div>
                      <div className="text-white text-xs font-medium">{delivery.route}</div>
                      <div className="text-white/40 text-xs">{delivery.time}</div>
                    </div>
                    <div className="text-nyme-orange font-bold text-sm">{delivery.price}</div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-nyme-orange/20 to-nyme-orange/5 border border-nyme-orange/20">
                <div className="flex justify-between items-center">
                  <span className="text-white/70 font-body text-sm">Total journée (4 courses)</span>
                  <div>
                    <div className="text-nyme-orange font-heading text-2xl font-bold">12 400 FCFA</div>
                    <div className="text-white/40 text-xs text-right">après commission NYME</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
