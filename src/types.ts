/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ParsedTask {
  id?: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  urgencyScore?: number; // 1-10
  effortScore?: number;  // 1-10
  recommendedDurationMinutes: number;
  dueApproximate?: string;
  actionType?: 'email' | 'document' | 'checklist' | 'calendar' | string;
  timeBlock?: string; // Specific time suggestions e.g., "Monday 3:00 PM"
  status?: 'needsAction' | 'completed';
}

export interface CalendarSuggestion {
  title: string;
  startTime: string; // ISO String
  endTime: string;   // ISO String
  description: string;
}

export interface ActionDraft {
  id: string;
  taskTitle: string;
  actionType: 'email' | 'document' | 'checklist';
  draftTitle: string;
  draftContent: string;
}

export interface AssistantResponse {
  tasks: ParsedTask[];
  schedulingSuggestions: CalendarSuggestion[];
  suggestedActionDrafts: ActionDraft[];
  summary: string;
  insight?: string; // Motivating insight requested
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
}

export interface GoogleTask {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
}
