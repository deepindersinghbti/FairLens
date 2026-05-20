"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeSanitize from "rehype-sanitize";
import { markdownClass } from "@/lib/markdown";

interface MarkdownRendererProps {
    content?: string | null;
    className?: string;
}

export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
    if (!content) return null;

    return (
        <div className={`${markdownClass} ${className}`.trim()}>
            <ReactMarkdown remarkPlugins={[remarkGfm as any, remarkBreaks as any]} rehypePlugins={[(rehypeSanitize as any)]}>
                {content}
            </ReactMarkdown>
        </div>
    );
}
