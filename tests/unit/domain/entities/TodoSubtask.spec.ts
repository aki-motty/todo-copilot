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

  it("should mark all subtasks as completed when parent is completed", () => {
    let todo = Todo.create("Parent Task");
    todo = todo.addSubtask("Subtask 1");
    todo = todo.addSubtask("Subtask 2");

    // Toggle parent to completed
    const completedTodo = todo.toggleCompletion();

    expect(completedTodo.completed).toBe(true);
    expect(completedTodo.subtasks[0]?.completed).toBe(true);
    expect(completedTodo.subtasks[1]?.completed).toBe(true);
  });

  it("should NOT unmark subtasks when parent is unmarked", () => {
    let todo = Todo.create("Parent Task");
    todo = todo.addSubtask("Subtask 1");

    // Mark parent completed (and subtask)
    const completedTodo = todo.toggleCompletion();
    expect(completedTodo.subtasks[0]?.completed).toBe(true);

    // Unmark parent
    const pendingTodo = completedTodo.toggleCompletion();

    expect(pendingTodo.completed).toBe(false);
    // Subtask should remain completed
    expect(pendingTodo.subtasks[0]?.completed).toBe(true);
  });
});
