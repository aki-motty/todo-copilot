import { GetTagsHandler } from "../../../../src/application/handlers/GetTagsHandler";
import { ALLOWED_TAGS } from "../../../../src/domain/value-objects/Tag";

describe("GetTagsHandler", () => {
  let handler: GetTagsHandler;

  beforeEach(() => {
    handler = new GetTagsHandler();
  });

  it("should return allowed tags", async () => {
    const result = await handler.handle();
    expect(result).toEqual(expect.arrayContaining([...ALLOWED_TAGS]));
  });
});
