import { Subtask } from "../../../../src/domain/entities/Subtask";
import type { TodoId } from "../../../../src/domain/value-objects/TodoId";

describe("Subtask Entity", () => {
  const parentId = "parent-id" as TodoId;

  it("should create a new subtask", () => {
    const title = "Test Subtask";
    const subtask = Subtask.create(title, parentId);

    expect(subtask.id).toBeDefined();
    expect(subtask.title.value).toBe(title);
    expect(subtask.completed).toBe(false);
    expect(subtask.parentId).toBe(parentId);
  });

  it("should toggle completion status", () => {
    const subtask = Subtask.create("Test", parentId);

    const toggled = subtask.toggleCompletion();
    expect(toggled.completed).toBe(true);
    expect(toggled.id).toBe(subtask.id);

    const toggledBack = toggled.toggleCompletion();
    expect(toggledBack.completed).toBe(false);
  });

  it("should mark as completed", () => {
    const subtask = Subtask.create("Test", parentId);

    const completed = subtask.markCompleted();
    expect(completed.completed).toBe(true);

    const alreadyCompleted = completed.markCompleted();
    expect(alreadyCompleted.completed).toBe(true);
  });

  it("should recreate from persistence", () => {
    const id = "existing-id";
    const title = "Existing Subtask";
    const completed = true;

    const subtask = Subtask.fromPersistence(id, title, completed, parentId);

    expect(subtask.id).toBe(id);
    expect(subtask.title.value).toBe(title);
    expect(subtask.completed).toBe(completed);
    expect(subtask.parentId).toBe(parentId);
  });

  it("should serialize to JSON", () => {
    const subtask = Subtask.create("Test", parentId);
    const json = subtask.toJSON();

    expect(json).toEqual({
      id: subtask.id,
      title: "Test",
      completed: false,
      parentId: parentId,
    });
  });
});
