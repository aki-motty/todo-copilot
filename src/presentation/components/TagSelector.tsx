import type React from "react";
import { ALLOWED_TAGS } from "../../domain/value-objects/Tag";

interface TagSelectorProps {
  onSelect: (tagName: string) => void;
  disabled?: boolean;
}

export const TagSelector: React.FC<TagSelectorProps> = ({ onSelect, disabled }) => {
  return (
    <select
      onChange={(e) => {
        if (e.target.value) {
          onSelect(e.target.value);
          e.target.value = ""; // Reset selection
        }
      }}
      disabled={disabled}
      className="tag-selector"
      defaultValue=""
      style={{
        marginLeft: "8px",
        padding: "4px",
        borderRadius: "4px",
        border: "1px solid #ccc",
      }}
    >
      <option value="" disabled>
        Add Tag
      </option>
      {ALLOWED_TAGS.map((tag) => (
        <option key={tag} value={tag}>
          {tag}
        </option>
      ))}
    </select>
  );
};
