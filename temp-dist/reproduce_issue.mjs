import { Todo } from "./src/domain/entities/Todo";
import { DynamoDBTodoRepository } from "./src/infrastructure/repositories/DynamoDBTodoRepository";
async function main() {
  const repo = new DynamoDBTodoRepository();
  // Create a todo
  let todo = Todo.create("Test Todo with Subtasks");
  todo = todo.addSubtask("Subtask 1");
  todo = todo.addSubtask("Subtask 2");
  console.log("Saving todo:", JSON.stringify(todo.toJSON(), null, 2));
  await repo.save(todo);
  // Clear cache to force reload from DB
  await repo.clear();
  // Initialize from DB
  await repo.initializeFromDynamoDB();
  // Find the todo
  const loadedTodo = await repo.findById(todo.id);
  if (loadedTodo) {
    console.log("Loaded todo:", JSON.stringify(loadedTodo.toJSON(), null, 2));
    if (loadedTodo.subtasks.length === 2) {
      console.log("SUCCESS: Subtasks loaded correctly.");
    } else {
      console.log("FAILURE: Subtasks missing or incorrect count.");
    }
  } else {
    console.log("FAILURE: Todo not found.");
  }
}
main().catch(console.error);
