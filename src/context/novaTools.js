// Anthropic Tool Use definitions for Nova secretary assistant
// Each tool maps to an action that executeAction() handles in ChatContext

export const NOVA_TOOLS = [
  // === EVENTS ===
  {
    name: "create_event",
    description: "Create a new calendar event.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Event name" },
        date: { type: "string", description: "YYYY-MM-DD" },
        startTime: { type: "string", description: "HH:MM in 24-hour format" },
        duration: { type: "number", description: "Duration in minutes (default 60)" },
        location: { type: "string", description: "Location if mentioned" },
        description: { type: "string", description: "Description if mentioned" },
        response: { type: "string", description: "Friendly message to show the user" }
      },
      required: ["title", "date", "startTime", "response"]
    }
  },
  {
    name: "delete_event",
    description: "Delete/cancel a calendar event.",
    input_schema: {
      type: "object",
      properties: {
        eventTitle: { type: "string", description: "Event name (fuzzy matched)" },
        date: { type: "string", description: "YYYY-MM-DD to help find the right event" },
        response: { type: "string", description: "Confirmation message" }
      },
      required: ["eventTitle", "response"]
    }
  },
  {
    name: "reschedule_event",
    description: "Move an event to a new time/date. Use timeShift for relative changes like 'push back 1 hour'.",
    input_schema: {
      type: "object",
      properties: {
        eventTitle: { type: "string", description: "Event name (fuzzy matched)" },
        date: { type: "string", description: "YYYY-MM-DD current date of the event" },
        newDate: { type: "string", description: "YYYY-MM-DD target date (null to keep same day)" },
        newStartTime: { type: "string", description: "HH:MM new start time (null to keep same)" },
        newDuration: { type: "number", description: "New duration in minutes (null to keep same)" },
        timeShift: { type: "number", description: "Minutes to shift (+60 = 1hr later, -30 = 30min earlier). Use for 'push back', 'move later/earlier'." },
        response: { type: "string", description: "Confirmation message" }
      },
      required: ["eventTitle", "response"]
    }
  },
  {
    name: "update_event",
    description: "Update event details (title, location, description) without changing time.",
    input_schema: {
      type: "object",
      properties: {
        eventTitle: { type: "string", description: "Event name (fuzzy matched)" },
        date: { type: "string", description: "YYYY-MM-DD to help find the right event" },
        updates: {
          type: "object",
          properties: {
            title: { type: "string" },
            location: { type: "string" },
            description: { type: "string" }
          }
        },
        response: { type: "string", description: "Confirmation message" }
      },
      required: ["eventTitle", "updates", "response"]
    }
  },
  {
    name: "clear_day",
    description: "Clear/delete all events on a given day. Always set confirm=false to ask user first.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "YYYY-MM-DD" },
        confirm: { type: "boolean", description: "Always false — app will ask for confirmation" },
        response: { type: "string", description: "Message asking user to confirm" }
      },
      required: ["date", "response"]
    }
  },

  // === RECURRING EVENTS ===
  {
    name: "create_recurring_event",
    description: "Create a recurring calendar event.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        date: { type: "string", description: "YYYY-MM-DD first occurrence" },
        startTime: { type: "string", description: "HH:MM 24-hour" },
        duration: { type: "number", description: "Minutes (default 60)" },
        location: { type: "string" },
        description: { type: "string" },
        recurrence: {
          type: "object",
          properties: {
            frequency: { type: "string", enum: ["daily", "weekly", "monthly"] },
            interval: { type: "number", description: "Repeat every N periods (default 1)" },
            daysOfWeek: { type: "array", items: { type: "string", enum: ["MO","TU","WE","TH","FR","SA","SU"] } },
            until: { type: "string", description: "YYYY-MM-DD end date, or null for indefinite" }
          },
          required: ["frequency"]
        },
        response: { type: "string" }
      },
      required: ["title", "date", "startTime", "recurrence", "response"]
    }
  },
  {
    name: "edit_recurring_event",
    description: "Edit a recurring event. If editScope is omitted, app will ask user.",
    input_schema: {
      type: "object",
      properties: {
        eventTitle: { type: "string" },
        date: { type: "string", description: "YYYY-MM-DD of the instance" },
        editScope: { type: "string", enum: ["single", "all"], description: "Omit to ask user" },
        updates: { type: "object" },
        response: { type: "string" }
      },
      required: ["eventTitle", "response"]
    }
  },
  {
    name: "delete_recurring_event",
    description: "Delete a recurring event. If deleteScope is omitted, app will ask user.",
    input_schema: {
      type: "object",
      properties: {
        eventTitle: { type: "string" },
        date: { type: "string", description: "YYYY-MM-DD of the instance" },
        deleteScope: { type: "string", enum: ["single", "all"], description: "Omit to ask user" },
        response: { type: "string" }
      },
      required: ["eventTitle", "response"]
    }
  },
  {
    name: "ask_recurring_scope",
    description: "Ask user whether to apply change to single instance or all occurrences.",
    input_schema: {
      type: "object",
      properties: {
        eventTitle: { type: "string" },
        date: { type: "string", description: "YYYY-MM-DD" },
        operation: { type: "string", enum: ["edit", "delete"] },
        updates: { type: "object", description: "Updates to apply (for edit operation)" },
        response: { type: "string", description: "Question asking user about scope" }
      },
      required: ["eventTitle", "operation", "response"]
    }
  },

  // === TASKS ===
  {
    name: "add_task",
    description: "Add a new task.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        type: { type: "string", enum: ["general", "due"], description: "general = no due date, due = has due date" },
        dueDate: { type: "string", description: "YYYY-MM-DD (required if type is 'due')" },
        priority: { type: "string", enum: ["urgent", "high", "medium", "low"], description: "Task priority level" },
        description: { type: "string" },
        response: { type: "string" }
      },
      required: ["title", "type", "response"]
    }
  },
  {
    name: "edit_task",
    description: "Edit an existing task's title, due date, description, or type.",
    input_schema: {
      type: "object",
      properties: {
        taskTitle: { type: "string", description: "Current task name (fuzzy matched)" },
        updates: {
          type: "object",
          properties: {
            title: { type: "string" },
            dueDate: { type: "string" },
            description: { type: "string" },
            type: { type: "string", enum: ["general", "due"] }
          }
        },
        response: { type: "string" }
      },
      required: ["taskTitle", "updates", "response"]
    }
  },
  {
    name: "complete_task",
    description: "Mark a task as completed.",
    input_schema: {
      type: "object",
      properties: {
        taskTitle: { type: "string", description: "Task name (fuzzy matched)" },
        response: { type: "string" }
      },
      required: ["taskTitle", "response"]
    }
  },
  {
    name: "uncomplete_task",
    description: "Mark a completed task as incomplete again.",
    input_schema: {
      type: "object",
      properties: {
        taskTitle: { type: "string", description: "Task name (fuzzy matched)" },
        response: { type: "string" }
      },
      required: ["taskTitle", "response"]
    }
  },
  {
    name: "delete_task",
    description: "Delete a task permanently.",
    input_schema: {
      type: "object",
      properties: {
        taskTitle: { type: "string", description: "Task name (fuzzy matched)" },
        response: { type: "string" }
      },
      required: ["taskTitle", "response"]
    }
  },
  {
    name: "bulk_delete_tasks",
    description: "Delete multiple tasks by filter (completed, overdue, or all).",
    input_schema: {
      type: "object",
      properties: {
        filter: { type: "string", enum: ["completed", "overdue", "all"] },
        response: { type: "string" }
      },
      required: ["filter", "response"]
    }
  },
  {
    name: "delete_duplicate_tasks",
    description: "Find and remove duplicate tasks.",
    input_schema: {
      type: "object",
      properties: {
        response: { type: "string" }
      },
      required: ["response"]
    }
  },
  {
    name: "query_tasks",
    description: "List/query tasks by filter.",
    input_schema: {
      type: "object",
      properties: {
        filter: { type: "string", enum: ["all", "general", "due", "overdue", "today", "completed"] },
        response: { type: "string" }
      },
      required: ["filter", "response"]
    }
  },
  {
    name: "ask_task_type",
    description: "Ask user whether a task is general (no deadline) or has a due date.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        response: { type: "string", description: "Question asking about task type" }
      },
      required: ["title", "response"]
    }
  },

  // === QUERIES ===
  {
    name: "check_schedule",
    description: "Show schedule for a specific day.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "YYYY-MM-DD" },
        response: { type: "string" }
      },
      required: ["date", "response"]
    }
  },
  {
    name: "check_week_schedule",
    description: "Show schedule for the week starting from a date.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "YYYY-MM-DD start of week" },
        response: { type: "string" }
      },
      required: ["date", "response"]
    }
  },
  {
    name: "check_availability",
    description: "Check if a specific time slot is free.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "YYYY-MM-DD" },
        time: { type: "string", description: "HH:MM 24-hour" },
        duration: { type: "number", description: "Minutes to check (default 60)" },
        response: { type: "string" }
      },
      required: ["date", "time", "response"]
    }
  },
  {
    name: "find_free_time",
    description: "Find available time slots on a given day.",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "YYYY-MM-DD" },
        duration: { type: "number", description: "Minimum slot duration in minutes (default 30)" },
        response: { type: "string" }
      },
      required: ["date", "response"]
    }
  },

  // === ASK FOR INFO ===
  {
    name: "ask_missing_info",
    description: "Ask user for missing event details (date, time, or duration).",
    input_schema: {
      type: "object",
      properties: {
        eventDetails: {
          type: "object",
          properties: {
            title: { type: "string" },
            date: { type: "string" },
            startTime: { type: "string" },
            duration: { type: "number" },
            location: { type: "string" },
            description: { type: "string" }
          }
        },
        missing: {
          type: "array",
          items: { type: "string", enum: ["date", "time", "duration"] },
          description: "Which fields are missing"
        },
        response: { type: "string", description: "Question asking for the missing info" }
      },
      required: ["eventDetails", "missing", "response"]
    }
  },
  {
    name: "ask_time",
    description: "Ask user what time they want for an event.",
    input_schema: {
      type: "object",
      properties: {
        eventDetails: {
          type: "object",
          properties: {
            title: { type: "string" },
            date: { type: "string" },
            duration: { type: "number" },
            location: { type: "string" }
          }
        },
        response: { type: "string" }
      },
      required: ["eventDetails", "response"]
    }
  },
  {
    name: "ask_ampm",
    description: "REQUIRED: When user gives a time between 6-11 without specifying AM/PM, use this tool to clarify. Never assume AM or PM for times 6-11.",
    input_schema: {
      type: "object",
      properties: {
        time: { type: "string", description: "The ambiguous time like '9:00'" },
        eventDetails: {
          type: "object",
          properties: {
            title: { type: "string" },
            date: { type: "string" },
            duration: { type: "number" },
            location: { type: "string" }
          }
        },
        response: { type: "string", description: "Question asking AM or PM" }
      },
      required: ["time", "eventDetails", "response"]
    }
  },
  {
    name: "ask_duration",
    description: "Ask user how long an event should be.",
    input_schema: {
      type: "object",
      properties: {
        eventDetails: {
          type: "object",
          properties: {
            title: { type: "string" },
            date: { type: "string" },
            startTime: { type: "string" },
            location: { type: "string" }
          }
        },
        response: { type: "string" }
      },
      required: ["eventDetails", "response"]
    }
  },
  {
    name: "ask_event_name",
    description: "Ask user for an event name when not provided.",
    input_schema: {
      type: "object",
      properties: {
        partialDetails: {
          type: "object",
          properties: {
            date: { type: "string" },
            startTime: { type: "string" },
            duration: { type: "number" },
            location: { type: "string" }
          }
        },
        response: { type: "string" }
      },
      required: ["response"]
    }
  },

  // === OTHER ===
  {
    name: "add_rule",
    description: "Add a behavioral rule that Nova should follow going forward.",
    input_schema: {
      type: "object",
      properties: {
        rule: { type: "string", description: "The rule to remember" },
        response: { type: "string" }
      },
      required: ["rule", "response"]
    }
  }
]
