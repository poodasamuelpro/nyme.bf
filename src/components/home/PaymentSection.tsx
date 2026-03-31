'use client'

export default function PaymentSection() {
  return (
    <section id="tarifs" className="py-24 bg-nyme-blue-mid relative overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-nyme-orange/20 mb-4">
            <span className="text-nyme-orange text-sm">💳 Paiement</span>
          </div>
          <h2 className="font-heading text-4xl sm:text-5xl font-extrabold text-white mb-4">
            Payez comme vous voulez
          </h2>
          <p className="text-white/50 font-body text-lg max-w-xl mx-auto">
            Cash à la livraison ou paiement mobile — vous avez le choix. 100% adapté au marché burkinabè.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {[
            { emoji: '💵', name: 'Cash', desc: 'Payez le coursier directement à la livraison', color: 'from-green-500/20 to-green-500/5', border: 'border-green-500/30' },
            { emoji: '🟠', name: 'Orange Money', desc: 'Paiement sécurisé via votre compte Orange Money', color: 'from-orange-500/20 to-orange-500/5', border: 'border-orange-500/30' },
            { emoji: '🔵', name: 'Moov Money', desc: 'Transfert instantané depuis Moov Money', color: 'from-nyme-blue-light/20 to-nyme-blue-light/5', border: 'border-nyme-blue-light/30' },
            { emoji: '💜', name: 'Wave', desc: 'Paiement rapide et sans frais avec Wave', color: 'from-purple-500/20 to-purple-500/5', border: 'border-purple-500/30' },
          ].map((method) => (
            <div key={method.name} className={`p-6 rounded-2xl bg-gradient-to-br ${method.color} border ${method.border} text-center hover:scale-105 transition-all duration-300`}>
              <div className="text-4xl mb-3">{method.emoji}</div>
              <h3 className="font-heading text-lg font-bold text-white mb-2">{method.name}</h3>
              <p className="text-white/50 text-xs font-body">{method.desc}</p>
            </div>
          ))}
        </div>

        {/* Pricing example */}
        <div className="max-w-2xl mx-auto glass rounded-3xl p-8 border border-nyme-orange/20">
          <h3 className="font-heading text-2xl font-bold text-white mb-2 text-center">Exemple de tarification</h3>
          <p className="text-white/40 text-sm text-center mb-6 font-body">Pour une livraison de 5 km à Ouagadougou</p>

          <div className="space-y-3 mb-6">
            {[
              { label: 'Tarif par km (500 FCFA × 5)', value: '2 500 FCFA' },
              { label: 'Tarif par minute (50 FCFA × 15 min)', value: '750 FCFA' },
              { label: 'Frais de service NYME', value: '500 FCFA' },
            ].map((row) => (
              <div key={row.label} className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-white/60 text-sm">{row.label}</span>
                <span className="text-white text-sm font-medium">{row.value}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center p-4 rounded-xl bg-nyme-orange/10 border border-nyme-orange/20">
            <span className="text-white font-semibold">Total client</span>
            <span className="text-nyme-orange font-heading text-2xl font-bold">3 750 FCFA</span>
          </div>

          <p className="text-center text-white/30 text-xs mt-4 font-body">
            * Le client peut négocier ce prix à la hausse ou à la baisse
          </p>
        </div>
      </div>
    </section>
  )
}
