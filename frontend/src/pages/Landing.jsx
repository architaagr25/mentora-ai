import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import HeroSection from '@/components/landing/HeroSection'
import StatsSection from '@/components/landing/StatsSection'
import HowItWorksSection from '@/components/landing/HowItWorksSection'
import FeaturesSection from '@/components/landing/FeaturesSection'
import DashboardSection from '@/components/landing/DashboardSection'
import FeynmanSection from '@/components/landing/FeynmanSection'
import LiveDemoSection from '@/components/landing/LiveDemoSection'
import TestimonialsSection from '@/components/landing/TestimonialsSection'
import EverythingIncludedSection from '@/components/landing/EverythingIncludedSection'
import CTASection from '@/components/landing/CTASection'

// This is the complete landing page
// Each section is its own component — clean, organized, easy to edit
// The order here is exactly the order they appear on the page

const Landing = () => {
  return (
    <div className="min-h-screen bg-[#080D1A]">
      {/* Sticky navbar at top */}
      <Navbar />

      {/* Page sections in order */}
      <HeroSection />
      <StatsSection />
      <HowItWorksSection />
      <FeaturesSection />
      <DashboardSection />
      <FeynmanSection />
      <LiveDemoSection />
      <TestimonialsSection />
      <EverythingIncludedSection />
      <CTASection />

      {/* Footer */}
      <Footer />
    </div>
  )
}

export default Landing