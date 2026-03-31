'use client'

export default function StatsSection() {
  const stats = [
    { value: '30 min', label: 'Délai moyen de livraison', emoji: '⚡' },
    { value: '100%', label: 'Coursiers vérifiés CNI+Permis', emoji: '🛡️' },
    { value: '3 opérateurs', label: 'Mobile Money acceptés', emoji: '💳' },
    { value: '24h/7j', label: 'Service client disponible', emoji: '🎧' },
  ]

  return (
    <section className="relative py-16 bg-nyme-blue-mid overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-nyme-orange/5 via-transparent to-nyme-blue-light/5" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="text-center p-6 nyme-card"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="text-3xl mb-2">{stat.emoji}</div>
              <div className="font-heading text-2xl sm:text-3xl font-extrabold text-nyme-orange mb-1">
                {stat.value}
              </div>
              <div className="text-white/50 text-xs font-body leading-snug">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
