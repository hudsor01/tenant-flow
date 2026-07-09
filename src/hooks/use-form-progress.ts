/**
 * React 19 form progress persistence hook
 * Local form progress saving (no backend dependency)
 * Follows Supabase Auth-first architecture
 */

"use client";

import {
	startTransition,
	useCallback,
	useDeferredValue,
	useEffect,
	useRef,
	useState,
} from "react";
import { createLogger } from "#lib/frontend-logger";
import type { FormProgressData } from "#types/core";

const logger = createLogger({ component: "FormProgressHook" });

type FormType = "signup" | "login" | "reset" | "contact";

interface FormProgressState {
	data: FormProgressData | null;
	isLoading: boolean;
	error: string | null;
}

/**
 * React 19 form progress persistence hook
 * Local persistence with automatic progress management
 */
function useFormProgress(formType: FormType) {
	const [state, setState] = useState<FormProgressState>({
		data: null,
		isLoading: true,
		error: null,
	});

	// Load draft on mount - React 19 pattern: no setTimeout needed
	// The effect runs after hydration completes automatically
	useEffect(() => {
		let active = true;

		// Ensure we're on the client side (check is fast, no setTimeout needed)
		if (typeof window === "undefined") return;

		try {
			const savedData = localStorage.getItem(`form-progress-${formType}`);
			const data = savedData ? JSON.parse(savedData) : null;

			// Only update if component is still mounted
			if (active) {
				setState((prev) => ({
					...prev,
					data,
					isLoading: false,
				}));
			}
		} catch (error) {
			// Only update if component is still mounted
			if (active) {
				setState((prev) => ({
					...prev,
					error:
						error instanceof Error ? error.message : "Failed to load draft",
					isLoading: false,
				}));
			}
		}

		return () => {
			active = false;
		};
	}, [formType]);

	// Save progress function with local storage (excludes sensitive data).
	// FORMFIX-03: memoized (deps: formType only) so its identity is stable across
	// renders — consumers depend on this reference, not on the whole hook return.
	// It uses the functional setState form, so it never needs `state` as a dep.
	const saveProgress = useCallback(
		async (data: FormProgressData): Promise<void> => {
			try {
				// Skip if no meaningful data to save
				if (!data.email && !data.name) return;

				// Security: Never save passwords locally
				const safeData = { ...data };
				delete safeData.password;
				delete safeData.confirmPassword;

				// Save to localStorage
				localStorage.setItem(
					`form-progress-${formType}`,
					JSON.stringify(safeData),
				);

				setState((prev) => ({
					...prev,
					data: safeData,
					error: null,
				}));
			} catch (error) {
				// Graceful degradation - don't break the form
				logger.warn("Failed to save form progress", {
					action: "form_progress_save_failed",
					metadata: {
						formType,
						hasEmail: !!data.email,
						hasName: !!data.name,
						error: error instanceof Error ? error.message : String(error),
					},
				});
				setState((prev) => ({
					...prev,
					error:
						error instanceof Error ? error.message : "Failed to save progress",
				}));
			}
		},
		[formType],
	);

	// Clear progress (on successful submission) — memoized for a stable identity.
	const clearProgress = useCallback(() => {
		localStorage.removeItem(`form-progress-${formType}`);
		setState((prev) => ({
			...prev,
			data: null,
			error: null,
		}));
	}, [formType]);

	return {
		...state,
		saveProgress,
		clearProgress,
	};
}

/**
 * React 19 enhanced form state hook
 * Combines useFormState with automatic progress persistence
 */
export function useFormWithProgress<T extends FormProgressData>(
	formType: FormType,
	onSubmit: (data: T) => Promise<void>,
	defaultValues: T,
) {
	const progress = useFormProgress(formType);
	const [formData, setFormData] = useState<T>(defaultValues); // Start with clean defaults
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [isHydrated, setIsHydrated] = useState(false);

	// FORMFIX-03: the serialized (password-free) payload of the last save. The
	// auto-save effect writes only when the current serialized payload differs,
	// so re-renders with unchanged data produce no writes and the loop is broken.
	const lastSavedRef = useRef<string | null>(null);

	// FORMFIX-03: the restore-from-draft merge must happen exactly ONCE, at the
	// initial load. `progress.data` is re-assigned a fresh reference on every
	// auto-save (saveProgress does setState({ ...prev, data })), so without this
	// gate the restore effect re-fires on each keystroke's save and re-merges the
	// saved snapshot over the user's live edits (progressData wins the merge) —
	// under fast typing a deferred stale snapshot can roll a controlled input back
	// and drop in-flight characters. This gate pins restore to the load-time draft.
	const hasRestoredRef = useRef(false);

	// Stable identities (the mutable pieces of `progress`) so the auto-save effect
	// does not re-run every render on a fresh `progress` object reference.
	const { saveProgress } = progress;
	const progressIsLoading = progress.isLoading;
	const progressData = progress.data;

	// Mark as hydrated on client
	useEffect(() => {
		setIsHydrated(true);
	}, []);

	// React 19: Use deferred values for non-urgent updates
	const deferredFormData = useDeferredValue(formData);

	// Auto-save progress when form data changes (deferred) - only after hydration, excluding passwords
	useEffect(() => {
		if (
			!isHydrated ||
			progressIsLoading ||
			!(deferredFormData.email || deferredFormData.name)
		) {
			return;
		}

		// Security: Never auto-save passwords
		const safeData = { ...deferredFormData };
		delete safeData.password;
		delete safeData.confirmPassword;

		// FORMFIX-03: skip when nothing meaningful changed since the last save.
		const serialized = JSON.stringify(safeData);
		if (serialized === lastSavedRef.current) return;
		lastSavedRef.current = serialized;

		startTransition(() => {
			saveProgress(safeData);
		});
	}, [deferredFormData, saveProgress, progressIsLoading, isHydrated]);

	// Restore progress data when loaded - only after hydration, and ONLY ONCE.
	// FORMFIX-03: the guard runs the merge the first time the initial localStorage
	// load has settled (isHydrated && !progressIsLoading); subsequent progressData
	// changes are auto-save writes, which must NOT re-merge over live form edits.
	useEffect(() => {
		if (hasRestoredRef.current) return;
		if (!isHydrated || progressIsLoading) return;

		// Initial load has completed — restore the draft that existed at load time
		// (if any). Mark done first so an auto-save-driven progressData change can
		// never re-enter this merge.
		hasRestoredRef.current = true;
		if (!progressData) return;

		setFormData((prev) => {
			const merged = { ...prev, ...progressData };
			// Prime the change guard with what we just restored so the auto-save
			// effect does not immediately write the restored data straight back.
			const safe = { ...merged };
			delete safe.password;
			delete safe.confirmPassword;
			lastSavedRef.current = JSON.stringify(safe);
			return merged;
		});
	}, [progressData, progressIsLoading, isHydrated]);

	const handleSubmit = async (data: T) => {
		setIsSubmitting(true);
		setSubmitError(null);

		try {
			await onSubmit(data);
			progress.clearProgress();
		} catch (error) {
			setSubmitError(
				error instanceof Error ? error.message : "Submission failed",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	const updateField = <K extends keyof T>(field: K, value: T[K]) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	return {
		formData,
		updateField,
		handleSubmit,
		isSubmitting,
		submitError,
		isHydrated,
		progress: {
			isLoading: progress.isLoading,
			error: progress.error,
			hasData: !!progress.data,
		},
	};
}
