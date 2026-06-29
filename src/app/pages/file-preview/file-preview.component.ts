// file-preview.component.ts
import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { FileService } from "../../shared/service/file.service";
import { SharedService } from "../../shared/shared.service";
import { FileNode } from "../../model/drive-item";

@Component({
  standalone: false,
selector: "app-file-preview",
  templateUrl: "./file-preview.component.html",
})
export class FilePreviewComponent implements OnInit {
  @Input() selectedFile: any;
  @Input() showClose: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() favorite = new EventEmitter<any>();
  onCloseClick() {
    this.close.emit();
  }
  viewType:
    | "office"
    | "google"
    | "pdf"
    | "img"
    | "video"
    | "audio"
    | "text"
    | "download"
    | "unknown" = "unknown";

  isModalOpen = false;
  fileTextContent: string | null = null;
  isLoadingFileContent = false;
  fileLoadError: string | null = null;
  selectedFileUrl!: SafeResourceUrl;

  fileTypeCategory: "image" | "pdf" | "video" | "unknown" = "unknown";

  constructor(
    private sanitizer: DomSanitizer,
    private service: FileService,
    private sharedService: SharedService
  ) {}

  ngOnInit(): void {
    let url = this.service.downloadFile(this.selectedFile.fileDetailId);
    url = url + '&preview=true';
    console.log('url', url)
    this.viewType = this.sharedService.getViewType(
      this.selectedFile.fileType,
      true
    );
    this.selectedFileUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
      this.getPreviewUrl(url, this.viewType)
    );
    if (this.viewType === "text") {
      this.fileTextContent = null;
      this.loadPartialJsonPreview(url);
    } else {
      this.fileTextContent = null;
    }
  }

  downloadFile() {
    if (!this.selectedFile.fileDetailId) return;
    let downloadUrl;
    if (this.selectedFile.isFolder) {
      downloadUrl = this.service.downloadFolder(this.selectedFile.fileDetailId);
    } else {
      downloadUrl = this.service.downloadFile(this.selectedFile.fileDetailId); // Build or retrieve your actual download URL
    }
    if (downloadUrl) {
      window.open(downloadUrl, "_blank");
    } else {
      console.error("Invalid download URL");
    }
  }

  makeFavorite() {
    this.favorite.emit(this.selectedFile);
  }

  async loadPartialJsonPreview(url: string, maxBytes = 100 * 1024) {
    this.isLoadingFileContent = true;
    this.fileLoadError = null;
    this.fileTextContent = null;

    try {
      this.fileTextContent = await this.sharedService.loadPartialText(
        url,
        maxBytes
      );
    } catch (error) {
      console.error(error);
      this.fileLoadError = "Failed to load partial preview.";
    } finally {
      this.isLoadingFileContent = false;
    }
  }

  getPreviewUrl(url: string, type: string): string {
    return this.sharedService.getPreviewUrl(url, type);
  }
}
