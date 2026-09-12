-- Fix any remaining old IPs to current IP 192.168.0.129
UPDATE tags
SET "qrCodeUrl" = REPLACE("qrCodeUrl", 'http://10.10.90.37:3000', 'http://192.168.0.129:3000')
WHERE "qrCodeUrl" LIKE '%10.10.90.37%';

-- Final verification
SELECT
  COUNT(*) AS total_tags,
  COUNT(CASE WHEN "qrCodeUrl" LIKE '%192.168.0.129%' THEN 1 END) AS on_current_ip,
  COUNT(CASE WHEN "qrCodeUrl" NOT LIKE '%192.168.0.129%' THEN 1 END) AS still_wrong
FROM tags;
