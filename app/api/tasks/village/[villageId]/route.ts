import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTaskDefinitionsByCategory, updateTaskProgress } from '@/lib/game-services/task-service';
import { TaskCategory } from '@prisma/client';

/**
 * GET /api/tasks/village/[villageId]
 * Get tasks for a specific village
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { villageId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const villageId = params.villageId;

    // Verify the village belongs to the user
    // TODO: Add village ownership verification

    // Get village-specific tasks
    const tasks = getTaskDefinitionsByCategory(TaskCategory.VILLAGE_SPECIFIC);

    return NextResponse.json({
      success: true,
      data: {
        villageId,
        tasks
      }
    });

  } catch (error) {
    console.error('Error fetching village tasks:', error);
    return NextResponse.json({
      error: 'Failed to fetch village tasks'
    }, { status: 500 });
  }
}

/**
 * POST /api/tasks/village/[villageId]/update
 * Update task progress for a specific village
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { villageId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const villageId = params.villageId;

    // Verify the village belongs to the user
    // TODO: Add village ownership verification

    // Update task progress for this village
    await updateTaskProgress(session.user.id, villageId);

    return NextResponse.json({
      success: true,
      message: 'Village task progress updated'
    });

  } catch (error) {
    console.error('Error updating village task progress:', error);
    return NextResponse.json({
      error: 'Failed to update village task progress'
    }, { status: 500 });
  }
}
