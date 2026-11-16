import React from 'react';
import LandingNav from '../components/landing/LandingNav.jsx';
import HeroSection from '../components/landing/HeroSection.jsx';
import HowItWorksSection from '../components/landing/HowItWorksSection.jsx';
import AgentsCollectiveSection from '../components/landing/AgentsCollectiveSection.jsx';
import FeatureShowcase from '../components/landing/FeatureShowcase.jsx';
import InteractiveReasoningWidget from '../components/landing/InteractiveReasoningWidget.jsx';
import TrustStrip from '../components/landing/TrustStrip.jsx';
import LandingFooter from '../components/landing/LandingFooter.jsx';

export function Landing() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-ink-900 font-sans selection:bg-accent/20 w-full max-w-full overflow-x-clip">
      <LandingNav />
      <main className="w-full max-w-full overflow-x-clip">
        <HeroSection />
        <HowItWorksSection />
        <AgentsCollectiveSection />
        <FeatureShowcase />
        <InteractiveReasoningWidget />
        <TrustStrip />
      </main>
      <LandingFooter />
    </div>
  );
}

export default Landing;
