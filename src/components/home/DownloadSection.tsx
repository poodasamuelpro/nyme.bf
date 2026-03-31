'use client'

export default function DownloadSection() {
  return (
    <section id="telecharger" className="py-24 bg-nyme-dark relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-nyme-orange/10 via-transparent to-nyme-blue/20 pointer-events-none" />
      <div className="absolute inset-0 hero-pattern opacity-30 pointer-events-none" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="text-6xl mb-6 animate-bounce">📱</div>
        <h2 className="font-heading text-4xl sm:text-6xl font-extrabold text-white mb-6">
          Téléchargez NYME
          <br />
          <span className="text-gradient">gratuitement</span>
        </h2>
        <p className="text-white/60 font-body text-lg mb-10 max-w-xl mx-auto">
          Disponible sur Android et iOS. Commandez votre première livraison en moins de 2 minutes.
        </p>

        <div className="flex flex-wrap justify-center gap-4 mb-12">
          <a
            href="#"
            className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white text-nyme-dark font-semibold hover:bg-white/90 transition-all duration-300 hover:-translate-y-1 shadow-xl"
          >
            <span className="text-2xl">🤖</span>
            <div className="text-left">
              <div className="text-xs text-gray-500 leading-none">Disponible sur</div>
              <div className="text-base font-bold font-heading">Google Play</div>
            </div>
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white text-nyme-dark font-semibold hover:bg-white/90 transition-all duration-300 hover:-translate-y-1 shadow-xl"
          >
            <span className="text-2xl">🍎</span>
            <div className="text-left">
              <div className="text-xs text-gray-500 leading-none">Disponible sur</div>
              <div className="text-base font-bold font-heading">App Store</div>
            </div>
          </a>
        </div>

        <div className="flex flex-wrap justify-center gap-6 text-white/40 text-sm font-body">
          <span>✓ Téléchargement gratuit</span>
          <span>✓ Sans abonnement</span>
          <span>✓ Aucune carte requise</span>
        </div>
      </div>
    </section>
  )
}
