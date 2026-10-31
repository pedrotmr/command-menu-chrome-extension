import type { RefObject } from 'react';
import { groupColors } from '../../helpers';

interface TabGroupFieldsProps {
  idPrefix: string;
  nameInputRef: RefObject<HTMLInputElement | null>;
  name: string;
  color: string;
  onNameChange: (value: string) => void;
  onColorChange: (value: string) => void;
}

export function TabGroupFields({
  idPrefix,
  nameInputRef,
  name,
  color,
  onNameChange,
  onColorChange,
}: TabGroupFieldsProps) {
  const nameFieldId = `${idPrefix}-name`;
  const colorFieldId = `${idPrefix}-color`;

  return (
    <>
      <div className="field-group">
        <label htmlFor={nameFieldId}>Group name</label>
        <input
          ref={nameInputRef}
          id={nameFieldId}
          name={nameFieldId}
          autoComplete="off"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          maxLength={80}
          placeholder="e.g. Research"
        />
      </div>
      <div className="field-group">
        <label htmlFor={colorFieldId}>Group color</label>
        <select
          id={colorFieldId}
          name={colorFieldId}
          value={color}
          onChange={(event) => onColorChange(event.target.value)}
        >
          {groupColors.map((groupColor) => (
            <option key={groupColor} value={groupColor}>
              {groupColor[0].toUpperCase() + groupColor.slice(1)}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
