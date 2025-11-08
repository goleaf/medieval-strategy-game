import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service | Medieval Strategy",
  description: "Understand the rules, policies, and commitments that govern your Medieval Strategy account.",
}

const lastUpdated = "March 15, 2024"

const sections = [
  {
    title: "1. Acceptance of Terms",
    body: [
      "By accessing or playing Medieval Strategy (the \"Game\"), you agree to be bound by these Terms of Service and all in-game policies such as the Game Rules and Privacy Policy.",
      "If you do not agree to these Terms, you may not access or use the Game.",
    ],
  },
  {
    title: "2. Eligibility & Accounts",
    body: [
      "You must be at least 13 years of age to create an account. If you are between 13 and 18, you confirm that a parent or legal guardian has reviewed and accepted these Terms.",
      "You are responsible for maintaining the confidentiality of your login credentials and for all activity conducted through your account.",
    ],
  },
  {
    title: "3. Virtual Assets & Purchases",
    body: [
      "Any virtual currency, premium items, or boosts you acquire in the Game are licensed, not sold, and have no monetary value outside the Game.",
      "All purchases are final unless otherwise required by applicable law. We reserve the right to adjust prices and availability at any time.",
    ],
  },
  {
    title: "4. Fair Play & Acceptable Use",
    body: [
      "You agree not to exploit bugs, use unauthorized automation, or engage in harassment, hate speech, or any conduct deemed disruptive to the community.",
      "We may investigate suspicious activity and take enforcement actions ranging from temporary suspensions to permanent bans.",
    ],
  },
  {
    title: "5. Intellectual Property",
    body: [
      "All Game content, including art, copy, mechanics, and code, is protected by intellectual property laws. You may not copy, distribute, or create derivative works without express permission.",
      "Player-contributed content (such as tribe descriptions) remains yours, but you grant us a worldwide, royalty-free license to use it within the Game.",
    ],
  },
  {
    title: "6. Service Availability & Changes",
    body: [
      "The Game is provided on an \"as is\" and \"as available\" basis. Features may change, be removed, or experience downtime without notice.",
      "We may update these Terms to reflect gameplay changes, new regulations, or balance adjustments. Continued use after changes constitutes acceptance.",
    ],
  },
  {
    title: "7. Termination",
    body: [
      "We may suspend or terminate your access if you violate these Terms, the Game Rules, or engage in fraudulent or abusive behavior.",
      "You may close your account at any time by contacting support. Termination does not grant any refunds for previously purchased virtual assets.",
    ],
  },
  {
    title: "8. Disclaimer & Limitation of Liability",
    body: [
      "To the fullest extent permitted by law, we disclaim all warranties and shall not be liable for indirect, incidental, or consequential damages arising from your use of the Game.",
      "Our total liability for any claim will not exceed the amount you paid (if any) in the six months preceding the claim.",
    ],
  },
  {
    title: "9. Contact",
    body: [
      "If you have questions about these Terms or need to report a violation, contact our support team.",
    ],
  },
]

export default function TermsPage() {
  return (
    <main className="bg-gradient-to-b from-background via-background to-muted/40">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center space-y-4">
          <p className="text-sm tracking-wide uppercase text-muted-foreground">Legal</p>
          <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            These Terms govern your access to and use of Medieval Strategy, including all related services,
            features, and content. Please read them carefully.
          </p>
          <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
        </div>

        <div className="mt-12 space-y-8 bg-card/80 backdrop-blur-sm border border-border rounded-3xl p-8 shadow-lg">
          {sections.map((section, sectionIndex) => (
            <section key={`${section.title}-${sectionIndex}`} className="space-y-3">
              <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                {section.body.map((paragraph, paragraphIndex) => (
                  <p key={`${section.title}-${paragraphIndex}`}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 text-sm text-muted-foreground text-center">
          Need help? Reach us at{" "}
          <Link href="mailto:support@medievalstrategy.game" className="text-primary font-medium hover:underline">
            support@medievalstrategy.game
          </Link>{" "}
          or visit the{" "}
          <Link href="/support" className="text-primary font-medium hover:underline">
            Support Center
          </Link>
          .
        </div>
      </div>
    </main>
  )
}
