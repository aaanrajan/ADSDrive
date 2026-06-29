import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { FileService } from '../../shared/service/file.service';
import { AppStorageService } from '../../shared/service/app-storage.service';
import { SharedService } from '../../shared/shared.service';
import { CommonModule } from '@angular/common';
import { SharedModule } from "../../shared/shared.module";

@Component({
  selector: 'app-recent-files',
  standalone: true,
  imports: [CommonModule, SharedModule],
  templateUrl: './recent-files.component.html',
  styleUrls: ['./recent-files.component.scss']
})
export class RecentFilesComponent implements OnInit {

  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  recentFiles: any[] = [];
  userId: string = '';
  breadcrums: any[] = [];
  isLoading: boolean = false;
  noMoreData: boolean = false;
  page: number = 0;
  size: number = 10;
  totalElements: number = 0;


  constructor(
    private fileService: FileService,
    private appStorageService: AppStorageService,
    private sharedService: SharedService
  ) { }

  ngOnInit(): void {
    this.userId = AppStorageService.getItem('userId') ?? '';
    this.breadcrums = [
      { label: 'Home', id: null },
      { label: 'Recent Files', id: 'recent' }
    ];
    this.loadAllRecentFiles(this.page);
  }

  loadAllRecentFiles(page: number): void {
    if (this.isLoading || this.noMoreData) return;
    this.isLoading = true;
    const data = {
      userId: this.userId,
      page: page,
      size: this.size,
      desc: true,
      onlyFiles: true,
      isRecent: true
    };

    this.fileService.getAllDriveItemsByUserId(data).subscribe({
      next: (res: any) => {
        this.isLoading = false;

        if (res?.success) {
          const newFiles = res.data?.content || [];
          this.totalElements = res.data?.totalElements || 0;

          if (this.recentFiles.length + newFiles.length >= this.totalElements) {
            this.noMoreData = true;
          }

          if (page === 0) {
            this.recentFiles = newFiles;
          } else {
            this.recentFiles = [...this.recentFiles, ...newFiles];
          }
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error loading files:', error);
      }
    });
  }

  onFileViewScrolled(scrolled: boolean) {
    if (
      scrolled &&
      !this.isLoading &&
      !this.noMoreData &&
      this.recentFiles.length < this.totalElements
    ) {
      this.page++;
      this.loadAllRecentFiles(this.page);
    }
  }

  formatSize(size: number): string {
    return this.sharedService.formatSize(size);
  }

  getIconForNode(node: any): string {
    return this.sharedService.getIconForNode(node.fileType, false, node.itemName);
  }
}
