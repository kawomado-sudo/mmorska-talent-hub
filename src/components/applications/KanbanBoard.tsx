import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';

const statusColumns = [
  { value: 'new', label: 'Nowe', className: 'border-t-blue-600' },
  { value: 'reviewing', label: 'W ocenie', className: 'border-t-sky-600' },
  { value: 'hold', label: 'Hold', className: 'border-t-amber-500' },
  { value: 'accepted', label: 'Zaakceptowane', className: 'border-t-emerald-600' },
  { value: 'rejected', label: 'Odrzucone', className: 'border-t-red-600' },
  { value: 'in_review', label: 'W recenzji', className: 'border-t-violet-600' },
  { value: 'screening_test', label: 'Screening test', className: 'border-t-indigo-600' },
  { value: 'interview', label: 'Rozmowa', className: 'border-t-cyan-600' },
];

const statusBadge: Record<string, { label: string; className: string }> = {
  new: { label: 'Nowe', className: 'bg-blue-600 text-white border-blue-600' },
  reviewing: { label: 'W ocenie', className: 'bg-sky-600 text-white border-sky-600' },
  hold: { label: 'Hold', className: 'bg-amber-500 text-white border-amber-500' },
  accepted: { label: 'Zaakceptowane', className: 'bg-emerald-600 text-white border-emerald-600' },
  rejected: { label: 'Odrzucone', className: 'bg-red-600 text-white border-red-600' },
  in_review: { label: 'W recenzji', className: 'bg-violet-600 text-white border-violet-600' },
  screening_test: { label: 'Screening test', className: 'bg-indigo-600 text-white border-indigo-600' },
  interview: { label: 'Rozmowa', className: 'bg-cyan-600 text-white border-cyan-600' },
};

const ratingColor = (rating: number | null) => {
  if (!rating) return 'text-muted-foreground';
  if (rating >= 75) return 'text-emerald-400';
  if (rating >= 50) return 'text-yellow-400';
  return 'text-red-400';
};

interface KanbanBoardProps {
  applications: any[];
  onSelectApp: (app: any) => void;
}

export const KanbanBoard = ({ applications, onSelectApp }: KanbanBoardProps) => {
  const grouped = statusColumns.map((col) => ({
    ...col,
    items: (applications || []).filter((a: any) => a.status === col.value),
  }));

  // Only show columns that have items or are core statuses
  const coreStatuses = ['new', 'reviewing', 'hold', 'accepted', 'rejected'];
  const visibleColumns = grouped.filter(
    (col) => coreStatuses.includes(col.value) || col.items.length > 0
  );

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {visibleColumns.map((col) => (
        <div
          key={col.value}
          className={`flex-shrink-0 w-72 rounded-lg border border-t-4 bg-card ${col.className}`}
        >
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="text-sm font-semibold">{col.label}</h3>
            <Badge variant="secondary" className="text-xs">
              {col.items.length}
            </Badge>
          </div>
          <ScrollArea className="h-[calc(100vh-320px)]">
            <div className="p-2 space-y-2">
              {col.items.map((app: any) => (
                <div
                  key={app.id}
                  className="rounded-md border bg-background p-3 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onSelectApp(app)}
                >
                  <p className="font-medium text-sm">
                    {app.first_name} {app.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{app.email}</p>

                  {app.ai_rating != null && (
                    <div className="flex items-center gap-2 mt-2">
                      <Progress value={app.ai_rating} className="h-1.5 flex-1" />
                      <span className={`text-xs font-medium ${ratingColor(app.ai_rating)}`}>
                        {app.ai_rating}%
                      </span>
                    </div>
                  )}

                  {app.ai_summary && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {app.ai_summary}
                    </p>
                  )}

                  <div className="mt-2">
                    <Badge className={`text-[10px] ${statusBadge[app.status]?.className || ''}`}>
                      {statusBadge[app.status]?.label || app.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {col.items.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Brak kandydatów</p>
              )}
            </div>
          </ScrollArea>
        </div>
      ))}
    </div>
  );
};
