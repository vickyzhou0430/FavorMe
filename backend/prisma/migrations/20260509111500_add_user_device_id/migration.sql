-- Add optional device-scoped identity for MVP bootstrap flow.
ALTER TABLE "User" ADD COLUMN "deviceId" TEXT;

CREATE UNIQUE INDEX "User_deviceId_key" ON "User"("deviceId");
