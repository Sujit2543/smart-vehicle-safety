SELECT u.id, u.mobile, u."isActive", u.role,
       c.id as customer_id, c."fullName", c."isActive" as customer_active
FROM users u
LEFT JOIN customers c ON c."userId" = u.id
WHERE u.mobile = '8002543444';
