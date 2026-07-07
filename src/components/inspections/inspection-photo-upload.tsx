"use client";

import { AlertCircle, CheckCircle, RotateCw, Upload, X } from "lucide-react";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Button } from "#components/ui/button";
import { useRecordInspectionPhoto } from "#hooks/api/use-inspection-photo-mutations";
import { createClient } from "#lib/supabase/client";

interface InspectionPhotoUploadProps {
	inspectionId: string;
	roomId: string;
	onUploadComplete?: () => void;
}

interface FileUploadState {
	// Stable identity for this file across filtering/re-renders. Status updates
	// key on this id, never on an array index — the pending subset's index does
	// not line up with the full `files` array.
	id: string;
	file: File;
	objectUrl: string;
	status: "pending" | "uploading" | "success" | "error";
	error?: string;
}

export function InspectionPhotoUpload({
	inspectionId,
	roomId,
	onUploadComplete,
}: InspectionPhotoUploadProps) {
	const [files, setFiles] = useState<FileUploadState[]>([]);
	const [isUploading, setIsUploading] = useState(false);
	const recordPhoto = useRecordInspectionPhoto(inspectionId);

	const onDrop = (acceptedFiles: File[]) => {
		const newFiles = acceptedFiles.map((file) => ({
			id: crypto.randomUUID(),
			file,
			objectUrl: URL.createObjectURL(file),
			status: "pending" as const,
		}));
		setFiles((prev) => [...prev, ...newFiles]);
	};

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			"image/jpeg": [],
			"image/jpg": [],
			"image/png": [],
			"image/webp": [],
		},
		maxSize: 10 * 1024 * 1024, // 10MB
		multiple: true,
	});

	function removeFile(id: string) {
		setFiles((prev) => {
			const target = prev.find((f) => f.id === id);
			if (target) URL.revokeObjectURL(target.objectUrl);
			return prev.filter((f) => f.id !== id);
		});
	}

	// Upload a single file, tracking its own status by stable id. Never throws —
	// resolves to whether the upload succeeded so the caller can tally the batch.
	async function uploadOne(fileState: FileUploadState): Promise<boolean> {
		// Skip files already uploaded: re-running upload must not create a
		// duplicate storage object or a duplicate recordPhoto row.
		if (fileState.status === "success") return true;

		const { id, file } = fileState;
		const supabase = createClient();
		const fileExt = file.name.split(".").pop() ?? "jpg";
		const fileName = `${crypto.randomUUID()}.${fileExt}`;
		const storagePath = `${inspectionId}/${roomId}/${fileName}`;

		setFiles((prev) =>
			prev.map((f) =>
				f.id === id ? { ...f, status: "uploading" as const } : f,
			),
		);

		try {
			const { error: uploadError } = await supabase.storage
				.from("inspection-photos")
				.upload(storagePath, file, { cacheControl: "3600", upsert: false });

			if (uploadError) throw uploadError;

			await recordPhoto.mutateAsync({
				inspection_room_id: roomId,
				inspection_id: inspectionId,
				storage_path: storagePath,
				file_name: file.name,
				file_size: file.size,
				mime_type: file.type,
			});

			setFiles((prev) =>
				prev.map((f) =>
					f.id === id ? { ...f, status: "success" as const } : f,
				),
			);
			return true;
		} catch (err) {
			const message = err instanceof Error ? err.message : "Upload failed";
			setFiles((prev) =>
				prev.map((f) =>
					f.id === id ? { ...f, status: "error" as const, error: message } : f,
				),
			);
			return false;
		}
	}

	async function handleUpload() {
		// Retry pending + previously-failed files; succeeded files are excluded
		// so a re-click cannot duplicate them.
		const targets = files.filter(
			(f) => f.status === "pending" || f.status === "error",
		);
		if (targets.length === 0) return;

		setIsUploading(true);
		const results = await Promise.all(targets.map((f) => uploadOne(f)));
		setIsUploading(false);

		const successCount = results.filter(Boolean).length;
		const errorCount = results.length - successCount;

		if (successCount > 0 && errorCount === 0) {
			toast.success(
				`${successCount} photo${successCount > 1 ? "s" : ""} uploaded`,
			);
			// Clean up object URLs and clear successful uploads after a delay
			setTimeout(() => {
				setFiles((prev) => {
					for (const f of prev) {
						if (f.status === "success") URL.revokeObjectURL(f.objectUrl);
					}
					return prev.filter((f) => f.status !== "success");
				});
				onUploadComplete?.();
			}, 1500);
		} else if (errorCount > 0) {
			toast.error(
				`${errorCount} photo${errorCount > 1 ? "s" : ""} failed to upload`,
			);
		}
	}

	const uploadableCount = files.filter(
		(f) => f.status === "pending" || f.status === "error",
	).length;

	return (
		<div className="space-y-3">
			{/* Dropzone */}
			<div
				{...getRootProps()}
				className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
					isDragActive
						? "border-primary bg-primary/5"
						: "border-border hover:border-primary/50 hover:bg-muted/30"
				}`}
			>
				<input {...getInputProps()} />
				<Upload
					className="w-8 h-8 text-muted-foreground mx-auto mb-2"
					aria-hidden="true"
				/>
				<p className="text-sm text-muted-foreground">
					{isDragActive
						? "Drop photos here"
						: "Drag photos here or click to select"}
				</p>
				<p className="text-xs text-muted-foreground mt-1">
					JPEG, PNG, WebP up to 10MB each
				</p>
			</div>

			{/* File previews */}
			{files.length > 0 && (
				<div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
					{files.map((fileState) => (
						<div
							key={fileState.id}
							className="aspect-square rounded-md bg-muted overflow-hidden relative group"
						>
							{/* Local object-URL preview of the picked file (not the stored photo) */}
							<img
								src={fileState.objectUrl}
								alt={fileState.file.name}
								className="w-full h-full object-cover"
							/>
							{/* Status overlay */}
							{fileState.status === "uploading" && (
								<div className="absolute inset-0 bg-black/40 flex items-center justify-center">
									<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
								</div>
							)}
							{fileState.status === "success" && (
								<div className="absolute inset-0 bg-black/20 flex items-center justify-center">
									<CheckCircle
										className="w-6 h-6 text-white"
										aria-hidden="true"
									/>
								</div>
							)}
							{fileState.status === "error" && (
								<div
									className="absolute inset-0 bg-destructive/70 flex flex-col items-center justify-center gap-1 p-1"
									title={fileState.error}
								>
									<AlertCircle
										className="w-5 h-5 text-white"
										aria-hidden="true"
									/>
									<div className="flex gap-1">
										<button
											type="button"
											onClick={() => void uploadOne(fileState)}
											aria-label={`Retry ${fileState.file.name}`}
											className="p-1 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
										>
											<RotateCw className="w-3 h-3" aria-hidden="true" />
										</button>
										<button
											type="button"
											onClick={() => removeFile(fileState.id)}
											aria-label={`Remove ${fileState.file.name}`}
											className="p-1 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
										>
											<X className="w-3 h-3" aria-hidden="true" />
										</button>
									</div>
								</div>
							)}
							{/* Remove button (pending only — uploading has no control, error has its own) */}
							{fileState.status === "pending" && (
								<button
									type="button"
									onClick={() => removeFile(fileState.id)}
									aria-label={`Remove ${fileState.file.name}`}
									className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
								>
									<X className="w-3 h-3" aria-hidden="true" />
								</button>
							)}
						</div>
					))}
				</div>
			)}

			{/* Upload button */}
			{uploadableCount > 0 && (
				<Button
					type="button"
					size="sm"
					onClick={handleUpload}
					disabled={isUploading}
					className="min-h-9"
				>
					{isUploading
						? "Uploading..."
						: `Upload ${uploadableCount} photo${uploadableCount > 1 ? "s" : ""}`}
				</Button>
			)}
		</div>
	);
}
