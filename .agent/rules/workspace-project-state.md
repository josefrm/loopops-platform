---
trigger: always_on
---

---

name: workspace_project_state
description: Rules for accessing workspace, project, and stage state

---

# Workspace & Project State Management

## Single Source of Truth

All workspace, project, and stage state should come from the **unified Zustand store** in `src/stores/workspaceProjectStore.ts`.

## ✅ DO - Use These Patterns

### Accessing Current Workspace

```typescript
import { useCurrentWorkspace } from '@/hooks/useCurrentWorkspace';

// In component
const workspace = useCurrentWorkspace();
```

Or directly from store:

```typescript
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';

const currentWorkspace = useWorkspaceProjectStore((state) =>
  state.getCurrentWorkspace(),
);
const workspaceId = useWorkspaceProjectStore(
  (state) => state.currentWorkspaceId,
);
```

### Accessing Current Project

```typescript
import { useCurrentProject } from '@/hooks/useCurrentProject';

// In component
const project = useCurrentProject();
```

Or directly from store:

```typescript
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';

const currentProject = useWorkspaceProjectStore((state) =>
  state.getCurrentProject(),
);
const projectId = useWorkspaceProjectStore((state) => state.currentProjectId);
```

### Accessing Current Stage

```typescript
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';

const currentStage = useWorkspaceProjectStore((state) =>
  state.getCurrentStage(),
);
const stageId = useWorkspaceProjectStore((state) => state.currentStageId);
```

### Switching Workspace/Project

```typescript
import { useWorkspaceProjectStore } from '@/stores/workspaceProjectStore';

const setCurrentWorkspaceId = useWorkspaceProjectStore(
  (state) => state.setCurrentWorkspaceId,
);
const setCurrentProjectId = useWorkspaceProjectStore(
  (state) => state.setCurrentProjectId,
);

// Then call
setCurrentWorkspaceId(newWorkspaceId);
setCurrentProjectId(newProjectId);
```

### Data Fetching

Use the React Query hooks that auto-sync with the store:

```typescript
import {
  useWorkspacesQuery,
  useProjectsQuery,
  useStagesQuery,
  useCreateProjectMutation,
} from '@/queries/workspaceProjectQueries';

// These hooks fetch data AND populate the store
const { isLoading: workspacesLoading } = useWorkspacesQuery();
const { isLoading: projectsLoading } = useProjectsQuery();
const { isLoading: stagesLoading } = useStagesQuery();
```

---

## 🚫 DON'T - Avoid These Deprecated Patterns

### ❌ Don't use WorkspaceContext

```typescript
// DEPRECATED - Do not use
import { useWorkspace } from '@/contexts/WorkspaceContext';
const { currentWorkspace, availableWorkspaces, switchWorkspace } =
  useWorkspace();
```

### ❌ Don't use ProjectContext

```typescript
// DEPRECATED - Do not use
import { useProject } from '@/contexts/ProjectContext';
const { selectedProject, availableProjects, switchProject } = useProject();
```

### ❌ Don't use projectContextStore

```typescript
// DEPRECATED - Do not use
import { useProjectContextStore } from '@/stores/projectContextStore';
```

### ❌ Don't use sessionStore for workspace

```typescript
// DEPRECATED for workspace - Do not use
import { useSessionStore } from '@/features/chat/stores/sessionStore';
const currentWorkspace = useSessionStore((state) => state.currentWorkspace);
```

### ❌ Don't use useSyncProjectContext

```typescript
// DEPRECATED - No longer needed
import { useSyncProjectContext } from '@/hooks/useSyncProjectContext';
```

---

## Migration Reference

| Deprecated                           | New                                                            |
| ------------------------------------ | -------------------------------------------------------------- |
| `useWorkspace().currentWorkspace`    | `useCurrentWorkspace()`                                        |
| `useWorkspace().availableWorkspaces` | `useWorkspaceProjectStore((s) => s.workspaces)`                |
| `useWorkspace().switchWorkspace(id)` | `useWorkspaceProjectStore((s) => s.setCurrentWorkspaceId)(id)` |
| `useProject().selectedProject`       | `useCurrentProject()`                                          |
| `useProject().availableProjects`     | `useWorkspaceProjectStore((s) => s.projects)`                  |
| `useProjectContextStore`             | `useWorkspaceProjectStore`                                     |
| `sessionStore.currentWorkspace`      | `useWorkspaceProjectStore`                                     |

---

## Key Files

- **Store**: `src/stores/workspaceProjectStore.ts`
- **Queries**: `src/queries/workspaceProjectQueries.ts`
- **Workspace hooks**: `src/hooks/useCurrentWorkspace.ts`
- **Project hooks**: `src/hooks/useCurrentProject.ts`
- **Workspace ID hook**: `src/hooks/useWorkspaceId.ts`
