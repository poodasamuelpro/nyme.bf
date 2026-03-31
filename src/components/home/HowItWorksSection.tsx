'use client'

const steps = [
  {
    step: '01',
    emoji: '📍',
    title: 'Saisissez départ & arrivée',
    desc: 'Indiquez d\'où part votre colis et où il doit aller. L\'app calcule le prix automatiquement en secondes.',
  },
  {
    step: '02',
    emoji: '💬',
    title: 'Négociez votre prix',
    desc: 'Acceptez le prix calculé ou proposez le vôtre. Les coursiers proches répondent avec leurs offres en temps réel.',
  },
  {
    step: '03',
    emoji: '🛵',
    title: 'Choisissez votre coursier',
    desc: 'Sélectionnez l\'offre qui vous convient parmi les propositions. Tous les coursiers sont vérifiés et notés.',
  },
  {
    step: '04',
    emoji: '📦',
    title: 'Suivez en direct',
    desc: 'Votre coursier est sur la carte en temps réel. Notifications à chaque étape. Livraison confirmée avec photo.',
  },
]

export default function HowItWorksSection() {
  return (
    <section id="comment-ca-marche" className="py-24 bg-nyme-blue-mid relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.08)_0%,transparent_70%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-nyme-blue-light/30 mb-4">
            <span className="text-nyme-blue-light text-sm">✦ Processus</span>
          </div>
          <h2 className="font-heading text-4xl sm:text-5xl font-extrabold text-white mb-4">
            Comment ça marche ?
          </h2>
          <p className="text-white/50 font-body text-lg max-w-xl mx-auto">
            En 4 étapes simples, envoyez votre colis où vous voulez à Ouagadougou.
          </p>
        </div>

        <div className="relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-16 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-nyme-orange/30 to-transparent" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <div key={step.step} className="relative text-center group">
                {/* Step number */}
                <div className="relative inline-flex mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-nyme-orange to-nyme-red flex items-center justify-center text-2xl shadow-lg shadow-nyme-orange/20 group-hover:scale-110 transition-transform duration-300">
                    {step.emoji}
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-nyme-dark border-2 border-nyme-orange flex items-center justify-center">
                    <span className="text-nyme-orange text-xs font-heading font-bold">{i + 1}</span>
                  </div>
                </div>

                <h3 className="font-heading text-lg font-bold text-white mb-3">{step.title}</h3>
                <p className="text-white/50 font-body text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
