import { type NextRequest, NextResponse } from "next/server"

// GET /api/admin/footer/sections - Get all footer sections
export async function GET() {
  try {
    // TODO: Replace with database queries when footer models are available
    const sections = [
      {
        id: "game",
        name: "game",
        title: "Game",
        order: 1,
        isActive: true,
        menuItems: []
      },
      {
        id: "information",
        name: "information",
        title: "Information",
        order: 2,
        isActive: true,
        menuItems: []
      },
      {
        id: "support",
        name: "support",
        title: "Support & Legal",
        order: 3,
        isActive: true,
        menuItems: []
      },
      {
        id: "social",
        name: "social",
        title: "Connect",
        order: 4,
        isActive: true,
        menuItems: []
      }
    ]

    return NextResponse.json({
      success: true,
      data: sections
    })
  } catch (error) {
    console.error("Error fetching footer sections:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to fetch footer sections"
    }, { status: 500 })
  }
}

// POST /api/admin/footer/sections - Create new footer section
export async function POST(req: NextRequest) {
  try {
    // TODO: Add admin authentication
    const body = await req.json()

    if (!body.name || !body.title) {
      return NextResponse.json({
        success: false,
        error: "Section name and title are required"
      }, { status: 400 })
    }

    // TODO: Save to database when footer models are available
    const newSection = {
      id: `section_${Date.now()}`,
      name: body.name,
      title: body.title,
      order: body.order || 0,
      isActive: body.isActive !== undefined ? body.isActive : true,
      menuItems: []
    }

    return NextResponse.json({
      success: true,
      message: "Footer section created successfully",
      data: newSection
    }, { status: 201 })
  } catch (error) {
    console.error("Error creating footer section:", error)
    return NextResponse.json({
      success: false,
      error: "Failed to create footer section"
    }, { status: 500 })
  }
}
