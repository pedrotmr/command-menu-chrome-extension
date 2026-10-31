import type { FormEvent, RefObject } from 'react';
import type { FlowDialog as FlowDialogState } from '../types';
import { getDialogDescription, getDialogHeadingLabel, getDialogSubmitLabel, getDialogTitle } from '../helpers';
import type { DialogFieldsProps } from './DialogFields';
import { DialogFields } from './DialogFields';

interface FlowDialogProps extends Omit<DialogFieldsProps, 'dialog'> {
  dialog: FlowDialogState | null;
  dialogRef: RefObject<HTMLDialogElement | null>;
  closeConfirmationCancelRef: RefObject<HTMLButtonElement | null>;
  dialogError: string;
  onCloseDialog: () => void | Promise<void>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
}

export function FlowDialog({
  dialog,
  dialogRef,
  closeConfirmationCancelRef,
  dialogError,
  groupTargetId,
  onCloseDialog,
  onSubmit,
  ...fieldProps
}: FlowDialogProps) {
  return (
    <dialog
      ref={dialogRef}
      className="flow-dialog"
      aria-labelledby="flow-dialog-title"
      aria-describedby="flow-dialog-description"
      onCancel={(event) => {
        event.preventDefault();
        void onCloseDialog();
      }}
    >
      {dialog && (
        <form
          onSubmit={(event) => {
            void onSubmit(event);
          }}
        >
          <div className="dialog-heading">
            <p className="eyebrow">{getDialogHeadingLabel(dialog)}</p>
            <h2 id="flow-dialog-title">{getDialogTitle(dialog)}</h2>
            <p id="flow-dialog-description">{getDialogDescription(dialog)}</p>
          </div>

          <p
            className={`dialog-notice${dialogError ? ' is-visible' : ''}`}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {dialogError}
          </p>

          <DialogFields dialog={dialog} groupTargetId={groupTargetId} {...fieldProps} />

          <div className="dialog-actions">
            <button
              ref={dialog.kind === 'confirm-close' ? closeConfirmationCancelRef : undefined}
              type="button"
              className="button-secondary"
              onClick={() => {
                void onCloseDialog();
              }}
            >
              Cancel
            </button>
            <button type="submit" className={dialog.kind === 'confirm-close' ? 'button-danger' : 'button-primary'}>
              {getDialogSubmitLabel(dialog, groupTargetId)}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
