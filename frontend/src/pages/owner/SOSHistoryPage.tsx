import { useQuery } from '@tanstack/react-query';
import { sosApi } from '../../services/api';
import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Table';
import { formatDateTime, sosStatusColor } from '../../utils/helpers';
import type { SOSEvent } from '../../types';

export default function SOSHistoryPage() {
  const [page, setPage] = useState(1);
  const { data } = useQuery({
    queryKey: ['sos-mine', page],
    queryFn: () => sosApi.mine({ page, limit: 20 }).then(r => r.data),
  });

  const items: SOSEvent[] = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">SOS History</h1>
      <Card padding={false}>
        {items.length === 0 ? (
          <EmptyState icon={<AlertTriangle className="w-10 h-10" />} title="No SOS events" description="Emergency SOS events will appear here." />
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {items.map((s) => (
                <div key={s.id} className="p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">{s.vehicle?.registrationNumber}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sosStatusColor(s.status)}`}>{s.status}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{formatDateTime(s.triggeredAt)}</p>
                    {s.mapLink && <a href={s.mapLink} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-600 hover:underline">View Location</a>}
                  </div>
                </div>
              ))}
            </div>
            {pagination && <Pagination page={page} totalPages={pagination.totalPages} onPageChange={setPage} />}
          </>
        )}
      </Card>
    </div>
  );
}
