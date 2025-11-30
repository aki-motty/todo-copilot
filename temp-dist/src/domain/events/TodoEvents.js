export const createTodoCreatedEvent = (id, title, createdAt) => ({
  aggregateId: id,
  aggregateType: "Todo",
  eventType: "TodoCreated",
  timestamp: new Date(),
  data: {
    title,
    createdAt: createdAt.toISOString(),
  },
});
export const createTodoCompletedEvent = (id, status, changedAt) => ({
  aggregateId: id,
  aggregateType: "Todo",
  eventType: status === "Completed" ? "TodoCompleted" : "TodoUncompleted",
  timestamp: new Date(),
  data: {
    status,
    changedAt: changedAt.toISOString(),
  },
});
export const createTodoDeletedEvent = (id, deletedAt) => ({
  aggregateId: id,
  aggregateType: "Todo",
  eventType: "TodoDeleted",
  timestamp: new Date(),
  data: {
    deletedAt: deletedAt.toISOString(),
  },
});
