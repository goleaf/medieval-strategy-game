"use client"

import Link from "next/link"
import {
  Crown,
  Shield,
  Sword,
  Mail,
  Github,
  ExternalLink,
  Book,
  Users,
  Trophy,
  Map,
  MessageCircle,
  HelpCircle,
  FileText,
  Scale
} from "lucide-react"

export function Footer() {
  const currentYear = new Date().getFullYear()

  const gameLinks = [
    { href: "/map", label: "World Map", icon: Map },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { href: "/tribes", label: "Tribes", icon: Users },
    { href: "/market", label: "Market", icon: MessageCircle },
  ]

  const infoLinks = [
    { href: "/docs/features", label: "Game Features", icon: Book },
    { href: "/docs/admin/overview", label: "Admin Guide", icon: Shield },
    { href: "/docs/api", label: "API Documentation", icon: FileText },
    { href: "/docs/development", label: "Development", icon: Github },
  ]

  const legalLinks = [
    { href: "/privacy", label: "Privacy Policy", icon: Scale },
    { href: "/terms", label: "Terms of Service", icon: FileText },
    { href: "/rules", label: "Game Rules", icon: Crown },
    { href: "/support", label: "Support", icon: HelpCircle },
  ]

  const socialLinks = [
    { href: "#", label: "GitHub", icon: Github },
    { href: "#", label: "Discord", icon: MessageCircle },
    { href: "mailto:support@medievalstrategy.game", label: "Email", icon: Mail },
  ]

  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Game Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                <Sword className="w-4 h-4 text-primary" />
              </div>
              <h3 className="font-bold text-lg">Medieval Strategy</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Build your kingdom, train mighty armies, and conquer the world in this epic medieval strategy game.
              Join thousands of players in the ultimate battle for supremacy!
            </p>
            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
              <span className="flex items-center space-x-1">
                <Crown className="w-3 h-3" />
                <span>Strategy Game</span>
              </span>
              <span className="flex items-center space-x-1">
                <Shield className="w-3 h-3" />
                <span>Real-time Combat</span>
              </span>
            </div>
          </div>

          {/* Game Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm uppercase tracking-wide">Game</h4>
            <ul className="space-y-2">
              {gameLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center space-x-2 group"
                  >
                    <link.icon className="w-3 h-3 group-hover:scale-110 transition-transform" />
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Information */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm uppercase tracking-wide">Information</h4>
            <ul className="space-y-2">
              {infoLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center space-x-2 group"
                  >
                    <link.icon className="w-3 h-3 group-hover:scale-110 transition-transform" />
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal & Support */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm uppercase tracking-wide">Support & Legal</h4>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center space-x-2 group"
                  >
                    <link.icon className="w-3 h-3 group-hover:scale-110 transition-transform" />
                    <span>{link.label}</span>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Social Links */}
            <div className="pt-4 border-t border-border">
              <h5 className="font-medium text-sm mb-3">Connect With Us</h5>
              <div className="flex space-x-3">
                {socialLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="w-8 h-8 bg-muted hover:bg-primary hover:text-primary-foreground rounded-full flex items-center justify-center transition-colors group"
                    aria-label={link.label}
                    target={link.href.startsWith('http') ? '_blank' : undefined}
                    rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  >
                    <link.icon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Game Statistics */}
        <div className="border-t border-border pt-6 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-primary">10K+</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Active Players</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-primary">500+</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Villages</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-primary">50+</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Tribes</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-primary">24/7</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">Game Time</div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>© {currentYear} Medieval Strategy Game</span>
              <span className="hidden md:inline">•</span>
              <span>Built with ❤️ using Next.js & TypeScript</span>
            </div>

            <div className="flex items-center space-x-4 text-sm">
              <span className="text-muted-foreground">Version 1.0.0</span>
              <span className="text-muted-foreground">•</span>
              <Link
                href="/changelog"
                className="text-muted-foreground hover:text-primary transition-colors flex items-center space-x-1"
              >
                <span>Changelog</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-4 text-xs text-muted-foreground text-center">
            This is a strategy game for entertainment purposes. All game mechanics are fictional.
            Player data is stored securely and never shared with third parties.
          </div>
        </div>
      </div>
    </footer>
  )
}
