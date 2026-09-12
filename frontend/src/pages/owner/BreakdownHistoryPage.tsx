import { useQuery } from '@tanstack/react-query';
import { breakdownApi } from '../../services/api';
import { Wrench, MapPin, Star } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDateTime } from '../../utils/helpers';

const STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-yellow-100 text-yellow-700',
  ACCEPTED:  'bg-blue-100 text-blue-700',
  EN_ROUTE:  'bg-purple-100 text-purple-700',
  ARRIVED:   'bg-indigo-100 text-indigo-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

export default function BreakdownHistoryPage() {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['breakdown-mine'],
    queryFn: () => breakdownApi.mine().then(r => r.data.data),
  });

  if (isLoading) return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Breakdown History</h1>
      {history.length === 0 ? (
        <EmptyState
          icon={<Wrench className="w-10 h-10" />}
          title="No breakdown requests"
          description="Your roadside assistance and breakdown requests will appear here."
        />
      ) : (
        <div className="space-y-3">
          {history.map((r: any) => (
            <Card key={r.id}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Wrench className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900">
                      {r.serviceType?.replace(/_/g,' ')}
                    </p>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {r.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Issue: {r.breakdownType?.replace(/_/g,' ')}
                  </p>
                  {r.description && <p className="text-xs text-gray-400 mt-0.5">{r.description}</p>}
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span>{formatDateTime(r.createdAt)}</span>
                    {r.mapLink && (
                      <a href={r.mapLink} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-brand-600 hover:underline">
                        <MapPin className="w-3 h-3" /> View Location
                      </a>
                    )}
                  </div>
                  {r.rating && (
                    <div className="flex items-center gap-1 mt-1.5">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating.score ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                      ))}
                      {r.rating.comment && <span className="text-xs text-gray-500 ml-1">"{r.rating.comment}"</span>}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
