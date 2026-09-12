import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { customerApi } from '../../services/api';
import { Bell, MessageSquare, Phone, Mail } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Pagination } from '../../components/ui/Table';
import { formatDateTime, notifStatusColor } from '../../utils/helpers';

const channelIcon = (ch: string) => {
  if (ch === 'WHATSAPP') return <MessageSquare className="w-4 h-4 text-green-600" />;
  if (ch === 'SMS')      return <Phone className="w-4 h-4 text-blue-600" />;
  return <Mail className="w-4 h-4 text-purple-600" />;
};

export default function CustomerNotificationsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['my-notifications', page],
    queryFn: () => customerApi.getMyNotifications({ page, limit: 20 }).then(r => r.data),
  });

  const items  = data?.data  ?? [];
  const paging = data?.pagination;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
        <p className="text-sm text-gray-500 mt-0.5">WhatsApp and SMS alerts sent to you</p>
      </div>

      <Card padding={false}>
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <Bell className="w-10 h-10 text-gray-200" />
            <p className="text-gray-500 font-medium">No notifications yet</p>
            <p className="text-sm text-gray-400">Expiry reminders and alerts will appear here.</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-100">
              {items.map((n: any) => (
                <div key={n.id} className="flex items-start gap-3 px-4 py-4">
                  <div className="mt-0.5 flex-shrink-0">{channelIcon(n.channel)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-gray-500 uppercase">
                        {n.event?.replace(/_/g, ' ')}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${notifStatusColor(n.status)}`}>
                        {n.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDateTime(n.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
            {paging && <Pagination page={page} totalPages={paging.totalPages} onPageChange={setPage} />}
          </>
        )}
      </Card>
    </div>
  );
}
