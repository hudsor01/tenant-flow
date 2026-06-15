"use client";

import { Slot } from "radix-ui";
import type { MouseEvent } from "react";
import { useAsRef } from "#hooks/use-as-ref";
import { useFileUploadContext } from "./context";
import type { FileUploadTriggerProps } from "./types";
import { TRIGGER_NAME } from "./types";

export function FileUploadTrigger(props: FileUploadTriggerProps) {
	const { asChild, onClick: onClickProp, ...triggerProps } = props;

	const context = useFileUploadContext(TRIGGER_NAME);

	const propsRef = useAsRef({
		onClick: onClickProp,
	});

	const onClick = (event: MouseEvent<HTMLButtonElement>) => {
		propsRef.current.onClick?.(event);

		if (event.defaultPrevented) return;

		context.inputRef.current?.click();
	};

	const TriggerPrimitive = asChild ? Slot.Slot : "button";

	return (
		<TriggerPrimitive
			type="button"
			aria-controls={context.inputId}
			data-disabled={context.disabled ? "" : undefined}
			data-slot="file-upload-trigger"
			{...triggerProps}
			disabled={context.disabled}
			onClick={onClick}
		/>
	);
}
