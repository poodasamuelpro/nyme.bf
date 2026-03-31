'use client'

import { useState } from 'react'
import { Mail, Phone, MapPin, Send, MessageSquare, Clock, ChevronRight } from 'lucide-react'

export default function ContactClient() {
  const [form, setForm] = useState({ nom: '', email: '', sujet: '', message: '' })
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur inconnue')
      setSent(true)
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'envoi. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-nyme-dark pt-28 pb-20">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-nyme-orange/10 blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-1/4 w-64 h-64 rounded-full bg-nyme-blue/30 blur-3xl pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-nyme-orange/20 mb-6">
            <MessageSquare size={14} className="text-nyme-orange" />
            <span className="text-nyme-orange text-sm">Contactez-nous</span>
          </div>
          <h1 className="font-heading text-5xl sm:text-6xl font-extrabold text-white mb-4">
            On est là pour vous
          </h1>
          <p className="text-white/50 font-body text-lg max-w-xl mx-auto">
            Une question, un partenariat, un problème ? L'équipe NYME répond sous 24h.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-3 gap-10">

          {/* Info cards */}
          <div className="lg:col-span-1 space-y-4">
            {[
              {
                icon: Phone,
                title: 'Téléphone',
                content: '+226 00 00 00 00',
                sub: 'Lun–Sam, 7h–21h',
                href: 'tel:+22600000000',
                color: 'text-nyme-orange',
                bg: 'bg-nyme-orange/10 border-nyme-orange/20',
              },
              {
                icon: Mail,
                title: 'Email',
                content: 'contact@nyme.app',
                sub: 'Réponse sous 24h',
                href: 'mailto:contact@nyme.app',
                color: 'text-nyme-blue-light',
                bg: 'bg-nyme-blue-light/10 border-nyme-blue-light/20',
              },
              {
                icon: MapPin,
                title: 'Localisation',
                content: 'Ouagadougou, Burkina Faso',
                sub: 'Afrique de l\'Ouest',
                href: '#',
                color: 'text-green-400',
                bg: 'bg-green-500/10 border-green-500/20',
              },
              {
                icon: Clock,
                title: 'Horaires support',
                content: 'Lun–Sam : 7h–21h',
                sub: 'Dimanche : 8h–18h',
                href: '/service-client',
                color: 'text-purple-400',
                bg: 'bg-purple-500/10 border-purple-500/20',
              },
            ].map(({ icon: Icon, title, content, sub, href, color, bg }) => (
              <a
                key={title}
                href={href}
                className={`flex items-start gap-4 p-5 rounded-2xl border ${bg} hover:scale-105 transition-all duration-300 block`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                  <Icon size={18} className={color} />
                </div>
                <div>
                  <div className="text-white/50 text-xs font-body uppercase tracking-wider mb-1">{title}</div>
                  <div className="text-white font-semibold text-sm">{content}</div>
                  <div className="text-white/40 text-xs mt-0.5">{sub}</div>
                </div>
                <ChevronRight size={14} className="text-white/20 ml-auto mt-1 shrink-0" />
              </a>
            ))}

            {/* Partenaires */}
            <div id="partenaires" className="p-5 rounded-2xl glass border border-nyme-orange/20">
              <h3 className="font-heading text-white font-bold mb-2">🤝 Partenariats</h3>
              <p className="text-white/50 text-xs font-body leading-relaxed mb-3">
                Vous êtes une boutique, un e-commerce ou une entreprise à Ouagadougou ? Intégrez NYME dans votre chaîne logistique.
              </p>
              <a href="mailto:partenaires@nyme.app" className="text-nyme-orange text-xs font-semibold hover:underline">
                partenaires@nyme.app →
              </a>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <div className="glass rounded-3xl p-8 border border-nyme-blue-light/20">
              {sent ? (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">✅</div>
                  <h2 className="font-heading text-2xl font-bold text-white mb-3">Message envoyé !</h2>
                  <p className="text-white/50 font-body">
                    Merci de nous avoir contactés. L'équipe NYME vous répondra sous 24h.
                  </p>
                  <button
                    onClick={() => { setSent(false); setForm({ nom: '', email: '', sujet: '', message: '' }) }}
                    className="mt-6 px-6 py-3 rounded-xl bg-nyme-orange/10 border border-nyme-orange/30 text-nyme-orange text-sm hover:bg-nyme-orange/20 transition-colors"
                  >
                    Envoyer un autre message
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="font-heading text-2xl font-bold text-white mb-6">Envoyer un message</h2>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-white/50 text-xs font-body uppercase tracking-wider mb-2">Nom complet *</label>
                        <input
                          type="text"
                          required
                          value={form.nom}
                          onChange={e => setForm({ ...form, nom: e.target.value })}
                          placeholder="Votre nom"
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-nyme-orange/50 transition-colors font-body text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-white/50 text-xs font-body uppercase tracking-wider mb-2">Email *</label>
                        <input
                          type="email"
                          required
                          value={form.email}
                          onChange={e => setForm({ ...form, email: e.target.value })}
                          placeholder="votre@email.com"
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-nyme-orange/50 transition-colors font-body text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-white/50 text-xs font-body uppercase tracking-wider mb-2">Sujet *</label>
                      <select
                        required
                        value={form.sujet}
                        onChange={e => setForm({ ...form, sujet: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-nyme-dark border border-white/10 text-white focus:outline-none focus:border-nyme-orange/50 transition-colors font-body text-sm"
                      >
                        <option value="">Choisir un sujet</option>
                        <option value="support">Support technique</option>
                        <option value="livraison">Problème de livraison</option>
                        <option value="coursier">Devenir coursier</option>
                        <option value="partenariat">Partenariat entreprise</option>
                        <option value="paiement">Problème de paiement</option>
                        <option value="autre">Autre</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-white/50 text-xs font-body uppercase tracking-wider mb-2">Message *</label>
                      <textarea
                        required
                        rows={6}
                        value={form.message}
                        onChange={e => setForm({ ...form, message: e.target.value })}
                        placeholder="Décrivez votre demande en détail..."
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-nyme-orange/50 transition-colors font-body text-sm resize-none"
                      />
                    </div>

                    {error && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-body">
                        ⚠️ {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-to-r from-nyme-orange to-nyme-red text-white font-semibold hover:shadow-lg hover:shadow-nyme-orange/30 transition-all duration-300 disabled:opacity-70"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Envoi en cours...
                        </>
                      ) : (
                        <>
                          <Send size={16} />
                          Envoyer le message
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
