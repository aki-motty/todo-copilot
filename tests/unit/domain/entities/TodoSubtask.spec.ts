import { Todo } from "../../../../src/domain/entities/Todo";

describe("Todo Entity - Subtask Operations", () => {
  it("should add a subtask", () => {
    const todo = Todo.create("Parent Task");
    const todoWithSubtask = todo.addSubtask("Subtask 1");

    expect(todoWithSubtask.subtasks).toHaveLength(1);
    expect(todoWithSubtask.subtasks[0]?.title.value).toBe("Subtask 1");
    expect(todoWithSubtask.subtasks[0]?.parentId).toBe(todo.id);
  });

  it("should remove a subtask", () => {
    let todo = Todo.create("Parent Task");
    todo = todo.addSubtask("Subtask 1");
    const subtaskId = todo.subtasks[0]?.id;
    if (!subtaskId) {
      throw new Error("Subtask not created");
    }

    const todoWithoutSubtask = todo.removeSubtask(subtaskId);

    expect(todoWithoutSubtask.subtasks).toHaveLength(0);
  });

  it("should toggle a subtask", () => {
    let todo = Todo.create("Parent Task");
    todo = todo.addSubtask("Subtask 1");
    const subtaskId = todo.subtasks[0]?.id;
    if (!subtaskId) {
      throw new Error("Subtask not created");
    }

    const todoToggled = todo.toggleSubtask(subtaskId);

    expect(todoToggled.subtasks[0]?.completed).toBe(true);
  });

  it("should toggle parent completion independently of subtasks", () => {
    let todo = Todo.create("Parent Task");
    todo = todo.addSubtask("Subtask 1");
    todo = todo.addSubtask("Subtask 2");

    // Toggle parent to completed
    const completedTodo = todo.toggleCompletion();

    // Parent is completed but subtasks remain unchanged
    expect(completedTodo.completed).toBe(true);
    expect(completedTodo.subtasks[0]?.completed).toBe(false);
    expect(completedTodo.subtasks[1]?.completed).toBe(false);
  });

  it("should keep subtask state when parent is toggled", () => {
    let todo = Todo.create("Parent Task");
    todo = todo.addSubtask("Subtask 1");

    // Manually complete the subtask first
    const subtaskId = todo.subtasks[0]?.id;
    if (!subtaskId) {
      throw new Error("Subtask not created");
    }
    const todoWithCompletedSubtask = todo.toggleSubtask(subtaskId);
    expect(todoWithCompletedSubtask.subtasks[0]?.completed).toBe(true);

    // Toggle parent to completed
    const completedTodo = todoWithCompletedSubtask.toggleCompletion();
    expect(completedTodo.completed).toBe(true);
    expect(completedTodo.subtasks[0]?.completed).toBe(true);

    // Unmark parent
    const pendingTodo = completedTodo.toggleCompletion();

    expect(pendingTodo.completed).toBe(false);
    // Subtask should remain completed
    expect(pendingTodo.subtasks[0]?.completed).toBe(true);
  });
});
