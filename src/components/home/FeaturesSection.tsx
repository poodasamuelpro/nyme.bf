'use client'

const features = [
  {
    emoji: '💬',
    title: 'Négociation de prix',
    desc: 'Proposez votre prix, les coursiers contre-proposent. Vous choisissez l\'offre qui vous convient — comme InDrive mais pour les colis.',
    color: 'from-nyme-orange/20 to-nyme-orange/5',
    border: 'border-nyme-orange/30',
  },
  {
    emoji: '📍',
    title: 'Suivi GPS en temps réel',
    desc: 'Suivez votre coursier sur une carte interactive mise à jour toutes les 3 secondes. Partagez le lien de suivi avec le destinataire.',
    color: 'from-nyme-blue-light/20 to-nyme-blue-light/5',
    border: 'border-nyme-blue-light/30',
  },
  {
    emoji: '🛡️',
    title: 'Coursiers vérifiés',
    desc: 'CNI, permis de conduire, carte grise et photo de véhicule. Aucun coursier ne peut travailler sans validation admin complète.',
    color: 'from-green-500/20 to-green-500/5',
    border: 'border-green-500/30',
  },
  {
    emoji: '📦',
    title: 'Livraison pour un tiers',
    desc: 'Envoyez un colis à quelqu\'un d\'autre. Le destinataire reçoit un SMS avec lien de suivi et est notifié à chaque étape.',
    color: 'from-purple-500/20 to-purple-500/5',
    border: 'border-purple-500/30',
  },
  {
    emoji: '⏰',
    title: 'Course programmée',
    desc: 'Planifiez vos livraisons jusqu\'à 15 jours à l\'avance. L\'app trouve automatiquement un coursier disponible 1h avant.',
    color: 'from-yellow-500/20 to-yellow-500/5',
    border: 'border-yellow-500/30',
  },
  {
    emoji: '💬',
    title: 'Chat & appels intégrés',
    desc: 'Communicez directement avec votre coursier via le chat ou par téléphone, sans jamais quitter l\'application.',
    color: 'from-nyme-red/20 to-nyme-red/5',
    border: 'border-nyme-red/30',
  },
]

export default function FeaturesSection() {
  return (
    <section id="fonctionnalites" className="py-24 bg-nyme-dark relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-nyme-orange/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-nyme-blue/20 blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-nyme-orange/20 mb-4">
            <span className="text-nyme-orange text-sm">✦ Fonctionnalités</span>
          </div>
          <h2 className="font-heading text-4xl sm:text-5xl font-extrabold text-white mb-4">
            Tout ce dont vous avez besoin
          </h2>
          <p className="text-white/50 font-body text-lg max-w-2xl mx-auto">
            NYME repense la livraison pour l'Afrique de l'Ouest. Conçu pour Ouagadougou, adapté à vos réalités.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={`p-6 rounded-2xl bg-gradient-to-br ${feature.color} border ${feature.border} hover:scale-105 transition-all duration-300 cursor-default`}
            >
              <div className="text-4xl mb-4">{feature.emoji}</div>
              <h3 className="font-heading text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-white/60 font-body text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
