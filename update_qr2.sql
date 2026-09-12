-- Set qrCodeUrl for all tags that don't have it yet
UPDATE tags 
SET "qrCodeUrl" = CONCAT('http://10.10.90.37:3000/tag/', "tagId")
WHERE "qrCodeUrl" IS NULL OR "qrCodeUrl" = '';

-- Verify
SELECT "tagId", "qrCodeUrl", status FROM tags WHERE status='ACTIVE';
SELECT "tagId", "qrCodeUrl" FROM tags ORDER BY "createdAt" LIMIT 5;
