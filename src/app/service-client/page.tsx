import type { Metadata } from 'next'
import ServiceClientContent from './ServiceClientContent'

export const metadata: Metadata = {
  title: 'Service Client — NYME',
  description: 'Centre d\'aide NYME. FAQ, support, signalement de problèmes. Notre équipe est disponible 7j/7 pour vous aider.',
}

export default function ServiceClientPage() {
  return <ServiceClientContent />
}
