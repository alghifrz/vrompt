import { LandingBenefits } from "./benefits";
import { LandingComparison } from "./comparison";
import { LandingFaq } from "./faq";
import { LandingFeatures } from "./features";
import { LandingCta, LandingFooter } from "./footer";
import { LandingHeader } from "./header";
import { LandingHero } from "./hero";
import { LandingHowItWorks } from "./how-it-works";
import { LandingImpact } from "./impact";
import { LandingPricing } from "./pricing";
import { LandingSpotlights } from "./spotlights";
import { landingShellClass } from "./styles";
import { LandingTestimonials } from "./testimonials";

export function LandingPage() {
  return (
    <div className={landingShellClass}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-[#d4f26a] focus:px-4 focus:py-2 focus:text-sm focus:text-[#14160c]"
      >
        Skip to content
      </a>
      <LandingHeader />
      <main id="main">
        <LandingHero />
        <LandingSpotlights />
        <LandingFeatures />
        <LandingBenefits />
        <LandingComparison />
        <LandingHowItWorks />
        <LandingImpact />
        {/* <LandingTestimonials /> */}
        {/* <LandingPricing /> */}
        <LandingFaq />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  );
}
