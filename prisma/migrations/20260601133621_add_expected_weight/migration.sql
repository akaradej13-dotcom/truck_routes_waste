-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "contactPhone" TEXT,
    "expectedWeightKg" REAL NOT NULL DEFAULT 100
);
INSERT INTO "new_Location" ("address", "contactPhone", "id", "latitude", "longitude", "name") SELECT "address", "contactPhone", "id", "latitude", "longitude", "name" FROM "Location";
DROP TABLE "Location";
ALTER TABLE "new_Location" RENAME TO "Location";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
