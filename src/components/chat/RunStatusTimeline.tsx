import { EventType } from '@/services/streaming/types';
import {
  Brain,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Database,
  Disc,
  FileText,
  Loader,
  Play,
  Webhook,
  Wrench,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

export interface RunEvent {
  type: EventType | string;
  timestamp: number;
  data?: any;
}

interface RunStatusTimelineProps {
  events: RunEvent[];
  isRunning: boolean;
  startTime?: number;
  isTyping?: boolean;
  isCompleted?: boolean;
}

interface AggregatedEvent {
  type: string;
  count: number;
  label: string;
  icon: React.ReactNode;
}

const START_EVENTS = new Set([
  'RunStarted',
  'TeamRunStarted',
  'AgentRunStarted',
]);

const END_EVENTS = new Set([
  'RunCompleted',
  'TeamRunCompleted',
  'AgentRunCompleted',
]);

const isStartOrEndEvent = (eventType: string): boolean => {
  return START_EVENTS.has(eventType) || END_EVENTS.has(eventType);
};

const getEventIcon = (eventType: string): React.ReactNode => {
  const upperType = eventType.toUpperCase();
  const iconClass = 'w-2.5 h-2.5 text-neutral-grayscale-50';

  // Tools
  if (upperType.includes('TOOL')) {
    return <Wrench className={iconClass} />;
  }

  // Reasoning
  if (upperType.includes('REASONING')) {
    return <Brain className={iconClass} />;
  }

  // Memory
  if (upperType.includes('MEMORY')) {
    return <Database className={iconClass} />;
  }

  // Hooks
  if (upperType.includes('HOOK')) {
    return <Webhook className={iconClass} />;
  }

  // Content
  if (upperType.includes('CONTENT')) {
    return <FileText className={iconClass} />;
  }

  // Start events
  if (upperType.includes('STARTED')) {
    return <Play className={iconClass} />;
  }

  // Completed events
  if (upperType.includes('COMPLETED')) {
    return <CheckCircle className={iconClass} />;
  }

  // Default: disc icon for unknown events
  return <Disc className={iconClass} />;
};

const EVENT_LABEL_MAP: Record<string, string> = {
  // Start events
  RunStarted: 'Run Started',
  TeamRunStarted: 'Run Started',
  AgentRunStarted: 'Run Started',
  // End events
  RunCompleted: 'Run Completed',
  TeamRunCompleted: 'Run Completed',
  AgentRunCompleted: 'Run Completed',
  // Tool events
  ToolCallStarted: 'Tools',
  ToolCallCompleted: 'Tools',
  TeamToolCallStarted: 'Tools',
  TeamToolCallCompleted: 'Tools',
  // Reasoning events
  ReasoningStarted: 'Reasoning',
  ReasoningStep: 'Reasoning',
  ReasoningCompleted: 'Reasoning',
  TeamReasoningStarted: 'Reasoning',
  TeamReasoningStep: 'Reasoning',
  TeamReasoningCompleted: 'Reasoning',
  // Memory events
  MemoryUpdateStarted: 'Memory Update',
  MemoryUpdateCompleted: 'Memory Update',
  TeamMemoryUpdateStarted: 'Memory Update',
  TeamMemoryUpdateCompleted: 'Memory Update',
  // Hook events
  PreHookStarted: 'Pre Hook',
  PreHookCompleted: 'Pre Hook',
  TeamPreHookStarted: 'Pre Hook',
  TeamPreHookCompleted: 'Pre Hook',
  PostHookStarted: 'Post Hook',
  PostHookCompleted: 'Post Hook',
  TeamPostHookStarted: 'Post Hook',
  TeamPostHookCompleted: 'Post Hook',
  // Content events
  RunContent: 'Interactions',
  TeamRunContent: 'Interactions',
  AgentRunContent: 'Interactions',
  RunContentCompleted: 'Interactions Completed',
  TeamRunContentCompleted: 'Interactions Completed',
  AgentRunContentCompleted: 'Interactions Completed',
};

const getEventLabel = (eventType: string): string => {
  if (EVENT_LABEL_MAP[eventType]) {
    return EVENT_LABEL_MAP[eventType];
  }

  return eventType
    .replace(/^(Team|Agent)/, '')
    .replace(/([A-Z])/g, ' $1')
    .trim();
};

const aggregateEvents = (
  events: RunEvent[],
): (RunEvent | AggregatedEvent)[] => {
  if (events.length === 0) return [];

  const result: (RunEvent | AggregatedEvent)[] = [];
  const eventGroups = new Map<string, { count: number; type: string }>();

  let startEvent: RunEvent | null = null;
  let endEvent: RunEvent | null = null;

  // Single pass through events
  for (const event of events) {
    const eventType = event.type;

    if (START_EVENTS.has(eventType)) {
      startEvent = event;
    } else if (END_EVENTS.has(eventType)) {
      endEvent = event;
    } else {
      const label = getEventLabel(eventType);
      const existing = eventGroups.get(label);
      if (existing) {
        existing.count++;
      } else {
        eventGroups.set(label, { count: 1, type: eventType });
      }
    }
  }

  // Construir resultado
  if (startEvent) {
    result.push(startEvent);
  }

  // Convertir grupos a eventos agregados
  eventGroups.forEach(({ count, type }, label) => {
    const icon = getEventIcon(type);
    result.push({
      type,
      count,
      label,
      icon,
    });
  });

  if (endEvent) {
    result.push(endEvent);
  }

  return result;
};

const formatDuration = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
};

