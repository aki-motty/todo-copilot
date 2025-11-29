import type { TodoResponseDTO } from "../dto/TodoDTO";
import type { TodoApplicationService } from "../services/TodoApplicationService";

export interface AddTagCommand {
  id: string;
  tagName: string;
}

export class AddTagHandler {
  constructor(private service: TodoApplicationService) {}

  async handle(command: AddTagCommand): Promise<TodoResponseDTO> {
    const todo = await this.service.addTag(command.id, command.tagName);
    return todo.toJSON();
  }
}
