import Link from 'next/link'
import { Zap, MapPin, Phone, Mail, Facebook, Instagram, Twitter } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="relative bg-nyme-primary-dark border-t border-white/10 overflow-hidden">
      {/* Décors flous */}
      <div className="absolute top-0 left-1/4 w-64 sm:w-96 h-64 sm:h-96 rounded-full bg-nyme-orange/6 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-48 sm:w-64 h-48 sm:h-64 rounded-full bg-nyme-blue-light/8 blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-8 sm:gap-10">

          {/* Brand */}
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-nyme-orange to-[#d4691a] flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-heading text-xl sm:text-2xl font-extrabold text-white tracking-wider">NYME</span>
            </Link>
            <p className="text-white/65 text-sm font-body leading-relaxed mb-5 max-w-xs">
              La plateforme de livraison intelligente conçue pour l'Afrique de l'Ouest. Rapide, sécurisée, transparente.
            </p>
            <div className="space-y-2.5 text-white/65 text-sm">
              <div className="flex items-center gap-2.5 font-body">
                <MapPin size={14} className="text-nyme-orange shrink-0" />
                <span>Ouagadougou, Burkina Faso</span>
              </div>
              <a href="tel:+22600000000" className="flex items-center gap-2.5 hover:text-white transition-colors font-body">
                <Phone size={14} className="text-nyme-orange shrink-0" />
                <span>+226 00 00 00 00</span>
              </a>
              <a href="mailto:nyme.contact@gmail.com" className="flex items-center gap-2.5 hover:text-nyme-orange transition-colors font-body">
                <Mail size={14} className="text-nyme-orange shrink-0" />
                <span>nyme.contact@gmail.com</span>
              </a>
            </div>
          </div>

          {/* Application */}
          <div>
            <h4 className="font-heading text-white font-bold mb-4 text-xs uppercase tracking-widest">Application</h4>
            <ul className="space-y-2.5">
              {[
                ['/#clients',           'Pour les clients'],
                ['/#coursiers',         'Pour les coursiers'],
                ['/#comment-ca-marche', 'Comment ça marche'],
                ['/#telecharger',       'Télécharger'],
                ['/#tarifs',            'Tarifs'],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-white/60 text-sm hover:text-white transition-colors font-body hover:translate-x-1 inline-block">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-heading text-white font-bold mb-4 text-xs uppercase tracking-widest">Support</h4>
            <ul className="space-y-2.5">
              {[
                ['/service-client',     'Service client'],
                ['/service-client#faq', 'FAQ'],
                ['/contact',            'Signaler un problème'],
                ['/#devenir-coursier',  'Devenir coursier'],
                ['/partenaires',        'Espace partenaires'],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={`text-sm transition-colors font-body hover:translate-x-1 inline-block ${
                      label === 'Espace partenaires'
                        ? 'text-nyme-orange/90 hover:text-nyme-orange font-semibold'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Légal */}
          <div>
            <h4 className="font-heading text-white font-bold mb-4 text-xs uppercase tracking-widest">Légal</h4>
            <ul className="space-y-2.5 mb-6">
              {[
                ['/politique-confidentialite',         'Confidentialité'],
                ['/politique-application',             "Conditions d'utilisation"],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-white/60 text-sm hover:text-white transition-colors font-body">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex gap-3">
              {[Facebook, Instagram, Twitter].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-lg bg-white/8 border border-white/15 flex items-center justify-center text-white/60 hover:text-white hover:border-nyme-orange/50 transition-all">
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/40 text-xs font-body text-center">
            © {new Date().getFullYear()} NYME. Tous droits réservés.
          </p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white/40 text-xs font-body">Application en développement</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
