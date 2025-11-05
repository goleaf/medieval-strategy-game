import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getAllTaskDefinitions, getTaskDefinitionsByCategory, updateTaskProgress } from '@/lib/game-services/task-service';
import { TaskCategory } from '@prisma/client';

/**
 * GET /api/tasks
 * Get all available tasks or tasks for a specific village/player
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const villageId = searchParams.get('villageId');
    const category = searchParams.get('category') as TaskCategory;

    let tasks;

    if (category) {
      tasks = getTaskDefinitionsByCategory(category);
    } else if (villageId) {
      // For village-specific tasks
      tasks = getTaskDefinitionsByCategory(TaskCategory.VILLAGE_SPECIFIC);
    } else {
      // Return all tasks
      tasks = getAllTaskDefinitions();
    }

    return NextResponse.json({
      success: true,
      data: tasks
    });

  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({
      error: 'Failed to fetch tasks'
    }, { status: 500 });
  }
}

/**
 * POST /api/tasks/update
 * Update task progress and check for completions
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { villageId } = body;

    // Update task progress
    await updateTaskProgress(session.user.id, villageId);

    return NextResponse.json({
      success: true,
      message: 'Task progress updated'
    });

  } catch (error) {
    console.error('Error updating task progress:', error);
    return NextResponse.json({
      error: 'Failed to update task progress'
    }, { status: 500 });
  }
}
