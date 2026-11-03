CREATE TABLE "BusinessHoliday" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'LIMA',
    CONSTRAINT "BusinessHoliday_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BusinessHoliday_date_scope_key" ON "BusinessHoliday"("date", "scope");
CREATE INDEX "BusinessHoliday_scope_date_idx" ON "BusinessHoliday"("scope", "date");

CREATE TABLE "ItseRequestHistory" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "fromStatus" "RequestStatus",
    "toStatus" "RequestStatus",
    "requestId" INTEGER NOT NULL,
    "actorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ItseRequestHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ItseRequestHistory_requestId_createdAt_idx" ON "ItseRequestHistory"("requestId", "createdAt");

ALTER TABLE "ItseRequest"
ADD COLUMN "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "dueAt" DATE;

UPDATE "ItseRequest" SET "startedAt" = "createdAt";

UPDATE "ItseRequest" AS request
SET "dueAt" = (
    SELECT business_day::date
    FROM generate_series(
        request."createdAt"::date + 1,
        request."createdAt"::date + 30,
        interval '1 day'
    ) AS business_day
    WHERE EXTRACT(ISODOW FROM business_day) < 6
    ORDER BY business_day
    OFFSET 8
    LIMIT 1
);

ALTER TABLE "ItseRequest" ALTER COLUMN "dueAt" SET NOT NULL;

INSERT INTO "ItseRequestHistory" (
    "action", "description", "toStatus", "requestId", "actorId", "createdAt"
)
SELECT
    'SOLICITUD_RECIBIDA',
    'Solicitud recibida por el servidor.',
    "status",
    "id",
    "userId",
    "createdAt"
FROM "ItseRequest";

ALTER TABLE "ItseRequestHistory"
ADD CONSTRAINT "ItseRequestHistory_requestId_fkey"
FOREIGN KEY ("requestId") REFERENCES "ItseRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ItseRequestHistory"
ADD CONSTRAINT "ItseRequestHistory_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