const getEventStatus = (eventType: string): string => {
  const upperType = eventType.toUpperCase();

  if (upperType.includes('TOOL')) {
    return 'Calling tools...';
  }
  if (upperType.includes('REASONING')) {
    return 'Thinking...';
  }
  if (upperType.includes('MEMORY')) {
    return 'Updating memory...';
  }
  if (upperType.includes('HOOK')) {
    return 'Running hooks...';
  }
  if (upperType.includes('CONTENT')) {
    return 'Processing content...';
  }
  if (upperType.includes('STARTED')) {
    return 'Starting...';
  }

  return 'Working...';
};

export const RunStatusTimeline: React.FC<RunStatusTimelineProps> = ({
  events,
  isRunning,
  startTime,
  isTyping = false,
  isCompleted: isCompletedProp,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [duration, setDuration] = useState(0);

  const aggregated = useMemo(() => aggregateEvents(events), [events]);

  // Use prop if provided, otherwise calculate from events
  const computedIsCompleted = useMemo(
    () => events.some((e) => END_EVENTS.has(e.type)),
    [events],
  );

  // Use prop if provided, otherwise calculate from events
  const isCompleted = isCompletedProp ?? computedIsCompleted;

  const completedDuration = useMemo(() => {
    if (!startTime || !isCompleted || events.length === 0) return 0;

    const lastEventTimestamp = events[events.length - 1].timestamp;
    return lastEventTimestamp - startTime;
  }, [startTime, isCompleted, events]);

  useEffect(() => {
    if (!startTime || isCompleted) return;

    setDuration(Date.now() - startTime);

    const interval = setInterval(() => {
      setDuration(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, isCompleted]);

  const lastEvent = useMemo(
    () => (events.length > 0 ? events[events.length - 1] : null),
    [events],
  );

  const statusText = useMemo(() => {
    const displayDuration = isCompleted ? completedDuration : duration;

    if (isCompleted) return `Worked for ${formatDuration(displayDuration)}`;
    if (isRunning || isTyping) {
      if (lastEvent && !END_EVENTS.has(lastEvent.type)) {
        return getEventStatus(lastEvent.type);
      }
      return 'Working...';
    }
    return 'Run Status';
  }, [
    isCompleted,
    isRunning,
    isTyping,
    duration,
    completedDuration,
    lastEvent,
  ]);

  return (
    <div className="inline-block">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center gap-loop-2 text-left"
      >
        {(isRunning || isTyping) && !isCompleted && (
          <Loader className="w-loop-4 h-loop-4 text-brand-accent-50 animate-spin" />
        )}
        <span className="text-sm font-normal text-neutral-grayscale-40 tracking-[-0.36px]">
          {statusText}
        </span>
        {isCollapsed ? (
          <ChevronDown className="w-loop-4 h-loop-4 text-neutral-grayscale-40" />
        ) : (
          <ChevronUp className="w-loop-4 h-loop-4 text-neutral-grayscale-40" />
        )}
      </button>

      {!isCollapsed && (
        <div className="relative inline-block mt-loop-2">
          <div className="max-h-32 overflow-y-auto scrollbar-hide">
            {aggregated.length === 0 ? (
              <div className="flex items-center gap-loop-2 py-loop-2">
                {(isRunning || isTyping) && (
                  <div className="flex gap-loop-1">
                    <div
                      className="w-loop-2 h-loop-2 bg-brand-accent-50 rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <div
                      className="w-loop-2 h-loop-2 bg-brand-accent-50 rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <div
                      className="w-loop-2 h-loop-2 bg-brand-accent-50 rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                )}
                <span className="text-xs text-neutral-grayscale-40">
                  {isRunning || isTyping
                    ? 'Starting...'
                    : 'Waiting for events...'}
                </span>
              </div>
            ) : (
              <div className="flex flex-col pb-4">
                {aggregated.map((item, index) => {
                  const isAggregated = 'count' in item;
                  const isStartEnd =
                    !isAggregated && isStartOrEndEvent(item.type);

                  if (isStartEnd) {
                    return (
                      <div
                        key={`${item.type}-${index}`}
                        className="text-sm font-normal text-neutral-grayscale-40 mb-loop-2"
                      >
                        {getEventLabel(item.type)}
                      </div>
                    );
                  }

                  if (isAggregated) {
                    return (
                      <div
                        key={`${item.type}-${index}`}
                        className="bg-neutral-grayscale-20 rounded-full px-3 py-1 flex items-center gap-1.5 mb-2.5"
                      >
                        {item.icon}
                        <span className="text-sm font-normal text-neutral-grayscale-50 leading-[13.3px]">
                          {item.count > 1
                            ? `${item.count} ${item.label}`
                            : item.label}
                        </span>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            )}
          </div>
          {/* Fade gradient indicator for scrollable content */}
          <div
            className="absolute bottom-0 left-0 right-0 h-6 pointer-events-none"
            style={{
              background:
                'linear-gradient(to bottom, transparent, var(--neutral-grayscale-0, #ffffff))',
            }}
          />
        </div>
      )}
    </div>
  );
};
