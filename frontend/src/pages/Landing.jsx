import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import HeroSection from '@/components/landing/HeroSection'
import HowItWorksSection from '@/components/landing/HowItWorksSection'
import FeaturesSection from '@/components/landing/FeaturesSection'
import FeynmanSection from '@/components/landing/FeynmanSection'
import LiveDemoSection from '@/components/landing/LiveDemoSection'
import EverythingIncludedSection from '@/components/landing/EverythingIncludedSection'
import CTASection from '@/components/landing/CTASection'

// StatsSection removed — numbers were fabricated (no real users yet)
// TestimonialsSection removed — fake testimonials damage credibility on launch

// The only part of the landing page that needs a charting library, and it is
// the fourth section down — well below the fold. Loading it separately keeps
// recharts out of what a first-time visitor downloads before seeing anything.
const DashboardSection = lazy(() => import('@/components/landing/DashboardSection'))

// True once the element is within rootMargin of the viewport, and then
// stays true — this decides when to start downloading, not what to render
// on every scroll.
const useNearViewport = (ref) => {
  // Without IntersectionObserver there is nothing to wait for, so the
  // section renders from the start rather than never.
  const [near, setNear] = useState(() => typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    if (near) return
    const el = ref.current
    if (!el) return
    // A screen's worth of warning, so the chunk is usually there before the
    // section is.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setNear(true)
      },
      { rootMargin: '600px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref, near])
  return near
}

// Reserves the height the section occupies once it arrives, so the page
// below it does not jump when it does.
const DashboardSectionPlaceholder = () => (
  <section className="py-24 bg-bg" aria-hidden="true">
    <div className="max-w-6xl mx-auto px-4 sm:px-6">
      {/* Measured against the real section: 1806px at phone width, 1180px
          at desktop, less the py-24 this placeholder already has. */}
      <div className="h-[1614px] md:h-[988px]" />
    </div>
  </section>
)

const Landing = () => {
  const previewRef = useRef(null)
  const previewNear = useNearViewport(previewRef)

  return (
    <div className="min-h-screen bg-bg">
      <Navbar />

      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <div ref={previewRef}>
        {previewNear ? (
          <Suspense fallback={<DashboardSectionPlaceholder />}>
            <DashboardSection />
          </Suspense>
        ) : (
          <DashboardSectionPlaceholder />
        )}
      </div>
      <FeynmanSection />
      <LiveDemoSection />
      <EverythingIncludedSection />
      <CTASection />

      <Footer />
    </div>
  )
}

export default Landing