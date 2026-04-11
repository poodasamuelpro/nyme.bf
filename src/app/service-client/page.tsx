import type { Metadata } from 'next'
import ServiceClientContent from './ServiceClientContent'

export const metadata: Metadata = {
  title: 'Centre d\'aide & Support — NYME',
  description: 'Centre d\'aide NYME. Réponses à vos questions sur les livraisons, paiements, sécurité et votre compte. FAQ complète et contacts du support.',
}

export default function ServiceClientPage() {
  return <ServiceClientContent />
}