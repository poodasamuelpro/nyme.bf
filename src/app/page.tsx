import type { Metadata } from 'next'
import HeroSection from '@/components/home/HeroSection'
import StatsSection from '@/components/home/StatsSection'
import FeaturesSection from '@/components/home/FeaturesSection'
import HowItWorksSection from '@/components/home/HowItWorksSection'
import ForCouriersSection from '@/components/home/ForCouriersSection'
import PaymentSection from '@/components/home/PaymentSection'
import DownloadSection from '@/components/home/DownloadSection'

export const metadata: Metadata = {
  title: 'NYME — Livraison Rapide & Intelligente en Afrique de l\'Ouest',
}

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <ForCouriersSection />
      <PaymentSection />
      <DownloadSection />
    </>
  )
}
