import { createLogger } from "../../infrastructure/config/logger";
/**
 * Controller for Todo presentation layer
 * Bridges UI components with application service
 * Handles HTTP-like operations for React components
 */
export class TodoController {
    constructor(applicationService) {
        this.applicationService = applicationService;
        this.logger = createLogger("TodoController");
    }
    /**
     * Create a new todo
     */
    async createTodo(title) {
        try {
            this.logger.debug("Controller: createTodo", { title });
            const command = { title };
            const todo = await this.applicationService.createTodo(command);
            return todo.toJSON();
        }
        catch (error) {
            this.logger.error("Controller: createTodo failed", error);
            throw error;
        }
    }
    /**
     * Get all todos
     */
    async getAllTodos() {
        try {
            this.logger.debug("Controller: getAllTodos");
            const query = {};
            const response = await this.applicationService.getAllTodos(query);
            return response.todos.map((todo) => todo.toJSON());
        }
        catch (error) {
            this.logger.error("Controller: getAllTodos failed", error);
            throw error;
        }
    }
    /**
     * Toggle todo completion
     */
    async toggleTodoCompletion(id) {
        try {
            this.logger.debug("Controller: toggleTodoCompletion", { id });
            const command = { id };
            const todo = await this.applicationService.toggleTodoCompletion(command);
            return todo.toJSON();
        }
        catch (error) {
            this.logger.error("Controller: toggleTodoCompletion failed", error);
            throw error;
        }
    }
    /**
     * Add a subtask to a todo
     */
    async addSubtask(todoId, title) {
        try {
            this.logger.debug("Controller: addSubtask", { todoId, title });
            const todo = await this.applicationService.addSubtask(todoId, title);
            return todo.toJSON();
        }
        catch (error) {
            this.logger.error("Controller: addSubtask failed", error);
            throw error;
        }
    }
    /**
     * Toggle a subtask
     */
    async toggleSubtask(todoId, subtaskId) {
        try {
            this.logger.debug("Controller: toggleSubtask", { todoId, subtaskId });
            const todo = await this.applicationService.toggleSubtask(todoId, subtaskId);
            return todo.toJSON();
        }
        catch (error) {
            this.logger.error("Controller: toggleSubtask failed", error);
            throw error;
        }
    }
    /**
     * Delete a subtask
     */
    async deleteSubtask(todoId, subtaskId) {
        try {
            this.logger.debug("Controller: deleteSubtask", { todoId, subtaskId });
            const todo = await this.applicationService.deleteSubtask(todoId, subtaskId);
            return todo.toJSON();
        }
        catch (error) {
            this.logger.error("Controller: deleteSubtask failed", error);
            throw error;
        }
    }
    /**
     * Delete todo
     */
    async deleteTodo(id) {
        try {
            this.logger.debug("Controller: deleteTodo", { id });
            const command = { id };
            await this.applicationService.deleteTodo(command);
        }
        catch (error) {
            this.logger.error("Controller: deleteTodo failed", error);
            throw error;
        }
    }
}
