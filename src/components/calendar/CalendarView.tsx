import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Video, MapPin, Plus, Users } from 'lucide-react';
import { CalendarEvent, TimeSlot } from '@/types/email';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CreateEventDialog } from './CreateEventDialog';

interface CalendarViewProps {
  events: CalendarEvent[];
  suggestedSlots?: TimeSlot[];
  onCreateEvent?: (item: TimeSlot | Omit<CalendarEvent, 'id'>) => void;
  onEventClick?: (event: CalendarEvent) => void;
}

const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function getEventPosition(event: CalendarEvent): { top: number; height: number } {
  const startHour = event.start.getHours() + event.start.getMinutes() / 60;
  const endHour = event.end.getHours() + event.end.getMinutes() / 60;
  const top = (startHour - 8) * 60; // 60px per hour, starting from 8 AM
  const height = (endHour - startHour) * 60;
  return { top, height: Math.max(height, 30) };
}

function EventCard({ event, onClick }: { event: CalendarEvent; onClick?: () => void }) {
  const { top, height } = getEventPosition(event);
  
  return (
    <div
      onClick={onClick}
      className={cn(
        'absolute left-1 right-1 rounded-md px-2 py-1 cursor-pointer transition-all hover:ring-2 hover:ring-primary/50',
        event.status === 'confirmed' 
          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white' 
          : 'bg-muted border border-dashed border-border'
      )}
      style={{ top: `${top}px`, height: `${height}px` }}
    >
      <div className="text-xs font-medium truncate">{event.title}</div>
      {height >= 50 && (
        <div className="text-xs opacity-80 truncate">
          {formatTime(event.start)} - {formatTime(event.end)}
        </div>
      )}
      {height >= 70 && event.meetingLink && (
        <div className="flex items-center gap-1 text-xs opacity-80 mt-1">
          <Video className="h-3 w-3" />
          <span>Video call</span>
        </div>
      )}
    </div>
  );
}

function TimeSlotSuggestion({ slot, onClick }: { slot: TimeSlot; onClick: () => void }) {
  const { top, height } = getEventPosition({ 
    ...slot, 
    id: '', 
    title: '', 
    attendees: [], 
    status: 'tentative' 
  } as CalendarEvent);
  
  return (
    <div
      onClick={onClick}
      className={cn(
        'absolute left-1 right-1 rounded-md px-2 py-1 cursor-pointer transition-all',
        'bg-gradient-to-r from-violet-500/20 to-indigo-500/20 border-2 border-dashed border-violet-500/50',
        'hover:border-violet-500 hover:bg-violet-500/30'
      )}
      style={{ top: `${top}px`, height: `${height}px` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-violet-600 dark:text-violet-400">
          Suggested
        </span>
        <Badge variant="secondary" className="text-xs bg-violet-500/20 text-violet-600">
          {slot.score}% match
        </Badge>
      </div>
      {height >= 40 && (
        <div className="text-xs text-muted-foreground mt-0.5">
          {formatTime(slot.start)} - {formatTime(slot.end)}
        </div>
      )}
    </div>
  );
}

export function CalendarView({ events, suggestedSlots, onCreateEvent, onEventClick }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  
  const todayEvents = events.filter(event => {
    const eventDate = new Date(event.start);
    return eventDate.toDateString() === selectedDate.toDateString();
  });
  
  const navigateDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };
  
  const isToday = selectedDate.toDateString() === new Date().toDateString();
  
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigateDate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <div className="font-semibold">
              {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            {isToday && <Badge variant="secondary" className="text-xs mt-1">Today</Badge>}
          </div>
          <Button variant="outline" size="icon" onClick={() => navigateDate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
            Today
          </Button>
          <Button 
            size="sm" 
            className="gap-2"
            onClick={() => {
              setSelectedSlot(null);
              setIsCreateDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New Event
          </Button>
        </div>
      </div>
      
      {/* Calendar Grid */}
      <ScrollArea className="flex-1">
        <div className="flex">
          {/* Time Labels */}
          <div className="w-16 flex-shrink-0 border-r border-border">
            {hours.map(hour => (
              <div key={hour} className="h-[60px] pr-2 text-right text-xs text-muted-foreground">
                {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
              </div>
            ))}
          </div>
          
          {/* Events Column */}
          <div className="flex-1 relative" style={{ height: `${hours.length * 60}px` }}>
            {/* Hour Lines */}
            {hours.map(hour => (
              <div 
                key={hour} 
                className="absolute left-0 right-0 border-t border-border"
                style={{ top: `${(hour - 8) * 60}px` }}
              />
            ))}
            
            {/* Current Time Indicator */}
            {isToday && (
              <div 
                className="absolute left-0 right-0 border-t-2 border-red-500 z-10"
                style={{ top: `${(new Date().getHours() + new Date().getMinutes() / 60 - 8) * 60}px` }}
              >
                <div className="absolute -left-1 -top-1.5 w-3 h-3 rounded-full bg-red-500" />
              </div>
            )}
            
            {/* Events */}
            {todayEvents.map(event => (
              <EventCard 
                key={event.id} 
                event={event} 
                onClick={() => onEventClick?.(event)}
              />
            ))}
            
            {/* Suggested Slots */}
            {suggestedSlots?.map((slot, index) => (
              <TimeSlotSuggestion
                key={index}
                slot={slot}
                onClick={() => {
                  if (onCreateEvent) {
                    onCreateEvent(slot);
                  } else {
                    setSelectedSlot(slot);
                    setIsCreateDialogOpen(true);
                  }
                }}
              />
            ))}
          </div>
        </div>
      </ScrollArea>
      
      {/* Quick Stats */}
      <div className="p-4 border-t border-border bg-muted/30">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="text-muted-foreground">{todayEvents.length} meetings</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">
              {Math.round(todayEvents.reduce((acc, e) => acc + (e.end.getTime() - e.start.getTime()) / 3600000, 0))}h scheduled
            </span>
          </div>
          {suggestedSlots && suggestedSlots.length > 0 && (
            <Badge variant="outline" className="gap-1 border-violet-500/50 text-violet-600">
              <Clock className="h-3 w-3" />
              {suggestedSlots.length} suggested slots
            </Badge>
          )}
        </div>
      </div>
      
      <CreateEventDialog 
        isOpen={isCreateDialogOpen}
        onClose={() => {
          setIsCreateDialogOpen(false);
          setSelectedSlot(null);
        }}
        onSave={(eventData) => {
          if (onCreateEvent) {
            // Wait for workspace layer to handle it
            onCreateEvent(eventData as any);
          }
          setIsCreateDialogOpen(false);
        }}
        initialSlot={selectedSlot}
      />
    </div>
  );
}
