/**
 * Branded type for unique Todo identifiers
 * Ensures type safety at compile time while maintaining string at runtime
 */
export type TodoId = string & { readonly __brand: "TodoId" };

export const brandTodoId = (id: string): TodoId => id as TodoId;
