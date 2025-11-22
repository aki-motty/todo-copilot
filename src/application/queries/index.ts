/**
 * Query definitions for Todo application
 * Queries represent read-only operations
 */

import type { Todo } from "../../domain/entities/Todo";

/**
 * Query to retrieve all todos
 */
export type GetAllTodosQuery = Record<string, never>;

/**
 * Response for GetAllTodosQuery
 */
export interface GetAllTodosResponse {
  todos: Todo[];
  count: number;
}

/**
 * Query to retrieve a single todo
 */
export interface GetTodoByIdQuery {
  id: string;
}

/**
 * Response for GetTodoByIdQuery
 */
export interface GetTodoByIdResponse {
  todo: Todo | null;
}
