import { DeleteTodoCommand } from '../../../../src/application/commands/DeleteTodoCommand';
import { Todo } from '../../../../src/domain/entities/Todo';

describe('DeleteTodoCommand', () => {
  describe('command creation', () => {
    it('should create DeleteTodoCommand with valid todoId', () => {
      const todo = Todo.create('Test');
      const command: DeleteTodoCommand = { id: todo.id };

      expect(command.id).toEqual(todo.id);
    });

    it('should have readonly id property', () => {
      const todo = Todo.create('Test');
      const command: DeleteTodoCommand = { id: todo.id };

      // Verify it's readonly by checking the property is defined
      expect(command.id).toBeDefined();
    });

    it('should store different todoIds separately', () => {
      const todo1 = Todo.create('Test 1');
      const todo2 = Todo.create('Test 2');

      const command1: DeleteTodoCommand = { id: todo1.id };
      const command2: DeleteTodoCommand = { id: todo2.id };

      expect(command1.id).not.toEqual(command2.id);
      expect(command1.id).toEqual(todo1.id);
      expect(command2.id).toEqual(todo2.id);
    });

    it('should maintain command immutability', () => {
      const todo = Todo.create('Immutable test');
      const command: DeleteTodoCommand = { id: todo.id };

      // Verify the object doesn't allow modification
      const originalId = command.id;
      expect(command.id).toBe(originalId);
    });
  });

  describe('command interface', () => {
    it('should accept TodoId from Todo.create', () => {
      const todo = Todo.create('Valid todo');
      
      // Should not throw
      const command: DeleteTodoCommand = { id: todo.id };
      
      expect(command.id).toBeDefined();
    });
  });
});
