import { useQuery } from '@tanstack/react-query';
import { vehicleApi } from '../../services/api';
import { Link } from 'react-router-dom';
import { Car, ChevronRight, Tag } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate, expiryColorClass } from '../../utils/helpers';
import type { Vehicle } from '../../types';

export default function VehiclesPage() {
  const { data: vehicles = [], isLoading } = useQuery<Vehicle[]>({
    queryKey: ['vehicles-mine'],
    queryFn: () => vehicleApi.mine().then(r => r.data.data),
  });

  if (isLoading) return <div className="grid gap-4">{[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">My Vehicles</h1>
      {vehicles.length === 0 ? (
        <EmptyState icon={<Car className="w-12 h-12" />} title="No vehicles registered" description="Scan your safety tag to activate and register a vehicle." />
      ) : (
        <div className="space-y-3">
          {vehicles.map((v) => (
            <Link key={v.id} to={`/vehicles/${v.id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Car className="w-6 h-6 text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 text-lg tracking-wide">{v.registrationNumber}</div>
                    <div className="text-sm text-gray-500">{v.make} {v.model} • {v.color} • {v.fuelType}</div>
                    <div className="flex items-center gap-3 mt-1">
                      {v.insuranceRecord && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${expiryColorClass(v.insuranceRecord.expiryColor)}`}>
                          Ins: {formatDate(v.insuranceRecord.expiryDate)}
                        </span>
                      )}
                      {v.pucRecord && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${expiryColorClass(v.pucRecord.expiryColor)}`}>
                          PUC: {formatDate(v.pucRecord.expiryDate)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${v.tag?.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {v.tag?.tagId ?? 'No Tag'}
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
