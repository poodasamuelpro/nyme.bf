'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, Zap } from 'lucide-react'

const navLinks = [
  { href: '/', label: 'Accueil' },
  { href: '/#fonctionnalites', label: 'Fonctionnalités' },
  { href: '/#comment-ca-marche', label: 'Comment ça marche' },
  { href: '/service-client', label: 'Support' },
  { href: '/contact', label: 'Contact' },
]

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? 'glass-dark border-b border-nyme-orange/20 py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-nyme-orange to-nyme-red flex items-center justify-center shadow-lg group-hover:shadow-nyme-orange/40 transition-shadow duration-300">
                <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-nyme-blue-light border-2 border-nyme-dark animate-pulse" />
            </div>
            <div>
              <span className="font-heading text-2xl font-800 text-white tracking-wider">NYME</span>
              <div className="text-[10px] text-nyme-orange/70 font-body tracking-widest uppercase -mt-1">
                Livraison Intelligente
              </div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-body text-white/70 hover:text-nyme-orange transition-colors duration-200 relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-nyme-orange group-hover:w-full transition-all duration-300" />
              </Link>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="#telecharger"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-nyme-orange to-nyme-red text-white text-sm font-body font-semibold hover:shadow-lg hover:shadow-nyme-orange/30 transition-all duration-300 hover:-translate-y-0.5"
            >
              Télécharger l'app
            </a>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="md:hidden p-2 text-white/80 hover:text-nyme-orange transition-colors"
          >
            {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isMobileOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-white/10">
            <nav className="flex flex-col gap-4 pt-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileOpen(false)}
                  className="text-white/70 hover:text-nyme-orange transition-colors py-1 font-body"
                >
                  {link.label}
                </Link>
              ))}
              <a
                href="#telecharger"
                onClick={() => setIsMobileOpen(false)}
                className="mt-2 px-5 py-3 rounded-xl bg-gradient-to-r from-nyme-orange to-nyme-red text-white text-sm font-semibold text-center"
              >
                Télécharger l'app
              </a>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
