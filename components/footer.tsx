"use client"

import { useState, useEffect } from "react"
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
  Scale,
  Loader2
} from "lucide-react"

// Icon mapping for dynamic icon names
const iconMap: Record<string, any> = {
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
  Scale,
}

interface FooterMenuItem {
  id: string
  sectionId: string
  label: string
  href: string
  iconName?: string
  order: number
  isActive: boolean
  isExternal: boolean
}

interface FooterSection {
  id: string
  name: string
  title: string
  order: number
  isActive: boolean
  menuItems: FooterMenuItem[]
}

interface FooterData {
  sections: FooterSection[]
  content: Array<{
    id: string
    key: string
    content: string
    isActive: boolean
  }>
  stats: {
    activePlayers: string
    villages: string
    tribes: string
    gameTime: string
  }
}

export function Footer() {
  const [footerData, setFooterData] = useState<FooterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const currentYear = new Date().getFullYear()

  useEffect(() => {
    const fetchFooterData = async () => {
      try {
        const response = await fetch('/api/admin/footer')
        const result = await response.json()

        if (result.success) {
          setFooterData(result.data)
        } else {
          throw new Error(result.error || 'Failed to load footer data')
        }
      } catch (err) {
        console.error('Error fetching footer data:', err)
        setError('Failed to load footer data')
        // Fallback to default data
        setFooterData({
          sections: [
            {
              id: "game",
              name: "game",
              title: "Game",
              order: 1,
              isActive: true,
              menuItems: [
                { id: "map", sectionId: "game", label: "World Map", href: "/map", iconName: "Map", order: 1, isActive: true, isExternal: false },
                { id: "leaderboard", sectionId: "game", label: "Leaderboard", href: "/leaderboard", iconName: "Trophy", order: 2, isActive: true, isExternal: false },
                { id: "tribes", sectionId: "game", label: "Tribes", href: "/tribes", iconName: "Users", order: 3, isActive: true, isExternal: false },
                { id: "market", sectionId: "game", label: "Market", href: "/market", iconName: "MessageCircle", order: 4, isActive: true, isExternal: false },
              ]
            },
            {
              id: "information",
              name: "information",
              title: "Information",
              order: 2,
              isActive: true,
              menuItems: [
                { id: "features", sectionId: "information", label: "Game Features", href: "/docs/features", iconName: "Book", order: 1, isActive: true, isExternal: false },
                { id: "admin-guide", sectionId: "information", label: "Admin Guide", href: "/docs/admin/overview", iconName: "Shield", order: 2, isActive: true, isExternal: false },
                { id: "api-docs", sectionId: "information", label: "API Documentation", href: "/docs/api", iconName: "FileText", order: 3, isActive: true, isExternal: false },
                { id: "development", sectionId: "information", label: "Development", href: "/docs/development", iconName: "Github", order: 4, isActive: true, isExternal: false },
              ]
            },
            {
              id: "support",
              name: "support",
              title: "Support & Legal",
              order: 3,
              isActive: true,
              menuItems: [
                { id: "privacy", sectionId: "support", label: "Privacy Policy", href: "/privacy", iconName: "Scale", order: 1, isActive: true, isExternal: false },
                { id: "terms", sectionId: "support", label: "Terms of Service", href: "/terms", iconName: "FileText", order: 2, isActive: true, isExternal: false },
                { id: "rules", sectionId: "support", label: "Game Rules", href: "/rules", iconName: "Crown", order: 3, isActive: true, isExternal: false },
                { id: "support", sectionId: "support", label: "Support", href: "/support", iconName: "HelpCircle", order: 4, isActive: true, isExternal: false },
              ]
            },
            {
              id: "social",
              name: "social",
              title: "Connect",
              order: 4,
              isActive: true,
              menuItems: [
                { id: "github", sectionId: "social", label: "GitHub", href: "#", iconName: "Github", order: 1, isActive: true, isExternal: true },
                { id: "discord", sectionId: "social", label: "Discord", href: "#", iconName: "MessageCircle", order: 2, isActive: true, isExternal: true },
                { id: "email", sectionId: "social", label: "Email", href: "mailto:support@medievalstrategy.game", iconName: "Mail", order: 3, isActive: true, isExternal: true },
              ]
            }
          ],
          content: [
            { id: "game_description", key: "game_description", content: "Build your kingdom, train mighty armies, and conquer the world in this epic medieval strategy game. Join thousands of players in the ultimate battle for supremacy!", isActive: true },
            { id: "copyright", key: "copyright", content: `© ${currentYear} Medieval Strategy Game. All rights reserved.`, isActive: true },
            { id: "disclaimer", key: "disclaimer", content: "This is a strategy game for entertainment purposes. All game mechanics are fictional. Player data is stored securely and never shared with third parties.", isActive: true }
          ],
          stats: {
            activePlayers: "10K+",
            villages: "500+",
            tribes: "50+",
            gameTime: "24/7"
          }
        })
      } finally {
        setLoading(false)
      }
    }

    fetchFooterData()
  }, [currentYear])

  if (loading) {
    return (
      <footer className="bg-card border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading footer...</span>
          </div>
        </div>
      </footer>
    )
  }

  if (error || !footerData) {
    return (
      <footer className="bg-card border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground py-8">
            <p>Unable to load footer content</p>
          </div>
        </div>
      </footer>
    )
  }

  // Sort sections by order and filter active ones
  const activeSections = footerData.sections
    .filter(section => section.isActive)
    .sort((a, b) => a.order - b.order)

  // Get content by key
  const getContent = (key: string) => {
    const content = footerData.content.find(c => c.key === key && c.isActive)
    return content?.content || ''
  }

  // Helper function to get icon component
  const getIcon = (iconName?: string) => {
    return iconName && iconMap[iconName] ? iconMap[iconName] : Link
  }

  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Game Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Sword className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold text-lg">Medieval Strategy</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {getContent('game_description')}
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

          {/* Dynamic Footer Sections */}
          {activeSections.map((section) => (
            <div key={section.id} className="space-y-4">
              <h4 className="font-semibold text-sm uppercase tracking-wide">{section.title}</h4>
              <ul className="space-y-2">
                {section.menuItems
                  .filter(item => item.isActive)
                  .sort((a, b) => a.order - b.order)
                  .map((item) => {
                    const IconComponent = getIcon(item.iconName)
                    const LinkComponent = item.isExternal ? 'a' : Link

                    return (
                      <li key={item.id}>
                        <LinkComponent
                          href={item.href}
                          className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center space-x-2 group"
                          {...(item.isExternal && {
                            target: '_blank',
                            rel: 'noopener noreferrer'
                          })}
                        >
                          {item.iconName && (
                            <IconComponent className="w-3 h-3 group-hover:scale-110 transition-transform" />
                          )}
                          <span>{item.label}</span>
                          {item.isExternal && <ExternalLink className="w-3 h-3 opacity-50" />}
                        </LinkComponent>
                      </li>
                    )
                  })}
              </ul>

              {/* Social Links Section */}
              {section.name === 'social' && (
                <div className="pt-4 border-t border-border">
                  <h5 className="font-medium text-sm mb-3">Connect With Us</h5>
                  <div className="flex space-x-3">
                    {section.menuItems
                      .filter(item => item.isActive)
                      .sort((a, b) => a.order - b.order)
                      .map((item) => {
                        const IconComponent = getIcon(item.iconName)
                        return (
                          <a
                            key={item.id}
                            href={item.href}
                            className="w-8 h-8 bg-muted hover:bg-primary hover:text-primary-foreground rounded-full flex items-center justify-center transition-colors group"
                            aria-label={item.label}
                            target={item.isExternal ? '_blank' : undefined}
                            rel={item.isExternal ? 'noopener noreferrer' : undefined}
                          >
                            <IconComponent className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          </a>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>
          ))}
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
