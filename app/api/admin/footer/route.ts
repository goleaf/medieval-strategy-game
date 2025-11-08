import { type NextRequest, NextResponse } from "next/server"

// Types for footer data
export interface FooterSection {
  id: string
  name: string
  title: string
  order: number
  isActive: boolean
  menuItems: FooterMenuItem[]
}

export interface FooterMenuItem {
  id: string
  sectionId: string
  label: string
  href: string
  iconName?: string
  order: number
  isActive: boolean
  isExternal: boolean
}

export interface FooterContent {
  id: string
  key: string
  content: string
  isActive: boolean
}

// Default footer data - this will eventually come from database
const defaultFooterData = {
  sections: [
    {
      id: "game",
      name: "game",
      title: "Game",
      order: 1,
      isActive: true,
      menuItems: [
        { id: "leaderboard", sectionId: "game", label: "Leaderboard", href: "/leaderboard", iconName: "Trophy", order: 1, isActive: true, isExternal: false },
        { id: "tribes", sectionId: "game", label: "Tribes", href: "/tribes", iconName: "Users", order: 2, isActive: true, isExternal: false },
        { id: "market", sectionId: "game", label: "Market", href: "/market", iconName: "MessageCircle", order: 3, isActive: true, isExternal: false },
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
    { id: "copyright", key: "copyright", content: "© 2024 Medieval Strategy Game. All rights reserved.", isActive: true },
    { id: "disclaimer", key: "disclaimer", content: "This is a strategy game for entertainment purposes. All game mechanics are fictional. Player data is stored securely and never shared with third parties.", isActive: true }
  ],
  stats: {
    activePlayers: "10K+",
    villages: "500+",
    tribes: "50+",
    gameTime: "24/7"
  }
}

// GET /api/admin/footer - Get footer data
export async function GET() {
  try {
    // TODO: Replace with database queries when footer models are available
    return NextResponse.json({
      success: true,
      data: defaultFooterData
    })
  } catch (error) {
    console.error("Error fetching footer data:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch footer data"
    }, { status: 500 })
  }
}

// PUT /api/admin/footer - Update footer data (admin only)
export async function PUT(req: NextRequest) {
  try {
    // TODO: Add admin authentication
    const body = await req.json()

    // For now, just validate the structure
    if (!body.sections || !Array.isArray(body.sections)) {
      return NextResponse.json({
        success: false,
        error: "Invalid footer data structure"
      }, { status: 400 })
    }

    // TODO: Save to database when footer models are available
    // For now, just return success
    return NextResponse.json({
      success: true,
      message: "Footer data updated successfully",
      data: body
    })
  } catch (error) {
    console.error("Error updating footer data:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to update footer data"
    }, { status: 500 })
  }
}
