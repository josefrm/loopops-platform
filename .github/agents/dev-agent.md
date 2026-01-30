# LoopOps Development Agent

A React/TypeScript chat application with AI agents that connects to Supabase backend.

## Project Structure

```
src/
  components/          # Feature components
    ui/               # Atomic UI components (accessible, no side effects)
    chat/             # Chat interface
    agents/           # Agent management
  contexts/           # React context providers
  hooks/              # Custom React hooks (wrappers with context)
  queries/            # React Query hooks (data fetching with caching)
  services/           # Business logic and API calls
  integrations/       # Supabase client and types
  lib/                # Utilities
  models/             # TypeScript types
  pages/              # Top-level pages
```

## Development Commands

```bash
npm run dev        # Start development server
npm run build      # Production build
npm run lint       # ESLint checking
npm run typecheck  # TypeScript validation
```

## Coding Standards

### Architecture Principles

- **UI Components**: Atomic components in `src/components/ui/` - accessible, no data fetching
- **Services**: All Supabase/API calls in `src/services/` - never in React components
- **Queries**: React Query hooks in `src/queries/` for data fetching with caching
- **State**: Use React Context for cross-component state, useState for local state
- **Types**: TypeScript interfaces in `src/models/`, avoid `any` types

### Code Patterns

**Service Layer Pattern**:

```typescript
// src/services/ChatService.ts
export class ChatService {
  static async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    const { data, error } = await supabase.functions.invoke(
      'chat-with-agents',
      {
        body: request,
      },
    );
    if (error) throw new Error(`Chat error: ${error.message}`);
    return data;
  }
}
```

**React Query Pattern** (for data fetching):

```typescript
// src/queries/mindspaceFilesQueries.ts
import { useQuery } from '@tanstack/react-query';
import { MindspaceFilesService } from '@/services/MindspaceFilesService';

export const mindspaceFilesKeys = {
  all: ['mindspace-files'] as const,
  byWorkspaceProject: (workspaceId: string | undefined, projectId: string | undefined) =>
    [...mindspaceFilesKeys.all, workspaceId, projectId] as const,
};

export const useMindspaceFiles = (
  workspaceId: string | undefined,
  projectId: string | undefined,
) => {
  return useQuery({
    queryKey: mindspaceFilesKeys.byWorkspaceProject(workspaceId, projectId),
    queryFn: async () => {
      if (!workspaceId || !projectId) return [];
      return MindspaceFilesService.getFiles(workspaceId, projectId);
    },
    enabled: !!workspaceId && !!projectId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};
```

**Component Pattern**:

```typescript
// Atomic UI component example
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  onClick?: () => void;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-md transition-colors',
        variant === 'primary'
          ? 'bg-brand-accent-50 text-neutral-grayscale-0'
          : 'bg-neutral-grayscale-20 text-neutral-grayscale-90',
      )}
    >
      {children}
    </button>
  );
};
```

### Design System

- **Colors**: Use design tokens (`bg-neutral-grayscale-0`, `text-brand-accent-50`)
- **Typography**: Use semantic sizes (`text-xs`, `text-sm`, `text-base`, `text-lg`)
- **Spacing**: Use loop system (`gap-loop-4`, `p-loop-6`)
- **No arbitrary values**: Avoid `text-[12px]`, use `text-md` instead

### Error Handling

```typescript
// Component error handling
try {
  const data = await ChatService.sendMessage(request);
  // Handle success
} catch (error) {
  console.error('Error:', error);
  toast({
    title: 'Error',
    description: 'Failed to send message',
    variant: 'destructive',
  });
}
```

### Import Organization

```typescript
// React imports first
import React from 'react';
import { useState, useEffect } from 'react';

// External libraries
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Internal services/hooks
import { ChatService } from '@/services/ChatService';
import { useAuth } from '@/contexts/AuthContext';

// Types (import as type when possible)
import type { ChatRequest } from '@/models/Chat';
```

## Quality Requirements

- ✅ **TypeScript**: No `any` types, proper interfaces
- ✅ **Linting**: ESLint clean (`npm run lint`)
- ✅ **Type Safety**: Pass typecheck (`npm run typecheck`)
- ✅ **Architecture**: Services for API calls, atomic UI components
- ✅ **Accessibility**: Keyboard navigation, ARIA labels, focus management
- ✅ **Design System**: Use design tokens, no arbitrary values
- ✅ **Error Handling**: Graceful failures with user feedback

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS with design system
- **UI Components**: Radix UI primitives
- **State**: React Context, Zustand
- **Data Fetching**: React Query (@tanstack/react-query)
- **Backend**: Supabase (Edge Functions, PostgreSQL)
- **Icons**: Lucide React

## Environment Variables

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```
