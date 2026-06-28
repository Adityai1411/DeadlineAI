/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleCalendarEvent, GoogleTask } from '../types';

/**
 * Fetch calendar events for busy slot analysis
 */
export const fetchCalendarEvents = async (accessToken: string): Promise<GoogleCalendarEvent[]> => {
  try {
    const timeMin = new Date();
    timeMin.setHours(0, 0, 0, 0); // Start of today

    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
      timeMin.toISOString()
    )}&maxResults=100&orderBy=startTime&singleEvents=true`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Calendar API returned error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Failed to fetch calendar events:', error);
    throw error;
  }
};

/**
 * Create a calendar event (e.g., auto-scheduled focus block)
 */
export const createCalendarEvent = async (
  accessToken: string,
  event: { title: string; startTime: string; endTime: string; description: string }
): Promise<GoogleCalendarEvent> => {
  try {
    const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
    const body = {
      summary: event.title,
      description: event.description,
      start: {
        dateTime: event.startTime,
      },
      end: {
        dateTime: event.endTime,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Calendar API returned error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to create calendar event:', error);
    throw error;
  }
};

/**
 * Fetch tasks from default Google Task list
 */
export const fetchGoogleTasks = async (accessToken: string): Promise<GoogleTask[]> => {
  try {
    const url = 'https://www.googleapis.com/tasks/v1/lists/@default/tasks';
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Tasks API returned error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Failed to fetch Google Tasks:', error);
    throw error;
  }
};

/**
 * Create a new task in Google Tasks
 */
export const createGoogleTask = async (
  accessToken: string,
  task: { title: string; notes?: string; due?: string }
): Promise<GoogleTask> => {
  try {
    const url = 'https://www.googleapis.com/tasks/v1/lists/@default/tasks';
    const body = {
      title: task.title,
      notes: task.notes || '',
      due: task.due || undefined,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Tasks API returned error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to create Google Task:', error);
    throw error;
  }
};

/**
 * Toggle task completion status in Google Tasks
 */
export const updateGoogleTaskStatus = async (
  accessToken: string,
  taskId: string,
  completed: boolean
): Promise<GoogleTask> => {
  try {
    const url = `https://www.googleapis.com/tasks/v1/lists/@default/tasks/${taskId}`;
    const body = {
      id: taskId,
      status: completed ? 'completed' : 'needsAction',
    };

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Tasks API returned error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to update Google Task status:', error);
    throw error;
  }
};
