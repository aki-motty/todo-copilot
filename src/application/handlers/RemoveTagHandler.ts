import type { TodoResponseDTO } from "../dto/TodoDTO";
import type { TodoApplicationService } from "../services/TodoApplicationService";

export interface RemoveTagCommand {
  id: string;
  tagName: string;
}

export class RemoveTagHandler {
  constructor(private service: TodoApplicationService) {}

  async handle(command: RemoveTagCommand): Promise<TodoResponseDTO> {
    const todo = await this.service.removeTag(command.id, command.tagName);
    return todo.toJSON();
  }
}
