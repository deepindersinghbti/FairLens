"use client";

import { ChangeEvent, DragEvent, KeyboardEvent, useRef, useState } from "react";

interface CSVUploadProps {
    onUpload: (file: File) => Promise<void>;
    isLoading: boolean;
}

export function CSVUpload({ onUpload, isLoading }: CSVUploadProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleUploadFile = async (file?: File) => {
        if (!file) return;

        try {
            await onUpload(file);
        } catch (error) {
            console.error("Upload error:", error);
        }
    };

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.currentTarget.files?.[0];
        await handleUploadFile(file);
        e.currentTarget.value = "";
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (!isLoading) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        if (isLoading) {
            return;
        }

        const file = e.dataTransfer.files?.[0];
        if (!file) {
            return;
        }

        await handleUploadFile(file);
    };

    const openFilePicker = () => {
        fileInputRef.current?.click();
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (!isLoading) {
                openFilePicker();
            }
        }
    };

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label="Drop a CSV file here or click to browse"
            onKeyDown={handleKeyDown}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`group w-full rounded-2xl border-2 border-dashed p-6 transition-all duration-200 sm:p-8 ${
                isDragging
                    ? "border-blue-400 bg-blue-50 shadow-[0_0_0_4px_rgba(59,130,246,0.08)]"
                    : "border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-white"
            }`}
        >
            <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm">
                    <svg
                        className="h-7 w-7"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3v-6"
                        />
                    </svg>
                </div>
                <div className="space-y-2">
                    <p className="text-base font-semibold text-slate-900">
                        {isLoading ? "Uploading CSV..." : "Upload a CSV dataset"}
                    </p>
                    <p className="max-w-sm text-sm leading-6 text-slate-600">
                        Drag and drop your file here, or browse to open a CSV from your device.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={openFilePicker}
                    disabled={isLoading}
                    className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                    {isLoading ? "Uploading..." : "Browse CSV"}
                </button>
                <p className="text-xs text-slate-500">CSV files only</p>
            </div>
            <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isLoading}
                className="hidden"
            />
        </div>
    );
}
