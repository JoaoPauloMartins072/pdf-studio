"use client";

import { PageAnnotationOverlay } from "@/components/editor/PageAnnotationOverlay";
import { DemoPayDownloadModal } from "@/components/editor/DemoPayDownloadModal";
import { ModelDirtyRenderCanvas } from "@/components/editor/ModelDirtyRenderCanvas";
import { OpenPdfLanding } from "@/components/editor/OpenPdfLanding";
import { PdfWorkspaceTopBar } from "@/components/editor/PdfWorkspaceTopBar";
import { PdfToolsToolbar } from "@/components/editor/PdfToolsToolbar";
import { RotateDeletePageBar } from "@/components/editor/RotateDeletePageBar";
import { RenderPdfPageCanvas } from "@/components/editor/RenderPdfPageCanvas";
import { PageThumbnailsRail } from "@/components/editor/PageThumbnailsRail";
import { SelectionActionsBar } from "@/components/editor/SelectionActionsBar";
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
        onUndo={() => ws.history.undo()}
        onRedo={() => ws.history.redo()}
        onDeleteSelected={ws.deleteSelected}
        hasSelection={!!ws.selectedId || ws.selectedObjectIds.length > 0}
      />

      <SelectionActionsBar
        selectionCount={ws.selectedObjectIds.length}
        onDuplicate={ws.duplicateSelected}
        onAlign={ws.alignSelected}
        onZOrder={ws.reorderSelected}
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
              height: ws.viewport.h,
              transform: `rotate(${ws.pageMeta[ws.srcPageIndex]?.rotation ?? 0}deg)`,
            }}
          >
            <RenderPdfPageCanvas
              pdf={ws.doc.pdf}
              pageIndex={ws.srcPageIndex}
              scale={1.25}
              onRendered={(w, h) => ws.setViewport({ w, h })}
            />
            {ws.documentModel && ws.baselineModel && (
              <ModelDirtyRenderCanvas
                documentModel={ws.documentModel}
                baseline={ws.baselineModel}
                displayList={ws.doc.displayList}
                pageIndex={ws.srcPageIndex}
                width={ws.viewport.w}
                height={ws.viewport.h}
                dirtyObjectIds={ws.dirtyObjectIds}
                onCoverSampled={ws.rememberCoverColor}
              />
            )}
            <div
              ref={ws.overlayRef}
              className="absolute inset-0 touch-none"
              style={{ cursor: toolCursor(ws.tool) }}
              onPointerDown={ws.onOverlayPointerDown}
              onPointerMove={ws.onOverlayPointerMove}
              onPointerUp={ws.onOverlayPointerUp}
              onPointerLeave={ws.clearHoverObject}
            >
              <PageAnnotationOverlay
                tool={ws.tool}
                viewport={ws.viewport}
                pageHeight={ws.pageHeight}
                annotations={ws.pageAnns}
                pageObjects={ws.pageObjects}
                selectedId={ws.selectedId}
                selectedObjectIds={ws.selectedObjectIds}
                hoverObjectId={ws.hoverObjectId}
                inlineEdit={ws.inlineEdit}
                drawDraft={ws.drawDraft}
                highlightDraft={ws.highlightDraft}
                onSelect={ws.setSelectedId}
                onStartDrag={ws.startAnnDrag}
                onChangeText={ws.updateText}
                onInlineDraftChange={ws.onInlineDraftChange}
                onInlineCommit={ws.onInlineCommit}
                onInlineCancel={ws.onInlineCancel}
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
