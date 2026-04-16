"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";

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

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-full p-8 border-2 border-dashed rounded-lg transition ${
                isDragging
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-300 bg-white"
            }`}
        >
            <div className="flex flex-col items-center gap-3">
                <svg
                    className="w-12 h-12 text-slate-500"
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
                <div className="text-center">
                    <p className="text-slate-800 font-semibold">
                        {isLoading ? "Uploading..." : "Click to upload CSV"}
                    </p>
                    <p className="text-sm text-slate-500">or drag and drop</p>
                </div>
                <button
                    type="button"
                    onClick={openFilePicker}
                    disabled={isLoading}
                    className="mt-2 px-4 py-2 rounded-md bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                >
                    Browse CSV
                </button>
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
