"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { Document, Page, pdfjs } from "react-pdf";
import { Rnd } from "react-rnd";
import SignatureCanvas from "react-signature-canvas";
import { PDFDocument } from "pdf-lib";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Download, Zap, Edit3, Image as ImageIcon, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Copy, Home } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { toast } from "sonner";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Signature {
    id: string;
    dataUrl: string;
    x: number;
    y: number;
    width: number;
    height: number;
    page: number;
}

export default function EditPage() {
    const router = useRouter();
    const pdfFile = useAppStore((state) => state.pdfFile);
    const [numPages, setNumPages] = useState<number>(1);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [scale, setScale] = useState<number>(1);
    const [signatures, setSignatures] = useState<Signature[]>([]);
    const [isDrawOpen, setIsDrawOpen] = useState(false);
    const [isImageOpen, setIsImageOpen] = useState(false);

    const signatureRef = useRef<SignatureCanvas>(null);
    const pdfWrapperRef = useRef<HTMLDivElement>(null);
    const imageUploadRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!pdfFile) {
            router.push("/");
        }
    }, [pdfFile, router]);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    const addSignatureFromCanvas = () => {
        if (signatureRef.current?.isEmpty()) {
            toast.error("Please draw a signature first.");
            return;
        }

        const dataUrl = signatureRef.current?.getTrimmedCanvas().toDataURL("image/png");
        if (dataUrl) {
            addSignature(dataUrl);
            setIsDrawOpen(false);
            signatureRef.current?.clear();
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    addSignature(event.target.result as string);
                    setIsImageOpen(false);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const addSignature = (dataUrl: string) => {
        const newSignature: Signature = {
            id: Date.now().toString(),
            dataUrl,
            x: 50,
            y: 50,
            width: 150,
            height: 75,
            page: pageNumber,
        };
        setSignatures([...signatures, newSignature]);
    };

    const updateSignature = (id: string, updates: Partial<Signature>) => {
        setSignatures(signatures.map(sig => sig.id === id ? { ...sig, ...updates } : sig));
    };

    const deleteSignature = (id: string) => {
        setSignatures(signatures.filter(sig => sig.id !== id));
    };

    const duplicateSignature = (id: string) => {
        const signature = signatures.find(sig => sig.id === id);
        if (signature) {
            const newSignature: Signature = {
                ...signature,
                id: Date.now().toString(),
                x: signature.x + 20,
                y: signature.y + 20,
            };
            setSignatures([...signatures, newSignature]);
        }
    };

    const handleDownload = async () => {
        if (!pdfFile) return;

        try {
            const arrayBuffer = await pdfFile.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            const pages = pdfDoc.getPages();

            for (const sig of signatures) {
                const page = pages[sig.page - 1]; // 0-indexed in pdf-lib
                const pngImage = await pdfDoc.embedPng(sig.dataUrl);
                const { height: pageH } = page.getSize();

                // Calculate based on scale
                // In react-pdf, page width is dynamic based on scale.
                // We need original width
                const renderScale = scale;

                // If the wrapper is used for relative coords, we need to convert to PDF points.
                // Assuming signatures coords are relative to the scaled pdf page view.
                // react-pdf returns page at ~72dpi. 
                // We must reverse the scale to get point coords:
                const xPt = sig.x / renderScale;
                // y is from top in HTML, but from bottom in PDF coordinates
                const yPt = pageH - ((sig.y + sig.height) / renderScale);
                const widthPt = sig.width / renderScale;
                const heightPt = sig.height / renderScale;

                page.drawImage(pngImage, {
                    x: xPt,
                    y: yPt,
                    width: widthPt,
                    height: heightPt,
                });
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = `Signed_${pdfFile.name}`;
            link.click();

            toast.success("PDF Downloaded successfully!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate PDF. Please try again.");
        }
    };

    if (!pdfFile) return <div className="h-screen flex items-center justify-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
            <ThemeToggle />
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Top Navbar for Editor */}
                <div className="h-16 bg-card border-border border-b flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center space-x-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push("/")}
                            className="flex items-center gap-2 cursor-pointer"
                            title="Back to home"
                        >
                            <Home className="h-4 w-4" />
                            <span className="hidden sm:inline">Back</span>
                        </Button>
                        <h2 className="font-semibold text-foreground truncate max-w-xs">{pdfFile.name}</h2>

                        <div className="hidden md:flex items-center space-x-2 bg-muted rounded-lg p-1">
                            <Button variant="ghost" size="sm" className="cursor-pointer" onClick={() => setScale(Math.max(scale - 0.2, 0.5))}>
                                <ZoomOut className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium w-12 text-center">{Math.round(scale * 100)}%</span>
                            <Button variant="ghost" size="sm" className="cursor-pointer" onClick={() => setScale(Math.min(scale + 0.2, 3))}>
                                <ZoomIn className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setPageNumber(Math.max(pageNumber - 1, 1))} disabled={pageNumber <= 1}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm">Page {pageNumber} of {numPages}</span>
                        <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setPageNumber(Math.min(pageNumber + 1, numPages))} disabled={pageNumber >= numPages}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* PDF Viewer */}
                <div className="flex-1 overflow-auto p-8 flex justify-center bg-muted">
                    <div className="relative shadow-xl bg-white" ref={pdfWrapperRef}>
                        <Document
                            file={pdfFile}
                            onLoadSuccess={onDocumentLoadSuccess}
                            className="flex flex-col items-center"
                        >
                            <Page
                                pageNumber={pageNumber}
                                scale={scale}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                            />
                        </Document>

                        {/* overlay signatures for current page */}
                        {signatures.filter(s => s.page === pageNumber).map(sig => (
                            <Rnd
                                key={sig.id}
                                size={{ width: sig.width, height: sig.height }}
                                position={{ x: sig.x, y: sig.y }}
                                bounds="parent"
                                onDragStop={(e, d) => {
                                    updateSignature(sig.id, { x: d.x, y: d.y });
                                }}
                                onResizeStop={(e, direction, ref, delta, position) => {
                                    updateSignature(sig.id, {
                                        width: parseInt(ref.style.width),
                                        height: parseInt(ref.style.height),
                                        ...position,
                                    });
                                }}
                                className="group border border-transparent hover:border-blue-500 rounded cursor-move"
                            >
                                <div className="relative w-full h-full">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={sig.dataUrl} alt="Signature" className="w-full h-full object-contain pointer-events-none" />
                                    <div className="absolute -top-3 -right-3 hidden group-hover:flex gap-1 z-50 pointer-events-auto">
                                        <button
                                            onClick={() => duplicateSignature(sig.id)}
                                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-1 shadow-lg cursor-pointer"
                                            title="Duplicate signature"
                                        >
                                            <Copy className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => deleteSignature(sig.id)}
                                            className="bg-red-500 hover:bg-red-600 text-white rounded-full p-1 shadow-lg cursor-pointer"
                                            title="Delete signature"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </Rnd>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Sidebar */}
            <div className="w-full md:w-80 bg-card border-border border-l flex flex-col h-screen shrink-0">
                <div className="p-6 border-border border-b">
                    <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground">
                        <Zap className="h-5 w-5 text-blue-500" />
                        Sign Document
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">Add signatures to your PDF</p>
                </div>

                <div className="p-6 space-y-4 flex-1">
                    <Dialog open={isDrawOpen} onOpenChange={setIsDrawOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-full h-24 flex flex-col gap-2 border-dashed border-2 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950">
                                <Edit3 className="h-6 w-6" />
                                <span>Draw Signature</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Draw your signature</DialogTitle>
                            </DialogHeader>
                            <div className="border-2 rounded-lg overflow-hidden bg-white">
                                <SignatureCanvas
                                    ref={signatureRef}
                                    penColor="#000000"
                                    canvasProps={{ className: "w-full h-64", style: { width: "100%", height: "256px", background: "#ffffff" } }}
                                />
                            </div>
                            <div className="flex justify-between mt-4">
                                <Button variant="ghost" onClick={() => signatureRef.current?.clear()}>Clear</Button>
                                <Button onClick={addSignatureFromCanvas}>Add Signature</Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isImageOpen} onOpenChange={setIsImageOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="w-full h-24 flex flex-col gap-2 border-dashed border-2 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950" onClick={() => setIsImageOpen(true)}>
                                <ImageIcon className="h-6 w-6" />
                                <span>Upload Signature</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Upload Image Signature</DialogTitle>
                            </DialogHeader>
                            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-muted hover:bg-muted/80 cursor-pointer" onClick={() => imageUploadRef.current?.click()}>
                                <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
                                <p className="text-sm font-medium text-foreground">Click to upload signature</p>
                                <p className="text-xs text-muted-foreground">Supports PNG, JPG (Transparent PNG recommended)</p>
                                <input
                                    type="file"
                                    ref={imageUploadRef}
                                    className="hidden"
                                    accept="image/png, image/jpeg"
                                    onChange={handleImageUpload}
                                />
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="p-6 border-t border-border bg-muted">
                    <Button
                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white font-medium text-lg"
                        onClick={handleDownload}
                    >
                        <Download className="mr-2 h-5 w-5" />
                        Download PDF
                    </Button>
                </div>
            </div>
        </div>
    );
}
