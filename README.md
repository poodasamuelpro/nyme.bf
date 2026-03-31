# NYME — Site Web Officiel (Version Vercel / Next.js)

> Plateforme de livraison rapide & intelligente pour l'Afrique de l'Ouest

## Stack technique

- **Framework** : Next.js 14 (App Router)
- **Langage** : TypeScript
- **Styling** : Tailwind CSS
- **Animations** : CSS natif + Framer Motion ready
- **Déploiement** : Vercel

## Structure du projet

```
src/
├── app/
│   ├── layout.tsx              # Layout racine avec SEO
│   ├── page.tsx                # Page d'accueil
│   ├── globals.css             # Styles globaux + thème NYME
│   ├── contact/                # Page contact
│   ├── service-client/         # Centre d'aide & FAQ
│   ├── politique-confidentialite/  # RGPD / vie privée
│   └── politique-application/  # CGU / mentions légales
├── components/
│   ├── Header.tsx              # Navigation principale
│   ├── Footer.tsx              # Pied de page complet
│   └── home/                   # Sections homepage
│       ├── HeroSection.tsx
│       ├── StatsSection.tsx
│       ├── FeaturesSection.tsx
│       ├── HowItWorksSection.tsx
│       ├── ForCouriersSection.tsx
│       ├── PaymentSection.tsx
│       └── DownloadSection.tsx
```

## Lancement en développement

```bash
npm install
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000)

## Déploiement Vercel

1. Connectez votre dépôt GitHub à Vercel
2. Aucune configuration supplémentaire nécessaire
3. Chaque push sur `main` déclenche un déploiement automatique

### Variables d'environnement

Aucune variable d'environnement requise pour le site vitrine.

## Configuration domaine

- Domaine principal : `nyme.app`
- Sous-domaine staging : configurez dans Vercel > Domains

## Couleurs de la marque NYME

| Couleur | Hex | Usage |
|---------|-----|-------|
| Bleu foncé | `#0F3460` | Fond principal |
| Bleu moyen | `#16213E` | Sections secondaires |
| Bleu clair | `#1A6EBF` | Accents, liens |
| Orange | `#F97316` | CTA principal, accent |
| Rouge | `#DC2626` | Urgence, gradient |

## Pages

| Route | Description |
|-------|-------------|
| `/` | Page d'accueil avec toutes les sections |
| `/contact` | Formulaire de contact + informations |
| `/service-client` | FAQ interactive + liens support |
| `/politique-confidentialite` | Politique de confidentialité RGPD |
| `/politique-application` | CGU & Mentions légales |

---

© 2025 NYME · Ouagadougou, Burkina Faso
