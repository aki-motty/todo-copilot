import type { TodoId, TodoStatus } from "../entities/Todo";

/**
 * Domain events for Todo aggregate
 * Used for event sourcing and audit trails
 */

export interface DomainEvent {
  aggregateId: TodoId;
  aggregateType: "Todo";
  eventType: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

/**
 * Event fired when a new Todo is created
 */
export interface TodoCreatedEvent extends DomainEvent {
  eventType: "TodoCreated";
  data: {
    title: string;
    createdAt: string;
  };
}

export const createTodoCreatedEvent = (
  id: TodoId,
  title: string,
  createdAt: Date
): TodoCreatedEvent => ({
  aggregateId: id,
  aggregateType: "Todo",
  eventType: "TodoCreated",
  timestamp: new Date(),
  data: {
    title,
    createdAt: createdAt.toISOString(),
  },
});

/**
 * Event fired when a Todo's completion status changes
 */
export interface TodoCompletedEvent extends DomainEvent {
  eventType: "TodoCompleted" | "TodoUncompleted";
  data: {
    status: TodoStatus;
    changedAt: string;
  };
}

export const createTodoCompletedEvent = (
  id: TodoId,
  status: TodoStatus,
  changedAt: Date
): TodoCompletedEvent => ({
  aggregateId: id,
  aggregateType: "Todo",
  eventType: status === "Completed" ? "TodoCompleted" : "TodoUncompleted",
  timestamp: new Date(),
  data: {
    status,
    changedAt: changedAt.toISOString(),
  },
});

/**
 * Event fired when a Todo is deleted
 */
export interface TodoDeletedEvent extends DomainEvent {
  eventType: "TodoDeleted";
  data: {
    deletedAt: string;
  };
}

export const createTodoDeletedEvent = (id: TodoId, deletedAt: Date): TodoDeletedEvent => ({
  aggregateId: id,
  aggregateType: "Todo",
  eventType: "TodoDeleted",
  timestamp: new Date(),
  data: {
    deletedAt: deletedAt.toISOString(),
  },
});
