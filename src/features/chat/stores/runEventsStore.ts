import { create } from 'zustand';
import { RunEvent } from '@/components/chat/RunStatusTimeline';

interface RunEventsState {
  // Eventos por sessionId
  eventsBySession: Record<string, RunEvent[]>;
  
  // Tiempo de inicio por sessionId
  startTimeBySession: Record<string, number>;
  
  // Estado de ejecución por sessionId
  isRunningBySession: Record<string, boolean>;
}

interface RunEventsActions {
  // Agregar un evento
  addEvent: (sessionId: string, event: RunEvent) => void;
  
  // Limpiar eventos de una sesión
  clearEvents: (sessionId: string) => void;
  
  // Limpiar todos los eventos (para cambio de proyecto o logout)
  clearAllEvents: () => void;
  
  // Marcar inicio de run
  startRun: (sessionId: string) => void;
  
  // Marcar fin de run
  endRun: (sessionId: string) => void;
  
  // Obtener eventos
  getEvents: (sessionId: string) => RunEvent[];
  
  // Obtener tiempo de inicio
  getStartTime: (sessionId: string) => number | undefined;
  
  // Verificar si está corriendo
  isRunning: (sessionId: string) => boolean;
}

type RunEventsStore = RunEventsState & RunEventsActions;

export const useRunEventsStore = create<RunEventsStore>((set, get) => ({
  // Estado inicial
  eventsBySession: {},
  startTimeBySession: {},
  isRunningBySession: {},

  // Agregar evento
  addEvent: (sessionId, event) =>
    set((state) => {
      const existingEvents = state.eventsBySession[sessionId] || [];
      const isFirstEvent = existingEvents.length === 0;
      
      return {
        eventsBySession: {
          ...state.eventsBySession,
          [sessionId]: [...existingEvents, event],
        },
        startTimeBySession: isFirstEvent && event.timestamp
          ? {
              ...state.startTimeBySession,
              [sessionId]: event.timestamp,
            }
          : state.startTimeBySession,
      };
    }),

  // Limpiar eventos
  clearEvents: (sessionId) => {
    set((state) => {
      const newEvents = { ...state.eventsBySession };
      const newStartTime = { ...state.startTimeBySession };
      const newRunning = { ...state.isRunningBySession };
      
      delete newEvents[sessionId];
      delete newStartTime[sessionId];
      delete newRunning[sessionId];
      
      return {
        eventsBySession: newEvents,
        startTimeBySession: newStartTime,
        isRunningBySession: newRunning,
      };
    });
  },

  clearAllEvents: () => {
    set({
      eventsBySession: {},
      startTimeBySession: {},
      isRunningBySession: {},
    });
  },

  // Iniciar run
  startRun: (sessionId) => {
    set((state) => {
      const shouldClearEvents = !state.isRunningBySession[sessionId];
      
      return {
        // No setear startTime aquí, dejar que addEvent lo haga con el primer evento
        isRunningBySession: {
          ...state.isRunningBySession,
          [sessionId]: true,
        },
        eventsBySession: shouldClearEvents
          ? {
              ...state.eventsBySession,
              [sessionId]: [],
            }
          : state.eventsBySession,
      };
    });
  },

  // Terminar run
  endRun: (sessionId) => {
    set((state) => ({
      isRunningBySession: {
        ...state.isRunningBySession,
        [sessionId]: false,
      },
    }));
  },

  // Obtener eventos
  getEvents: (sessionId) => {
    return get().eventsBySession[sessionId] || [];
  },

  // Obtener tiempo de inicio
  getStartTime: (sessionId) => {
    return get().startTimeBySession[sessionId];
  },

  // Verificar si está corriendo
  isRunning: (sessionId) => {
    return get().isRunningBySession[sessionId] || false;
  },
}));
