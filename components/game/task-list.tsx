'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, Trophy, Star } from 'lucide-react';

interface TaskDefinition {
  type: string;
  category: string;
  level: number;
  buildingType?: string;
  resourceType?: string;
  targetLevel?: number;
  targetPopulation?: number;
  targetCulturePoints?: number;
  rewards: {
    wood: number;
    stone: number;
    iron: number;
    gold: number;
    food: number;
    heroExperience: number;
  };
}

interface TaskListProps {
  villageId?: string;
  category?: 'VILLAGE_SPECIFIC' | 'PLAYER_GLOBAL';
}

export function TaskList({ villageId, category = 'VILLAGE_SPECIFIC' }: TaskListProps) {
  const [tasks, setTasks] = useState<TaskDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [villageId, category]);

  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams();
      if (villageId) params.append('villageId', villageId);
      if (category) params.append('category', category);

      const response = await fetch(`/api/tasks?${params}`);
      const data = await response.json();

      if (data.success) {
        setTasks(data.data);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskProgress = async () => {
    setUpdating(true);
    try {
      const response = await fetch('/api/tasks/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ villageId }),
      });

      const data = await response.json();
      if (data.success) {
        // Refresh tasks after update
        await fetchTasks();
      }
    } catch (error) {
      console.error('Error updating task progress:', error);
    } finally {
      setUpdating(false);
    }
  };

  const getTaskDescription = (task: TaskDefinition): string => {
    switch (task.type) {
      case 'BUILDING_LEVEL':
        return `Upgrade ${task.buildingType?.toLowerCase()} to level ${task.targetLevel}`;
      case 'RESOURCE_FIELD_LEVEL':
        return `Upgrade ${task.resourceType?.toLowerCase()} field to level ${task.targetLevel}`;
      case 'POPULATION_REACH':
        return `Reach ${task.targetPopulation} population`;
      case 'CULTURE_POINTS_PRODUCTION':
        return `Reach ${task.targetCulturePoints} culture points production`;
      case 'CELEBRATION_HOLD':
        return 'Hold a celebration';
      default:
        return 'Complete task';
    }
  };

  const getTaskIcon = (task: TaskDefinition) => {
    // For now, return a generic icon
    // TODO: Add specific icons for different task types
    return <Circle className="w-4 h-4" />;
  };

  const getRewardDisplay = (rewards: TaskDefinition['rewards']) => {
    const rewardItems = [];

    if (rewards.wood > 0) rewardItems.push(`${rewards.wood} Wood`);
    if (rewards.stone > 0) rewardItems.push(`${rewards.stone} Stone`);
    if (rewards.iron > 0) rewardItems.push(`${rewards.iron} Iron`);
    if (rewards.gold > 0) rewardItems.push(`${rewards.gold} Gold`);
    if (rewards.food > 0) rewardItems.push(`${rewards.food} Food`);
    if (rewards.heroExperience > 0) rewardItems.push(`${rewards.heroExperience} XP`);

    return rewardItems.join(', ');
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading tasks...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            {category === 'VILLAGE_SPECIFIC' ? 'Village Tasks' : 'Global Tasks'}
          </div>
          <Button
            onClick={updateTaskProgress}
            disabled={updating}
            size="sm"
          >
            {updating ? 'Updating...' : 'Check Progress'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No tasks available
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task, index) => (
              <div
                key={`${task.type}-${task.level}-${index}`}
                className="flex items-start gap-3 p-3 border rounded-lg"
              >
                <div className="flex-shrink-0 mt-1">
                  {getTaskIcon(task)}
                </div>

                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">
                      {getTaskDescription(task)}
                    </h4>
                    <Badge variant="secondary" className="text-xs">
                      Level {task.level}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <Progress value={0} className="flex-grow h-2" />
                    <span className="text-xs text-muted-foreground">
                      0/{task.targetLevel || task.targetPopulation || task.targetCulturePoints || 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="w-3 h-3" />
                    <span>Rewards: {getRewardDisplay(task.rewards)}</span>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <CheckCircle className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
