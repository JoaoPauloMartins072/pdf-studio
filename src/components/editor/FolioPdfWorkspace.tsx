"use client";

import { PageAnnotationOverlay } from "@/components/editor/PageAnnotationOverlay";
import { DemoPayDownloadModal } from "@/components/editor/DemoPayDownloadModal";
import { OpenPdfLanding } from "@/components/editor/OpenPdfLanding";
import { PdfWorkspaceTopBar } from "@/components/editor/PdfWorkspaceTopBar";
import { PdfToolsToolbar } from "@/components/editor/PdfToolsToolbar";
import { RotateDeletePageBar } from "@/components/editor/RotateDeletePageBar";
import { RenderPdfPageCanvas } from "@/components/editor/RenderPdfPageCanvas";
import { PageThumbnailsRail } from "@/components/editor/PageThumbnailsRail";
import { toolCursor, useFolioPdfWorkspace } from "@/hooks/useFolioPdfWorkspace";

export function FolioPdfWorkspace() {
  const ws = useFolioPdfWorkspace();

  const fileInput = (
    <input
      ref={ws.fileInputRef}
      type="file"
      accept="application/pdf,.pdf"
      className="hidden"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) void ws.openFile(f);
        e.target.value = "";
      }}
    />
  );

  if (!ws.doc) {
    return (
      <OpenPdfLanding
        loading={ws.loading}
        error={ws.error}
        onPick={ws.pickPdf}
        fileInput={fileInput}
      />
    );
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-200">
      <PdfWorkspaceTopBar
        onOpen={ws.pickPdf}
        showDone
        onDone={() => ws.setCheckoutOpen(true)}
      />

      <PdfToolsToolbar
        tool={ws.tool}
        onTool={ws.selectTool}
        showThumbs={ws.showThumbs}
        onToggleThumbs={() => ws.setShowThumbs((v) => !v)}
        canUndo={ws.history.canUndo}
        canRedo={ws.history.canRedo}
        onUndo={() => ws.applySnapshot(ws.history.undo())}
        onRedo={() => ws.applySnapshot(ws.history.redo())}
        onDeleteSelected={ws.deleteSelected}
        hasSelection={!!ws.selectedId}
      />

      {ws.tool === "managePages" && (
        <RotateDeletePageBar
          pageLabel={`Page ${ws.current + 1} of ${ws.pageOrder.length}`}
          canDelete={ws.pageOrder.length > 1}
          onRotate={ws.rotateCurrent}
          onDelete={ws.deleteCurrentPage}
        />
      )}

      <div className="flex min-h-0 flex-1">
        {ws.showThumbs && (
          <PageThumbnailsRail
            pdf={ws.doc.pdf}
            pageOrder={ws.pageOrder}
            current={ws.current}
            onSelect={ws.setCurrent}
          />
        )}

        <div className="flex flex-1 justify-center overflow-auto p-6">
          <div
            className="relative bg-white shadow-lg"
            style={{
              width: ws.viewport.w,
              transform: `rotate(${ws.pageMeta[ws.srcPageIndex]?.rotation ?? 0}deg)`,
            }}
          >
            <RenderPdfPageCanvas
              pdf={ws.doc.pdf}
              pageIndex={ws.srcPageIndex}
              scale={1.25}
              onRendered={(w, h) => ws.setViewport({ w, h })}
            />
            <div
              ref={ws.overlayRef}
              className="absolute inset-0 touch-none"
              style={{ cursor: toolCursor(ws.tool) }}
              onPointerDown={ws.onOverlayPointerDown}
              onPointerMove={ws.onOverlayPointerMove}
              onPointerUp={ws.onOverlayPointerUp}
            >
              <PageAnnotationOverlay
                tool={ws.tool}
                viewport={ws.viewport}
                annotations={ws.pageAnns}
                textItems={ws.pageTexts}
                selectedId={ws.selectedId}
                drawDraft={ws.drawDraft}
                highlightDraft={ws.highlightDraft}
                onSelect={ws.setSelectedId}
                onEditNative={ws.editNativeText}
                onStartDrag={ws.startAnnDrag}
                onChangeText={ws.updateText}
              />
            </div>
          </div>
        </div>
      </div>

      {fileInput}
      <input
        ref={ws.imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void ws.onImagePicked(f);
          e.target.value = "";
        }}
      />

      <DemoPayDownloadModal
        open={ws.checkoutOpen}
        filename={ws.doc.filename}
        onClose={() => ws.setCheckoutOpen(false)}
        onConfirm={ws.generateAndDownload}
      />
    </div>
  );
}
