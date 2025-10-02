import { Button } from "@/components/ui/button";
import { List, Calendar, CalendarDays } from "lucide-react";

export type ViewMode = 'plain' | 'dateGrouped';

interface TransactionViewToggleProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export function TransactionViewToggle({ currentView, onViewChange }: TransactionViewToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-muted rounded-xl">
      <Button
        variant={currentView === 'plain' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('plain')}
        className="gap-2 touch-target"
      >
        <List className="h-4 w-4" />
        <span className="hidden sm:inline">List</span>
      </Button>
      <Button
        variant={currentView === 'dateGrouped' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('dateGrouped')}
        className="gap-2 touch-target"
      >
        <CalendarDays className="h-4 w-4" />
        <span className="hidden sm:inline">Calendar</span>
      </Button>
    </div>
  );
}