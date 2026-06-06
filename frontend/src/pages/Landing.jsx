import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import HeroSection from '@/components/landing/HeroSection'
import HowItWorksSection from '@/components/landing/HowItWorksSection'
import FeaturesSection from '@/components/landing/FeaturesSection'
import DashboardSection from '@/components/landing/DashboardSection'
import FeynmanSection from '@/components/landing/FeynmanSection'
import LiveDemoSection from '@/components/landing/LiveDemoSection'
import EverythingIncludedSection from '@/components/landing/EverythingIncludedSection'
import CTASection from '@/components/landing/CTASection'

// StatsSection removed — numbers were fabricated (no real users yet)
// TestimonialsSection removed — fake testimonials damage credibility on launch

const Landing = () => {
  return (
    <div className="min-h-screen bg-[#080D1A]">
      <Navbar />

      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <DashboardSection />
      <FeynmanSection />
      <LiveDemoSection />
      <EverythingIncludedSection />
      <CTASection />

      <Footer />
    </div>
  )
}

export default Landing