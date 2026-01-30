/**
 * Utility functions for ticket-related operations
 */

/**
 * Returns the CSS classes for priority styling based on the priority level
 * @param priority - The priority level (High, Medium, Low, etc.)
 * @returns CSS classes string for priority styling
 */
export const getPriorityColor = (priority: string): string => {
  switch (priority) {
    // case 'High':
    //   return 'text-red-600 bg-red-50 border-red-200';
    // case 'Medium':
    //   return 'text-orange-600 bg-orange-50 border-orange-200';
    // case 'Low':
    //   return 'text-green-600 bg-green-50 border-green-200';
    default:
      return 'font-normal text-neutral-grayscale-50 bg-neutral-grayscale-20';
  }
};

/**
 * Returns the CSS classes for status styling based on the status
 * @param status - The status (Done, In Progress, To Do, etc.)
 * @returns CSS classes string for status styling
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    // case 'Done':
    //   return 'text-green-600 bg-green-50 border-green-200';
    // case 'In Progress':
    //   return 'text-blue-600 bg-blue-50 border-blue-200';
    // case 'To Do':
    //   return 'text-slate-600 bg-slate-50 border-slate-200';
    default:
      return 'font-normal text-neutral-grayscale-50 bg-neutral-grayscale-20';
  }
};

/**
 * Returns the CSS classes for priority styling specifically for chip components
 * @param priority - The priority level (High, Medium, Low, etc.)
 * @returns CSS classes string for chip priority styling
 */
export const getPriorityColorForChips = (priority: string): string => {
  switch (priority) {
    case 'High':
      return 'border-red-200 bg-red-50 text-red-700';
    case 'Medium':
      return 'border-orange-200 bg-orange-50 text-orange-700';
    case 'Low':
      return 'border-green-200 bg-green-50 text-green-700';
    default:
      return 'border-white bg-white text-neutral-grayscale-50';
  }
};
