export class GameError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode = 400,
  ) {
    super(message)
    this.name = "GameError"
  }
}

export const ErrorCodes = {
  INSUFFICIENT_RESOURCES: "INSUFFICIENT_RESOURCES",
  VILLAGE_NOT_FOUND: "VILLAGE_NOT_FOUND",
  PLAYER_NOT_FOUND: "PLAYER_NOT_FOUND",
  INVALID_COORDINATES: "INVALID_COORDINATES",
  TROOP_NOT_FOUND: "TROOP_NOT_FOUND",
  ATTACK_NOT_FOUND: "ATTACK_NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_REQUEST: "INVALID_REQUEST",
  GAME_PAUSED: "GAME_PAUSED",
}

export function handleGameError(error: unknown) {
  if (error instanceof GameError) {
    return {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
    }
  }

  console.error("[v0] Unexpected error:", error)
  return {
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred",
    statusCode: 500,
  }
}
