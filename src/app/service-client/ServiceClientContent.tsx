'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Phone, Mail, MessageSquare, Shield, Truck, CreditCard, UserCheck } from 'lucide-react'
import Link from 'next/link'

const faqs = [
  {
    cat: 'Livraison',
    icon: Truck,
    color: 'text-nyme-orange',
    questions: [
      {
        q: 'Comment créer ma première livraison ?',
        a: 'Téléchargez l\'app NYME, créez un compte, puis appuyez sur "Commander". Saisissez l\'adresse de départ et d\'arrivée. L\'app calcule le prix automatiquement. Vous pouvez accepter ou négocier.'
      },
      {
        q: 'Puis-je envoyer un colis pour quelqu\'un d\'autre ?',
        a: 'Oui ! Lors de la création d\'une livraison, cochez "Pour quelqu\'un d\'autre". Renseignez les coordonnées du destinataire. Il recevra un SMS avec un lien de suivi en temps réel.'
      },
      {
        q: 'Puis-je programmer une livraison à l\'avance ?',
        a: 'Oui, jusqu\'à 15 jours à l\'avance. Choisissez l\'option "Course programmée", sélectionnez la date et l\'heure. L\'app trouvera automatiquement un coursier disponible 1h avant la livraison.'
      },
      {
        q: 'Que faire si mon colis n\'est pas arrivé ?',
        a: 'Vérifiez d\'abord le suivi GPS en temps réel dans l\'app. Si le coursier est injoignable, contactez notre service client immédiatement via le chat intégré ou par téléphone au +226 00 00 00 00.'
      },
      {
        q: 'Quels types de colis puis-je envoyer ?',
        a: 'Documents, vêtements, nourriture, petits équipements, achats e-commerce... Tout ce qui tient dans un sac de coursier. Précisez la nature, le poids estimé et la fragilité lors de la commande.'
      },
    ]
  },
  {
    cat: 'Paiement',
    icon: CreditCard,
    color: 'text-nyme-blue-light',
    questions: [
      {
        q: 'Quels modes de paiement sont acceptés ?',
        a: 'Cash à la livraison, Orange Money, Moov Money et Wave. Le paiement peut se faire avant ou après la livraison selon votre préférence.'
      },
      {
        q: 'Comment fonctionne la négociation de prix ?',
        a: 'L\'app calcule un prix de base selon la distance. Vous pouvez proposer un autre montant. Les coursiers proches voient votre demande et peuvent accepter ou faire une contre-proposition. Vous choisissez la meilleure offre.'
      },
      {
        q: 'J\'ai été débité mais la livraison a échoué. Que faire ?',
        a: 'Contactez immédiatement notre service client avec votre numéro de commande. Nous traitons les demandes de remboursement sous 48h ouvrables.'
      },
      {
        q: 'Comment retirer mes gains en tant que coursier ?',
        a: 'Depuis votre dashboard coursier, allez dans "Wallet" puis "Retirer". Les fonds sont transférés vers votre Mobile Money sous 24h ouvrables.'
      },
    ]
  },
  {
    cat: 'Sécurité',
    icon: Shield,
    color: 'text-green-400',
    questions: [
      {
        q: 'Comment NYME vérifie-t-il les coursiers ?',
        a: 'Chaque coursier doit fournir : CNI ou passeport (recto/verso), permis de conduire, carte grise du véhicule et photo du véhicule. Un admin NYME valide manuellement chaque dossier. Aucune course n\'est possible avant validation complète.'
      },
      {
        q: 'Mes données personnelles sont-elles protégées ?',
        a: 'Oui. Toutes les communications sont chiffrées (HTTPS/TLS). Les photos d\'identité des coursiers sont stockées dans un espace privé et accessibles uniquement aux admins. Vos coordonnées ne sont jamais partagées avec des tiers.'
      },
      {
        q: 'Comment signaler un coursier problématique ?',
        a: 'Depuis l\'app, sur le profil du coursier, appuyez sur "Signaler". Choisissez le motif et décrivez le problème. Notre équipe traite tous les signalements sous 24h et peut suspendre un compte immédiatement si nécessaire.'
      },
    ]
  },
  {
    cat: 'Compte',
    icon: UserCheck,
    color: 'text-purple-400',
    questions: [
      {
        q: 'Comment créer un compte coursier ?',
        a: 'Téléchargez l\'app, choisissez "Je suis coursier" à l\'inscription. Remplissez vos informations personnelles et uploadez vos documents. Votre dossier sera examiné sous 24-48h et vous recevrez une notification de validation.'
      },
      {
        q: 'J\'ai oublié mon mot de passe. Comment le réinitialiser ?',
        a: 'Sur l\'écran de connexion, appuyez sur "Mot de passe oublié". Saisissez votre email ou numéro de téléphone. Vous recevrez un code OTP par SMS pour créer un nouveau mot de passe.'
      },
      {
        q: 'Puis-je avoir deux comptes (client et coursier) ?',
        a: 'Actuellement, chaque numéro de téléphone est lié à un seul compte. Si vous souhaitez basculer de client à coursier, contactez le service client pour une migration de compte.'
      },
    ]
  },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`border rounded-xl transition-all duration-300 ${open ? 'border-nyme-orange/30 bg-nyme-orange/5' : 'border-white/10 hover:border-white/20'}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 p-5 text-left"
      >
        <span className="text-white text-sm font-medium font-body">{q}</span>
        {open ? <ChevronUp size={16} className="text-nyme-orange shrink-0" /> : <ChevronDown size={16} className="text-white/40 shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-5">
          <p className="text-white/60 text-sm font-body leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  )
}

export default function ServiceClientContent() {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <div className="min-h-screen bg-nyme-dark pt-28 pb-20">
      {/* Hero */}
      <div className="relative overflow-hidden mb-16">
        <div className="absolute top-0 right-1/3 w-96 h-96 rounded-full bg-nyme-blue/20 blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-nyme-blue-light/20 mb-6">
            <MessageSquare size={14} className="text-nyme-blue-light" />
            <span className="text-nyme-blue-light text-sm">Centre d'aide</span>
          </div>
          <h1 className="font-heading text-5xl sm:text-6xl font-extrabold text-white mb-4">
            Comment pouvons-nous<br />
            <span className="text-gradient">vous aider ?</span>
          </h1>
          <p className="text-white/50 font-body text-lg max-w-xl mx-auto">
            Trouvez des réponses à vos questions ou contactez notre équipe directement.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Contact rapide */}
        <div className="grid sm:grid-cols-3 gap-4 mb-16">
          {[
            { icon: Phone, label: 'Appeler', sub: '+226 00 00 00 00', href: 'tel:+22600000000', color: 'border-nyme-orange/30 hover:border-nyme-orange/60', iconColor: 'text-nyme-orange' },
            { icon: Mail, label: 'Email', sub: 'contact@nyme.app', href: 'mailto:contact@nyme.app', color: 'border-nyme-blue-light/30 hover:border-nyme-blue-light/60', iconColor: 'text-nyme-blue-light' },
            { icon: MessageSquare, label: 'Chat in-app', sub: 'Dans l\'application NYME', href: '#', color: 'border-green-500/30 hover:border-green-500/60', iconColor: 'text-green-400' },
          ].map(({ icon: Icon, label, sub, href, color, iconColor }) => (
            <a
              key={label}
              href={href}
              className={`flex items-center gap-4 p-5 rounded-2xl glass border ${color} transition-all duration-300 hover:-translate-y-1`}
            >
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                <Icon size={20} className={iconColor} />
              </div>
              <div>
                <div className="text-white font-semibold">{label}</div>
                <div className="text-white/40 text-sm">{sub}</div>
              </div>
            </a>
          ))}
        </div>

        {/* FAQ */}
        <div id="faq">
          <h2 className="font-heading text-3xl font-extrabold text-white mb-8 text-center">Questions fréquentes</h2>

          {/* Category tabs */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {faqs.map((cat, i) => {
              const Icon = cat.icon
              return (
                <button
                  key={cat.cat}
                  onClick={() => setActiveTab(i)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    activeTab === i
                      ? 'bg-nyme-orange text-white shadow-lg shadow-nyme-orange/30'
                      : 'glass border border-white/10 text-white/60 hover:text-white hover:border-white/20'
                  }`}
                >
                  <Icon size={14} />
                  {cat.cat}
                </button>
              )
            })}
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {faqs[activeTab].questions.map((faq) => (
              <FAQItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>

        {/* Pas trouvé */}
        <div className="mt-16 text-center">
          <div className="inline-block glass rounded-3xl px-10 py-8 border border-nyme-orange/20">
            <div className="text-4xl mb-3">🤔</div>
            <h3 className="font-heading text-xl font-bold text-white mb-2">Pas trouvé ce que vous cherchez ?</h3>
            <p className="text-white/50 text-sm font-body mb-4">Notre équipe est disponible pour vous répondre directement.</p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-nyme-orange to-nyme-red text-white font-semibold text-sm hover:shadow-lg hover:shadow-nyme-orange/30 transition-all duration-300"
            >
              Contacter l'équipe →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
