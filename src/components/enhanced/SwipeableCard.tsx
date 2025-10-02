import React, { useState, useRef } from 'react';
import { EnhancedCard } from '@/components/ui/enhanced-card';
import { Edit3, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeableCardProps {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
  disabled?: boolean;
}

export function SwipeableCard({
  children,
  onEdit,
  onDelete,
  className,
  disabled = false
}: SwipeableCardProps) {
  const [swipeDistance, setSwipeDistance] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || !isDragging) return;
    
    currentX.current = e.touches[0].clientX;
    const distance = currentX.current - startX.current;
    
    // Limit swipe distance
    const maxSwipe = 120;
    const constrainedDistance = Math.max(-maxSwipe, Math.min(maxSwipe, distance));
    setSwipeDistance(constrainedDistance);
  };

  const handleTouchEnd = () => {
    if (disabled) return;
    
    setIsDragging(false);
    
    // Trigger actions based on swipe distance
    const threshold = 60;
    
    if (swipeDistance > threshold && onEdit) {
      onEdit();
    } else if (swipeDistance < -threshold && onDelete) {
      onDelete();
    }
    
    // Reset position
    setSwipeDistance(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    startX.current = e.clientX;
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (disabled || !isDragging) return;
    
    currentX.current = e.clientX;
    const distance = currentX.current - startX.current;
    
    const maxSwipe = 120;
    const constrainedDistance = Math.max(-maxSwipe, Math.min(maxSwipe, distance));
    setSwipeDistance(constrainedDistance);
  };

  const handleMouseUp = () => {
    if (disabled) return;
    
    setIsDragging(false);
    
    const threshold = 60;
    
    if (swipeDistance > threshold && onEdit) {
      onEdit();
    } else if (swipeDistance < -threshold && onDelete) {
      onDelete();
    }
    
    setSwipeDistance(0);
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Action backgrounds */}
      <div className="absolute inset-0 flex">
        {/* Edit background (left) */}
        <div className={cn(
          "flex-1 bg-primary/20 flex items-center justify-start pl-6 transition-opacity duration-200",
          swipeDistance > 30 ? "opacity-100" : "opacity-0"
        )}>
          <div className="flex items-center gap-2 text-primary">
            <Edit3 className="h-5 w-5" />
            <span className="font-medium">Edit</span>
          </div>
        </div>
        
        {/* Delete background (right) */}
        <div className={cn(
          "flex-1 bg-destructive/20 flex items-center justify-end pr-6 transition-opacity duration-200",
          swipeDistance < -30 ? "opacity-100" : "opacity-0"
        )}>
          <div className="flex items-center gap-2 text-destructive">
            <span className="font-medium">Delete</span>
            <Trash2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main card */}
      <div
        className={cn(
          "relative z-10 transition-transform duration-200 ease-out",
          isDragging ? "cursor-grabbing" : "cursor-grab",
          disabled && "cursor-default"
        )}
        style={{
          transform: `translateX(${swipeDistance}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <EnhancedCard className={cn(
          "bg-card/95 backdrop-blur-sm border border-border/50 shadow-lg",
          "hover:shadow-xl transition-shadow duration-300",
          className
        )}>
          {children}
        </EnhancedCard>
      </div>

      {/* Swipe hints */}
      {!isDragging && swipeDistance === 0 && (
        <div className="absolute inset-x-0 bottom-1 flex justify-center pointer-events-none">
          <div className="bg-muted/50 text-muted-foreground text-xs px-2 py-1 rounded-full">
            ← Swipe to edit • Swipe to delete →
          </div>
        </div>
      )}
    </div>
  );
}