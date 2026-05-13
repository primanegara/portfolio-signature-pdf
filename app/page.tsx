"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileText } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const setPdfFile = useAppStore((state) => state.setPdfFile);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFile = (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Please upload a valid PDF file.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("File size exceeds 20MB limit.");
      return;
    }

    setPdfFile(file);
    router.push("/edit");
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
      <ThemeToggle />
      <div className="max-w-3xl w-full text-center space-y-8">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground">
          Sign PDF documents online
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Add your signature to PDF files quickly, securely, and completely free.
          No registration required. Maximum file size: 20MB.
        </p>

        <div
          className={`mt-10 border-4 border-dashed rounded-2xl p-12 transition-all duration-200 bg-card
            ${isDragging ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : "border-border hover:border-primary"}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center space-y-6">
            <div className="h-24 w-24 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center">
              <UploadCloud className="h-12 w-12" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-semibold text-foreground">
                Drag and drop your PDF here
              </h3>
              <p className="text-muted-foreground">or</p>
            </div>

            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileText className="mr-2 h-6 w-6" />
              Browse PDF
            </Button>

            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="application/pdf"
              onChange={handleFileChange}
            />

            <p className="text-sm text-muted-foreground/70 mt-4">
              Max file size 20MB
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 text-left">
          <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
            <h4 className="font-semibold text-lg text-foreground mb-2">Private & Secure</h4>
            <p className="text-muted-foreground text-sm">Your files are processed directly in your browser. We don&apos;t store your documents.</p>
          </div>
          <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
            <h4 className="font-semibold text-lg text-foreground mb-2">Free to Use</h4>
            <p className="text-muted-foreground text-sm">Sign as many documents as you need without any hidden fees or limitations.</p>
          </div>
          <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
            <h4 className="font-semibold text-lg text-foreground mb-2">Draw or Upload</h4>
            <p className="text-muted-foreground text-sm">Create your signature by drawing it or uploading an existing image.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
