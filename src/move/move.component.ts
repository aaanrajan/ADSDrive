import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FileService } from '../shared/service/file.service';
import { AlertService } from '../shared/alert-service/alert.service';
import { DriveConfig } from '../shared/config/drive.config';
import { AppStorageService } from '../shared/service/app-storage.service';

@Component({
  selector: 'app-move',
  standalone: true,
  templateUrl: './move.component.html',
  styleUrls: ['./move.component.scss'],
  imports: [CommonModule],
})
export class MoveComponent {
  @Input() mode: 'move' | 'copy' = 'move';
  @Input() selectedNodeIds: string[] = [];
  @Input() moveSourceNode: any;
  @Output() cancelClicked = new EventEmitter<void>();
  @Output() actionConfirmed = new EventEmitter<{
    targetId: string;
    mode: 'move' | 'copy';
    success: boolean;
  }>();

  moveDialogOpen = true;
  currentFolderChildren: any[] = [];
  folderPath: any[] = [];
  loadingFolders = false;
  moveTargetFolder: any = null;
  userId = AppStorageService.getItem("userId");

  homeNode = {
    id: null,
    itemName: "My files",
    isFolder: true,
  };
  moveSourceNodeId: any;

  constructor(
    private fileService: FileService,
    private alertService: AlertService
  ) { }

  ngOnInit() {
    this.loadRootFolders();
  }

  loadRootFolders() {
    this.loadingFolders = true;
    this.folderPath = [this.homeNode];
    this.moveTargetFolder = this.homeNode;

    this.fileService.loadChilderen(null, this.userId).subscribe({
      next: (res: any) => {
        if (res?.success) {
          this.loadingFolders = false;
          this.homeNode.id = res.data[0].parentId;
          this.currentFolderChildren = res.data
            .filter((item: any) => item.isFolder)
            .sort((a: any, b: any) => a.itemName.localeCompare(b.itemName));

          if (this.mode === 'move') {
            const idsToExclude = new Set([
              ...(this.selectedNodeIds || []),
              this.moveSourceNode?.id
            ].filter(Boolean));

            this.currentFolderChildren = this.currentFolderChildren.filter(
              (item: any) => !idsToExclude.has(String(item.id))
            );
          }
        } else {
          this.currentFolderChildren = [];
        }
      },
      error: () => {
        this.loadingFolders = false;
        this.currentFolderChildren = [];
      }
    });

  }

  navigateToFolder(folder: any) {

    const index = this.folderPath.findIndex(f => f.id === folder.id);
    if (index !== -1) {
      this.folderPath = this.folderPath.slice(0, index + 1);
    } else {
      this.folderPath.push(folder);
    }

    this.moveTargetFolder = folder;
    this.loadingFolders = true;

    this.fileService.loadChilderen(folder.id, this.userId).subscribe({
      next: (res: any) => {
        this.loadingFolders = false;

        if (res?.success) {

          // 1️⃣ Filter only folders + sort ascending
          this.currentFolderChildren = res.data
            .filter((item: any) => item.isFolder)
            .sort((a: any, b: any) => a.itemName.localeCompare(b.itemName));

          // 2️⃣ Exclude items in MOVE mode
          if (this.mode === 'move') {

            const idsToExclude = new Set([
              ...(this.selectedNodeIds || []),
              this.moveSourceNode?.id
            ].filter(Boolean));

            this.currentFolderChildren = this.currentFolderChildren.filter(
              (item: any) => !idsToExclude.has(String(item.id))
            );
          }

        } else {
          this.currentFolderChildren = [];
        }
      },
      error: () => {
        this.loadingFolders = false;
        this.currentFolderChildren = [];
      }
    });

  }



  createNewFolderInMoveDialog() {
    if (this.loadingFolders) return;

    const baseName = "New Folder";
    let name = baseName;
    let count = 1;

    this.loadingFolders = true;

    const existingNames =
      this.currentFolderChildren
        ?.filter((n) => n.isFolder)
        ?.map((n: any) => n.itemName.toLowerCase()) || [];

    while (existingNames.includes(name.toLowerCase())) {
      name = `${baseName} ${count++}`;
    }

    const parentId = this.moveTargetFolder?.id;

    const newFolder = {
      userId: this.userId,
      itemName: name,
      isFolder: true,
      parentId,
      color: "#FBBF24",
    };

    this.fileService.createOrUpdateFileAndFolder(newFolder).subscribe({
      next: (res: any) => {
        this.loadingFolders = false;

        if (res?.success) {
          this.alertService.show(
            "Folder created successfully!",
            DriveConfig.VARIANTS.SUCCESS
          );

          this.currentFolderChildren.unshift({
            ...res.data,
            isFolder: true,
          });

          if (this.mode === "move") {
            this.currentFolderChildren = this.currentFolderChildren.filter(
              (item: any) => item.id !== this.moveSourceNode?.id
            );
          }
        }
      },

      error: (err: any) => {
        this.loadingFolders = false;

        if (err.status === 409) {
          this.alertService.show(
            "Folder already exists. Please use a different name.",
            DriveConfig.VARIANTS.WARNING
          );
        } else {
          this.alertService.show(
            err?.error?.errorMessage || "Error creating folder.",
            DriveConfig.VARIANTS.DANGER
          );
        }
      },
    });
  }


