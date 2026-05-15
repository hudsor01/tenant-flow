"use client";

import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ErrorInfo, ReactElement, ReactNode } from "react";
import {
	type FallbackProps,
	ErrorBoundary as ReactErrorBoundary,
} from "react-error-boundary";
import { Button } from "#components/ui/button";
import { CardLayout } from "#components/ui/card-layout";
import { useErrorBoundaryStore } from "#stores/error-boundary-store";

interface Props {
	children: ReactNode;
	fallback?: ReactElement;
}

function handleError(error: unknown, info: ErrorInfo) {
	const err = error instanceof Error ? error : new Error(String(error));

	// Route to Sentry as a proper exception event — preserves the stack
	// trace and exception class. Previously routed through logger.error
	// which falls through to captureMessage (no stack, no class).
	Sentry.captureException(err, {
		tags: { boundary: "component-error-boundary" },
		extra: { componentStack: info.componentStack },
	});

	// Persist error in global error boundary store for cross-page visibility
	useErrorBoundaryStore.getState().setError(err, "ErrorBoundary");
}

function handleReset() {
	useErrorBoundaryStore.getState().clearError();
}

export function ErrorBoundary({ children, fallback }: Props) {
	if (fallback) {
		return (
			<ReactErrorBoundary
				fallback={fallback}
				onError={handleError}
				onReset={handleReset}
			>
				{children}
			</ReactErrorBoundary>
		);
	}

	return (
		<ReactErrorBoundary
			FallbackComponent={DefaultErrorFallback}
			onError={handleError}
			onReset={handleReset}
		>
			{children}
		</ReactErrorBoundary>
	);
}

function DefaultErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
	const router = useRouter();
	const errorState = useErrorBoundaryStore((state) => state.errorState);

	const handleRetry = () => {
		resetErrorBoundary();
		router.refresh();
	};

	const message = error instanceof Error ? error.message : undefined;

	return (
		<div className="min-h-screen flex-center p-4">
			<CardLayout title="Something went wrong" className="max-w-md w-full">
				<div className="flex flex-col items-center space-y-4 text-center">
					<AlertTriangle className="size-12 text-destructive" />
					<div className="space-y-2">
						<h2 className="typography-h4">Something went wrong</h2>
						<p className="text-muted-foreground">
							An unexpected error occurred. Our team has been notified.
						</p>
						{message && (
							<p className="text-muted font-mono bg-muted p-2 rounded">
								{message}
							</p>
						)}
						{errorState.errorId && (
							<p className="text-caption">Error ID: {errorState.errorId}</p>
						)}
					</div>
					<div className="flex gap-2">
						<Button variant="outline" onClick={handleRetry}>
							<RefreshCw className="size-4 mr-2" />
							Try Again
						</Button>
					</div>
				</div>
			</CardLayout>
		</div>
	);
}
