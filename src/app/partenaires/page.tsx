import type { Metadata } from 'next'
import PartenairesClient from './PartenairesClient'

export const metadata: Metadata = {
  title: 'Espace Partenaires — NYME',
  description: "Formules d'abonnement mensuel NYME pour entreprises et boutiques. Livreur dédié, traçabilité complète, livraison express garantie. À partir de 45 000 FCFA/mois.",
}

export default function PartenairesPage() {
  return <PartenairesClient />
}
