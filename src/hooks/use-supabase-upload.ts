import { useEffect, useRef, useState } from "react";
import {
	type FileError,
	type FileRejection,
	useDropzone,
} from "react-dropzone";
import { createClient } from "#lib/supabase/client";

const supabase = createClient();

interface FileWithPreview extends File {
	preview?: string;
	errors: readonly FileError[];
}

import { UseSupabaseUploadOptions } from "#types/file-upload";

type UseSupabaseUploadReturn = ReturnType<typeof useSupabaseUpload>;

const useSupabaseUpload = (options: UseSupabaseUploadOptions) => {
	const {
		bucketName,
		path,
		allowedMimeTypes = [],
		maxFileSize = Number.POSITIVE_INFINITY,
		maxFiles = 1,
		cacheControl = 3600,
		upsert = false,
		autoUpload = false,
	} = options;

	const [files, setFiles] = useState<FileWithPreview[]>([]);
	const [loading, setLoading] = useState<boolean>(false);
	const [errors, setErrors] = useState<{ name: string; message: string }[]>([]);
	const [successes, setSuccesses] = useState<string[]>([]);

	const isSuccess =
		files.length > 0 &&
		!loading &&
		errors.length === 0 &&
		files.every((f) => successes.includes(f.name));

	const onDrop = (acceptedFiles: File[], fileRejections: FileRejection[]) => {
		const validFiles = acceptedFiles
			.filter((file) => !files.find((x) => x.name === file.name))
			.map((file) => {
				(file as FileWithPreview).preview = URL.createObjectURL(file);
				(file as FileWithPreview).errors = [];
				return file as FileWithPreview;
			});

		const invalidFiles = fileRejections.map(({ file, errors }) => {
			(file as FileWithPreview).preview = URL.createObjectURL(file);
			(file as FileWithPreview).errors = errors;
			return file as FileWithPreview;
		});

		const newFiles = [...files, ...validFiles, ...invalidFiles];

		setFiles(newFiles);
	};

	const dropzoneProps = useDropzone({
		onDrop,
		accept: allowedMimeTypes.reduce(
			(acc, type) => ({ ...acc, [type]: [] }),
			{},
		),
		maxSize: maxFileSize,
		maxFiles: maxFiles,
		multiple: maxFiles !== 1,
	});

	const onUpload = async () => {
		setLoading(true);

		// Retry list: upload each file at most once — skip client-invalid files
		// (errors.length > 0) and files that already succeeded, so a partial-failure
		// retry never double-uploads a file (one storage object + one property_images row).
		const filesToUpload = files.filter(
			(f) => f.errors.length === 0 && !successes.includes(f.name),
		);

		const responses = await Promise.all(
			filesToUpload.map(async (file) => {
				// Generate unique filename to prevent "resource already exists" errors
				const ext = file.name.split(".").pop() || "jpg";
				const uniqueName = `${crypto.randomUUID()}.${ext}`;
				const uploadPath = path ? `${path}/${uniqueName}` : uniqueName;
				const { error } = await supabase.storage
					.from(bucketName)
					.upload(uploadPath, file, {
						cacheControl: cacheControl.toString(),
						upsert,
					});
				if (error) {
					return { name: file.name, message: error.message };
				} else {
					return { name: file.name, message: undefined };
				}
			}),
		);

		const responseErrors = responses.filter((x) => x.message !== undefined);
		// if there were errors previously, this function tried to upload the files again so we should clear/overwrite the existing errors.
		setErrors(responseErrors);

		const responseSuccesses = responses.filter((x) => x.message === undefined);
		const newSuccesses = Array.from(
			new Set([...successes, ...responseSuccesses.map((x) => x.name)]),
		);
		setSuccesses(newSuccesses);

		setLoading(false);
	};

	useEffect(() => {
		if (files.length === 0) {
			setErrors([]);
			setSuccesses([]);
		}

		// If the number of files doesn't exceed the maxFiles parameter, remove the error 'Too many files' from each file
		if (files.length <= maxFiles) {
			let changed = false;
			const newFiles = files.map((file) => {
				if (file.errors.some((e) => e.code === "too-many-files")) {
					file.errors = file.errors.filter((e) => e.code !== "too-many-files");
					changed = true;
				}
				return file;
			});
			if (changed) {
				setFiles(newFiles);
			}
		}
		// Effect has guards (length check and changed check) to prevent infinite loops
	}, [files, maxFiles]);

	// Auto-upload: trigger upload immediately when NEW files are added
	// Using refs to avoid infinite loops while keeping behavior correct
	const uploadAttemptedRef = useRef<Set<string>>(new Set());
	const onUploadRef = useRef(onUpload);
	onUploadRef.current = onUpload; // Always keep ref updated

	// Clear the upload tracking when files are cleared
	useEffect(() => {
		if (files.length === 0) {
			uploadAttemptedRef.current.clear();
		}
	}, [files.length]);

	useEffect(() => {
		if (!autoUpload) return;
		if (loading) return;

		// Find files we haven't tried to upload yet
		const newFilesToUpload = files.filter(
			(f) => f.errors.length === 0 && !uploadAttemptedRef.current.has(f.name),
		);

		if (newFilesToUpload.length > 0) {
			// Mark these files as attempted BEFORE calling upload
			newFilesToUpload.forEach((f) => uploadAttemptedRef.current.add(f.name));
			onUploadRef.current();
		}
	}, [files, autoUpload, loading]);

	return {
		files,
		setFiles,
		successes,
		isSuccess,
		loading,
		errors,
		setErrors,
		onUpload,
		maxFileSize: maxFileSize,
		maxFiles: maxFiles,
		allowedMimeTypes,
		...dropzoneProps,
	};
};

export {
	type UseSupabaseUploadOptions,
	type UseSupabaseUploadReturn,
	useSupabaseUpload,
};
