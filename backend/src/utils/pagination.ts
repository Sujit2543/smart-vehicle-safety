import { Request } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export function getPaginationParams(req: Request): PaginationParams {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10)));
  return { page, limit, skip: (page - 1) * limit };
}

export function getOrderBy(
  req: Request,
  allowedFields: string[],
  defaultField = 'createdAt',
  defaultOrder: 'asc' | 'desc' = 'desc'
): Record<string, 'asc' | 'desc'> {
  const sortBy = String(req.query.sortBy ?? defaultField);
  const sortOrder = (String(req.query.sortOrder ?? defaultOrder) as 'asc' | 'desc');
  const field = allowedFields.includes(sortBy) ? sortBy : defaultField;
  const order: 'asc' | 'desc' = ['asc', 'desc'].includes(sortOrder) ? sortOrder : defaultOrder;
  return { [field]: order };
}
