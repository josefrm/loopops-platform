import { Copy, Download, Trash } from 'lucide-react';
import { ToolbarAction } from './FileEditor';
import { AddTaskIcon } from './icons/AddTaskIcon';
import { LoopOpsIcon } from './icons/LoopOpsIcon';

// Mindspace-specific toolbar actions
export const getMindspaceToolbarActions = (
  onSave?: () => void,
  isSaving?: boolean,
  onConvertToDeliverable?: () => void,
  onDownload?: () => void,
  onCopy?: () => void,
  canCopy?: boolean,
): ToolbarAction[] => {
  const actions: ToolbarAction[] = [
    {
      id: 'toolbar-plugin',
      label: 'Formatting Toolbar',
      onClick: () => {}, // No onClick needed for toolbar plugin
      component: 'toolbar-plugin',
      position: 'start',
    },
    {
      id: 'convertToDeliverable',
      icon: <AddTaskIcon width={24} />,
      label: 'Convert To Deliverable',
      onClick:
        onConvertToDeliverable || (() => console.log('Convert To Deliverable')),
      component: 'icon',
    },
    {
      id: 'download',
      icon: <Download size={24} />,
      label: 'Download',
      onClick: onDownload || (() => console.log('Download')),
      component: 'icon',
    },
  ];

  if (canCopy) {
    actions.push({
      id: 'copy',
      icon: <Copy size={24} fill="currentColor" />,
      label: 'Copy',
      onClick: onCopy || (() => console.log('Copy')),
      component: 'icon',
    });
  }

  actions.push(
    {
      id: 'startLoop',
      icon: <LoopOpsIcon width={24} />,
      label: 'Start Loop',
      onClick: () => console.log('Start Loop'),
      component: 'icon',
      buttonClassName: 'ml-loop-5',
    },
    {
      id: 'save',
      text: isSaving ? 'Saving...' : 'Save',
      label: isSaving ? 'Saving...' : 'Save',
      onClick: onSave || (() => console.log('Save')),
      component: 'button',
      type: 'default',
      size: 'md',
      disabled: isSaving,
    },
  );

  return actions;
};

// ProjectContext-specific toolbar actions
export const getProjectContextToolbarActions = (): ToolbarAction[] => [
  {
    id: 'exportContext',
    icon: <Download />,
    label: 'Export Context',
    onClick: () => console.log('Export Context:'),
    component: 'icon',
  },
  {
    id: 'copyContext',
    icon: <Copy />,
    label: 'Copy to Context',
    onClick: () => console.log('Copy to Context:'),
    component: 'icon',
  },
  {
    id: 'shareContext',
    icon: <LoopOpsIcon />,
    label: 'Share Context',
    onClick: () => console.log('Share Context:'),
    component: 'icon',
  },
  {
    id: 'deleteContext',
    icon: <Trash className="fill-current" />,
    label: 'Delete Context',
    onClick: () => console.log('Delete Context:'),
    component: 'icon',
  },
  {
    id: 'generateSummary',
    text: 'Go to the next stage',
    label: 'Go to the next stage',
    onClick: () => console.log('Go to the next stage:'),
    component: 'button',
    type: 'default',
    buttonClassName: '!w-[186px] !min-w-[186px] !max-w-[186px]',
  },
];
