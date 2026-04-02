import type { Metadata } from 'next'
import ContactClient from './ContactClient'

export const metadata: Metadata = {
  title: 'Contact — NYME',
  description: 'Contactez l\'équipe NYME. Nous sommes disponibles pour répondre à toutes vos questions sur l\'application de livraison.',
}

export default function ContactPage() {
  return <ContactClient />
}