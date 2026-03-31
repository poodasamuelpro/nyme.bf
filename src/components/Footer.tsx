import Link from 'next/link'
import { Zap, MapPin, Phone, Mail, Facebook, Instagram, Twitter } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="relative bg-nyme-blue-mid border-t border-nyme-orange/10 overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-nyme-orange/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-nyme-blue-light/10 blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">

          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-nyme-orange to-nyme-red flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-heading text-2xl font-extrabold text-white tracking-wider">NYME</span>
            </Link>
            <p className="text-white/50 text-sm font-body leading-relaxed mb-6">
              La plateforme de livraison intelligente conçue pour l'Afrique de l'Ouest. Rapide, sécurisée, transparente.
            </p>

            {/* Contact rapide */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white/50 text-sm">
                <MapPin size={14} className="text-nyme-orange shrink-0" />
                <span>Ouagadougou, Burkina Faso</span>
              </div>
              <a href="tel:+22600000000" className="flex items-center gap-2 text-white/50 text-sm hover:text-nyme-orange transition-colors">
                <Phone size={14} className="text-nyme-orange shrink-0" />
                <span>+226 00 00 00 00</span>
              </a>
              <a href="mailto:contact@nyme.app" className="flex items-center gap-2 text-white/50 text-sm hover:text-nyme-orange transition-colors">
                <Mail size={14} className="text-nyme-orange shrink-0" />
                <span>contact@nyme.app</span>
              </a>
            </div>
          </div>

          {/* App */}
          <div>
            <h4 className="font-heading text-white font-semibold mb-4 text-sm uppercase tracking-widest">Application</h4>
            <ul className="space-y-3">
              {[
                { label: 'Pour les clients', href: '/#clients' },
                { label: 'Pour les coursiers', href: '/#coursiers' },
                { label: 'Comment ça marche', href: '/#comment-ca-marche' },
                { label: 'Télécharger', href: '/#telecharger' },
                { label: 'Tarifs', href: '/#tarifs' },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-white/50 text-sm hover:text-nyme-orange transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-heading text-white font-semibold mb-4 text-sm uppercase tracking-widest">Support</h4>
            <ul className="space-y-3">
              {[
                { label: 'Service client', href: '/service-client' },
                { label: 'FAQ', href: '/service-client#faq' },
                { label: 'Signaler un problème', href: '/contact' },
                { label: 'Devenir coursier', href: '/#devenir-coursier' },
                { label: 'Partenaires', href: '/contact#partenaires' },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-white/50 text-sm hover:text-nyme-orange transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h4 className="font-heading text-white font-semibold mb-4 text-sm uppercase tracking-widest">Légal</h4>
            <ul className="space-y-3">
              {[
                { label: 'Politique de confidentialité', href: '/politique-confidentialite' },
                { label: 'Conditions d\'utilisation', href: '/politique-application' },
                { label: 'Politique des cookies', href: '/politique-confidentialite#cookies' },
                { label: 'Mentions légales', href: '/politique-application#mentions' },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-white/50 text-sm hover:text-nyme-orange transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Réseaux sociaux */}
            <div className="mt-6">
              <h4 className="font-heading text-white font-semibold mb-3 text-sm uppercase tracking-widest">Suivez-nous</h4>
              <div className="flex gap-3">
                {[
                  { Icon: Facebook, href: 'https://facebook.com/nyme.app' },
                  { Icon: Instagram, href: 'https://instagram.com/nyme.app' },
                  { Icon: Twitter, href: 'https://twitter.com/nyme_app' },
                ].map(({ Icon, href }) => (
                  <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:text-nyme-orange hover:border-nyme-orange/40 transition-all duration-200"
                  >
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/30 text-xs font-body">
            © {new Date().getFullYear()} NYME. Tous droits réservés. Ouagadougou, Burkina Faso.
          </p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white/30 text-xs">Service opérationnel</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
