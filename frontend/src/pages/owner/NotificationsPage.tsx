import { useQuery } from '@tanstack/react-query';
import { notificationApi } from '../../services/api';
import { useState } from 'react';
import { Bell, MessageSquare, Phone, Mail } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { Pagination } from '../../components/ui/Table';
import { formatDateTime, notifStatusColor } from '../../utils/helpers';
import type { NotificationLog } from '../../types';

const channelIcon = (channel: string) => {
  if (channel === 'WHATSAPP') return <MessageSquare className="w-4 h-4 text-green-600" />;
  if (channel === 'SMS') return <Phone className="w-4 h-4 text-blue-600" />;
  return <Mail className="w-4 h-4 text-purple-600" />;
};

export default function NotificationsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications-mine', page],
    queryFn: () => notificationApi.mine({ page, limit: 20 }).then(r => r.data),
  });

  const items: NotificationLog[] = data?.data ?? [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
      <Card padding={false}>
        {isLoading ? (
          <div className="p-4"><SkeletonTable rows={5} /></div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Bell className="w-10 h-10" />} title="No notifications yet" />
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {items.map((n) => (
                <div key={n.id} className="flex items-start gap-3 p-4">
                  <div className="mt-0.5">{channelIcon(n.channel)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase">{n.event.replace('_',' ')}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${notifStatusColor(n.status)}`}>{n.status}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDateTime(n.createdAt)}</p>
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
