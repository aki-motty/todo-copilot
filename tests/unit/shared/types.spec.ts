import {
  NotFoundError,
  QuotaExceededError,
  StorageCorruptionError,
  ValidationError,
} from "../../../src/shared/types";

describe("Error Types", () => {
  describe("NotFoundError", () => {
    it("should create error with message", () => {
      const error = new NotFoundError("Todo not found");

      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe("Todo not found");
      expect(error.name).toBe("NotFoundError");
    });

    it("should be throwable", () => {
      expect(() => {
        throw new NotFoundError("Test error");
      }).toThrow(NotFoundError);
    });
  });

  describe("ValidationError", () => {
    it("should create error with message", () => {
      const error = new ValidationError("Invalid input");

      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe("Invalid input");
      expect(error.name).toBe("ValidationError");
    });

    it("should be throwable", () => {
      expect(() => {
        throw new ValidationError("Validation failed");
      }).toThrow(ValidationError);
    });
  });

  describe("StorageCorruptionError", () => {
    it("should create error with message", () => {
      const error = new StorageCorruptionError("Storage corrupted");

      expect(error).toBeInstanceOf(StorageCorruptionError);
      expect(error.message).toBe("Storage corrupted");
      expect(error.name).toBe("StorageCorruptionError");
    });

    it("should be throwable", () => {
      expect(() => {
        throw new StorageCorruptionError("Data corruption detected");
      }).toThrow(StorageCorruptionError);
    });
  });

  describe("QuotaExceededError", () => {
    it("should create error with message", () => {
      const error = new QuotaExceededError("Storage quota exceeded");

      expect(error).toBeInstanceOf(QuotaExceededError);
      expect(error.message).toBe("Storage quota exceeded");
      expect(error.name).toBe("QuotaExceededError");
    });

    it("should be throwable", () => {
      expect(() => {
        throw new QuotaExceededError("Out of space");
      }).toThrow(QuotaExceededError);
    });
  });

  describe("Error hierarchy", () => {
    it("all errors should extend Error", () => {
      const errors = [
        new NotFoundError("test"),
        new ValidationError("test"),
        new StorageCorruptionError("test"),
        new QuotaExceededError("test"),
      ];

      for (const error of errors) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
});
