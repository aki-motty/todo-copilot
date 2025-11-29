import { ALLOWED_TAGS } from "../../domain/value-objects/Tag";

export class GetTagsHandler {
  async handle(): Promise<string[]> {
    return [...ALLOWED_TAGS];
  }
}
