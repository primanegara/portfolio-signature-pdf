"use client";

import dynamic from "next/dynamic";

const PdfEditor = dynamic(() => import("./PdfEditor"), {
    ssr: false,
    loading: () => <div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading editor...</div>
});

export default function EditPage() {
    return <PdfEditor />;
}
