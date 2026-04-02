'use client'
import { useState } from 'react'
import { Mail, Phone, MapPin, Send, MessageSquare, Clock, ChevronRight } from 'lucide-react'

const WHATSAPP = '22600000000'

export default function ContactClient() {
  const [form, setForm] = useState({ nom: '', email: '', sujet: '', message: '' })
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur inconnue')
      setSent(true)
    } catch (err: any) { setError(err.message || 'Erreur. Réessayez.')
    } finally { setLoading(false) }
  }

  const cards = [
    { icon: Phone, title: 'Téléphone', content: '+226 00 00 00 00', sub: 'Lun–Sam, 7h–21h', href: 'tel:+22600000000', accent: 'border-l-nyme-orange' },
    { icon: Mail, title: 'Email', content: 'nyme.contact@gmail.com', sub: 'Réponse sous 24h', href: 'mailto:nyme.contact@gmail.com', accent: 'border-l-nyme-blue' },
    { icon: MapPin, title: 'Localisation', content: 'Ouagadougou, BF', sub: 'Afrique de l\'Ouest', href: '#', accent: 'border-l-nyme-green' },
    { icon: Clock, title: 'Horaires', content: 'Lun–Sam : 7h–21h', sub: 'Dimanche : 8h–18h', href: '/service-client', accent: 'border-l-nyme-violet' },
  ]

  return (
    <div className="min-h-screen bg-nyme-bg pt-20 sm:pt-28 pb-16">
      {/* Hero */}
      <div className="section-hero relative overflow-hidden py-12 sm:py-16 mb-10 sm:mb-14">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/80 text-xs sm:text-sm font-medium mb-5">
            <MessageSquare size={13} /> Contactez-nous
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-3">On est là pour vous</h1>
          <p className="text-white/70 text-base sm:text-lg max-w-xl mx-auto">
            Une question, un partenariat, un problème ? L'équipe NYME répond sous 24h.
          </p>
          <a href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Bonjour NYME, j\'ai une question...')}`}
            target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-6 px-5 py-3 rounded-xl bg-nyme-green/20 border border-nyme-green/40 text-nyme-green font-semibold text-sm hover:bg-nyme-green hover:text-white transition-all duration-300">
            💬 Écrire sur WhatsApp
          </a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Cards mobiles (grille 2×2) */}
        <div className="grid grid-cols-2 gap-3 mb-6 lg:hidden">
          {cards.map(({ icon: Icon, title, content, sub, href, accent }) => (
            <a key={title} href={href} className={`card border-l-4 ${accent} p-3 sm:p-4 flex items-start gap-2.5`}>
              <Icon size={15} className="text-nyme-blue shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-nyme-text-muted text-[9px] sm:text-xs uppercase tracking-wider mb-0.5">{title}</div>
                <div className="text-nyme-text font-semibold text-[11px] sm:text-xs truncate">{content}</div>
                <div className="text-nyme-text-muted text-[9px] sm:text-xs">{sub}</div>
              </div>
            </a>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-7 lg:gap-10">
          {/* Sidebar desktop */}
          <div className="hidden lg:block lg:col-span-1 space-y-3">
            {cards.map(({ icon: Icon, title, content, sub, href, accent }) => (
              <a key={title} href={href} className={`card border-l-4 ${accent} p-5 flex items-start gap-4 hover:scale-[1.02]`}>
                <div className="w-9 h-9 rounded-lg bg-nyme-bg-input flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-nyme-blue" />
                </div>
                <div>
                  <div className="text-nyme-text-muted text-xs uppercase tracking-wider mb-0.5">{title}</div>
                  <div className="text-nyme-text font-semibold text-sm">{content}</div>
                  <div className="text-nyme-text-muted text-xs">{sub}</div>
                </div>
                <ChevronRight size={14} className="text-nyme-border ml-auto mt-1 shrink-0" />
              </a>
            ))}
            <div id="partenaires" className="card p-5 border-t-4 border-t-nyme-orange">
              <h3 className="font-heading text-nyme-text font-bold mb-2">⭐ Partenariats</h3>
              <p className="text-nyme-text-muted text-xs leading-relaxed mb-3">
                Boutique ou entreprise à Ouagadougou ? Intégrez NYME dans votre logistique avec un abonnement mensuel.
              </p>
              <a href="/partenaires" className="text-nyme-orange text-xs font-semibold hover:underline">Voir l'espace partenaires →</a>
            </div>
          </div>

          {/* Formulaire */}
          <div className="lg:col-span-2">
            <div className="card p-5 sm:p-8">
              {sent ? (
                <div className="text-center py-10 sm:py-14">
                  <div className="text-5xl mb-4">✅</div>
                  <h2 className="font-heading text-xl sm:text-2xl font-bold text-nyme-text mb-2">Message envoyé !</h2>
                  <p className="text-nyme-text-muted text-sm">Merci. L'équipe NYME vous répondra sous 24h.</p>
                  <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6">
                    <button onClick={() => { setSent(false); setForm({ nom:'', email:'', sujet:'', message:'' }) }}
                      className="btn-secondary text-sm py-2.5 px-5">Envoyer un autre message</button>
                    <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl bg-nyme-green/10 border border-nyme-green/20 text-nyme-green text-sm font-semibold hover:bg-nyme-green hover:text-white transition-all">
                      💬 WhatsApp
                    </a>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="font-heading text-xl sm:text-2xl font-black text-nyme-text mb-5 sm:mb-6">Envoyer un message</h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-nyme-text-muted text-xs uppercase tracking-wider font-medium mb-1.5">Nom complet *</label>
                        <input type="text" required value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} placeholder="Votre nom" className="input-nyme" />
                      </div>
                      <div>
                        <label className="block text-nyme-text-muted text-xs uppercase tracking-wider font-medium mb-1.5">Email *</label>
                        <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="votre@email.com" className="input-nyme" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-nyme-text-muted text-xs uppercase tracking-wider font-medium mb-1.5">Sujet *</label>
                      <select required value={form.sujet} onChange={e => setForm({...form, sujet: e.target.value})} className="input-nyme">
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
                      <label className="block text-nyme-text-muted text-xs uppercase tracking-wider font-medium mb-1.5">Message *</label>
                      <textarea required rows={5} value={form.message} onChange={e => setForm({...form, message: e.target.value})}
                        placeholder="Décrivez votre demande en détail..." className="input-nyme resize-none" />
                    </div>
                    {error && <div className="p-3 rounded-xl bg-nyme-red/10 border border-nyme-red/20 text-nyme-red text-xs">⚠️ {error}</div>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button type="submit" disabled={loading}
                        className="btn-primary flex items-center justify-center gap-2 py-3.5 disabled:opacity-70">
                        {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Envoi...</> : <><Send size={15} />Envoyer</>}
                      </button>
                      <a href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Bonjour NYME, je vous contacte via le site web.\n\nNom: ${form.nom}\nSujet: ${form.sujet}\n\n${form.message}`)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-nyme-green/10 border border-nyme-green/20 text-nyme-green font-semibold text-sm hover:bg-nyme-green hover:text-white transition-all">
                        💬 WhatsApp
                      </a>
                    </div>
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