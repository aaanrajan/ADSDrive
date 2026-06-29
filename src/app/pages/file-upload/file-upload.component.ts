import { Component } from '@angular/core';

@Component({
  standalone: false,
selector: 'app-file-upload',
  templateUrl: './file-upload.component.html',
  styleUrl: './file-upload.component.scss'
})
export class FileUploadComponent {

  isDragging = false;
  selectedFiles: File[] = [];

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;

    if (event.dataTransfer?.items) {
      const items = Array.from(event.dataTransfer.items);
      this.extractFilesFromItems(items);
    }
  }

  onFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files) {
      this.selectedFiles = Array.from(target.files);
    }
  }

  private async extractFilesFromItems(items: DataTransferItem[]) {
    const files: File[] = [];

    for (const item of items) {
      if (item.kind === 'file') {
        const entry = (item as any).webkitGetAsEntry?.();
        if (entry?.isDirectory) {
          await this.readDirectory(entry, files);
        } else {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
    }

    this.selectedFiles = files;
  }

  private readDirectory(entry: any, fileList: File[], path = ''): Promise<void> {
    return new Promise((resolve) => {
      const reader = entry.createReader();
      reader.readEntries(async (entries: any[]) => {
        for (const entry of entries) {
          if (entry.isDirectory) {
            await this.readDirectory(entry, fileList, `${path}${entry.name}/`);
          } else {
            entry.file((file: File) => {
              fileList.push(file);
            });
          }
        }
        resolve();
      });
    });
  }
}
