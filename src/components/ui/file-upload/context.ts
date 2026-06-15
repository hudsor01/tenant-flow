"use client";

import { createContext, useContext } from "react";
import type { FileUploadContextValue } from "./types";
import { ROOT_NAME } from "./types";

export const FileUploadContext = createContext<FileUploadContextValue | null>(
	null,
);

export function useFileUploadContext(
	consumerName: string,
): FileUploadContextValue {
	const context = useContext(FileUploadContext);
	if (!context) {
		throw new Error(`\`${consumerName}\` must be used within \`${ROOT_NAME}\``);
	}
	return context;
}
