import type { Metadata } from 'next'
import ContactClient from './ContactClient'

export const metadata: Metadata = {
  title: 'Contact — NYME',
  description: 'Contactez l\'équipe NYME. Disponibles par email, téléphone ou WhatsApp pour répondre à toutes vos questions sur nos services de livraison.',
}

export default function ContactPage() {
  return <ContactClient />
}