  confirmAction() {
    if (!this.userId) {
      this.alertService.show("User authentication required", DriveConfig.VARIANTS.DANGER);
      this.emitActionResult(false);
      return;
    }

    let targetId = this.moveTargetFolder?.id;

    if (targetId === null || targetId === undefined) {
      const last = this.folderPath[this.folderPath.length - 1];
      targetId = last?.id || null;
    }

    if (targetId === null) {
      this.alertService.show("Please select a destination folder", DriveConfig.VARIANTS.DANGER);
      return;
    }

    this.moveTargetFolder = { ...this.moveTargetFolder, id: targetId };

    const movedIds = this.getMoveIds();

    if (movedIds.length === 0) {
      this.alertService.show("No items selected to move/copy", DriveConfig.VARIANTS.DANGER);
      return;
    }

    if (this.isMovingIntoItself(movedIds)) {
      this.alertService.show(`Cannot ${this.mode} a folder into itself`, DriveConfig.VARIANTS.DANGER);
      this.emitActionResult(false);
      return;
    }

    if (this.mode === 'move') {
      this.moveItems(movedIds);
    } else {
      this.copyItems(movedIds);
    }
  }

  private getMoveIds(): string[] {
    if (this.selectedNodeIds.length > 0) {
      return this.selectedNodeIds;
    } else if (this.moveSourceNodeId) {
      return [this.moveSourceNodeId];
    }
    return [];
  }

  private isMovingIntoItself(movedIds: string[]): boolean {
    return movedIds.includes(this.moveTargetFolder.id);
  }

  private moveItems(movedIds: string[]) {
    const userId = this.userId!;
    const isMultiple = movedIds.length > 1;

    const moveApi = isMultiple
      ? this.fileService.multipleMoveFolderOrFile(movedIds, this.moveTargetFolder.id, userId)
      : this.fileService.moveFileOrFolder(movedIds[0], this.moveTargetFolder.id, userId);

    moveApi.subscribe({
      next: (res: any) => {
        if (res?.success) {
          this.alertService.show(
            isMultiple ? "Items moved successfully" : "Item moved successfully",
            DriveConfig.VARIANTS.SUCCESS
          );
          this.emitActionResult(true);
        } else {
          this.alertService.show("Move operation failed", DriveConfig.VARIANTS.DANGER);
          this.emitActionResult(false);
        }
      },
      error: (error: any) => {
        console.error('Move operation failed:', error);
        this.alertService.show(
          isMultiple ? "Failed to move items" : "Failed to move item",
          DriveConfig.VARIANTS.DANGER
        );
        this.emitActionResult(false);
      },
    });
  }

  private copyItems(movedIds: string[]) {
    const userId = this.userId!;
    const isMultiple = movedIds.length > 1;

    this.fileService.paste(movedIds, this.moveTargetFolder.id, userId).subscribe({
      next: (res: any) => {
        if (res?.success) {
          this.alertService.show(
            isMultiple ? "Items copied successfully" : "Item copied successfully",
            DriveConfig.VARIANTS.SUCCESS
          );
          this.emitActionResult(true);
        } else {
          this.alertService.show("Copy operation failed", DriveConfig.VARIANTS.DANGER);
          this.emitActionResult(false);
        }
      },
      error: (error: any) => {
        console.error('Copy operation failed:', error);
        this.alertService.show(
          isMultiple ? "Failed to copy items" : "Failed to copy item",
          DriveConfig.VARIANTS.DANGER
        );
        this.emitActionResult(false);
      },
    });
  }

  private emitActionResult(success: boolean) {
    if (!this.moveTargetFolder?.id) {
      console.error("Move target is missing");
      return;
    }

    this.actionConfirmed.emit({
      targetId: this.moveTargetFolder.id,
      mode: this.mode,
      success,
    });
  }

  closeDialog() {
    this.moveDialogOpen = false;
    this.cancelClicked.emit();
  }
}