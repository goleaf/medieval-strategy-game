-- CreateIndex
CREATE INDEX "Admin_role_idx" ON "Admin"("role");

-- CreateIndex
CREATE INDEX "Admin_createdAt_idx" ON "Admin"("createdAt");

-- CreateIndex
CREATE INDEX "AdminNotification_adminId_isRead_idx" ON "AdminNotification"("adminId", "isRead");

-- CreateIndex
CREATE INDEX "AdminNotification_adminId_isRead_createdAt_idx" ON "AdminNotification"("adminId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "AdminNotification_severity_isRead_idx" ON "AdminNotification"("severity", "isRead");

-- CreateIndex
CREATE INDEX "Alliance_tribe2Id_idx" ON "Alliance"("tribe2Id");

-- CreateIndex
CREATE INDEX "Alliance_endsAt_idx" ON "Alliance"("endsAt");

-- CreateIndex
CREATE INDEX "Attack_status_arrivalAt_idx" ON "Attack"("status", "arrivalAt");

-- CreateIndex
CREATE INDEX "Attack_type_status_idx" ON "Attack"("type", "status");

-- CreateIndex
CREATE INDEX "Attack_movementId_idx" ON "Attack"("movementId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_adminId_createdAt_idx" ON "AuditLog"("adminId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "Building_isBuilding_completionAt_idx" ON "Building"("isBuilding", "completionAt");

-- CreateIndex
CREATE INDEX "Building_completionAt_idx" ON "Building"("completionAt");

-- CreateIndex
CREATE INDEX "Building_type_level_idx" ON "Building"("type", "level");

-- CreateIndex
CREATE INDEX "LeaderboardCache_updatedAt_idx" ON "LeaderboardCache"("updatedAt");

-- CreateIndex
CREATE INDEX "MarketOrder_expiresAt_idx" ON "MarketOrder"("expiresAt");

-- CreateIndex
CREATE INDEX "MarketOrder_status_expiresAt_idx" ON "MarketOrder"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "MarketOrder_type_status_idx" ON "MarketOrder"("type", "status");

-- CreateIndex
CREATE INDEX "Message_isRead_createdAt_idx" ON "Message"("isRead", "createdAt");

-- CreateIndex
CREATE INDEX "Message_type_isRead_idx" ON "Message"("type", "isRead");

-- CreateIndex
CREATE INDEX "Movement_status_idx" ON "Movement"("status");

-- CreateIndex
CREATE INDEX "Movement_status_arrivalAt_idx" ON "Movement"("status", "arrivalAt");

-- CreateIndex
CREATE INDEX "Player_lastActiveAt_idx" ON "Player"("lastActiveAt");

-- CreateIndex
CREATE INDEX "Player_beginnerProtectionUntil_idx" ON "Player"("beginnerProtectionUntil");

-- CreateIndex
CREATE INDEX "Player_isDeleted_lastActiveAt_idx" ON "Player"("isDeleted", "lastActiveAt");

-- CreateIndex
CREATE INDEX "Player_tribeId_isDeleted_idx" ON "Player"("tribeId", "isDeleted");

-- CreateIndex
CREATE INDEX "Research_isResearching_completionAt_idx" ON "Research"("isResearching", "completionAt");

-- CreateIndex
CREATE INDEX "Research_completionAt_idx" ON "Research"("completionAt");

-- CreateIndex
CREATE INDEX "Research_type_level_idx" ON "Research"("type", "level");

-- CreateIndex
CREATE INDEX "Tribe_totalPoints_idx" ON "Tribe"("totalPoints");

-- CreateIndex
CREATE INDEX "Tribe_memberCount_idx" ON "Tribe"("memberCount");

-- CreateIndex
CREATE INDEX "Tribe_joinPolicy_idx" ON "Tribe"("joinPolicy");

-- CreateIndex
CREATE INDEX "Tribe_totalPoints_memberCount_idx" ON "Tribe"("totalPoints", "memberCount");

-- CreateIndex
CREATE INDEX "TribeInvite_status_idx" ON "TribeInvite"("status");

-- CreateIndex
CREATE INDEX "TribeInvite_expiresAt_idx" ON "TribeInvite"("expiresAt");

-- CreateIndex
CREATE INDEX "TribeInvite_status_expiresAt_idx" ON "TribeInvite"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "TroopProduction_troopType_completionAt_idx" ON "TroopProduction"("troopType", "completionAt");

-- CreateIndex
CREATE INDEX "User_lastActiveAt_idx" ON "User"("lastActiveAt");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "Village_lastTickAt_idx" ON "Village"("lastTickAt");

-- CreateIndex
CREATE INDEX "Village_playerId_isCapital_idx" ON "Village"("playerId", "isCapital");

-- CreateIndex
CREATE INDEX "Village_continentId_playerId_idx" ON "Village"("continentId", "playerId");

-- CreateIndex
CREATE INDEX "War_status_idx" ON "War"("status");

-- CreateIndex
CREATE INDEX "War_endsAt_idx" ON "War"("endsAt");
