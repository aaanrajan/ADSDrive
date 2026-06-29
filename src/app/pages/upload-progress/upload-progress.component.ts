import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { UploadTask } from '../../model/upload-task.model';
import { FileService } from '../../shared/service/file.service';

@Component({
  standalone: false,
selector: 'app-upload-progress',
  templateUrl: './upload-progress.component.html', // Your template path
})
export class UploadProgressComponent {
  tasks: UploadTask[] = [];
  pauseMap = new Map<string, boolean>();
  cancelMap = new Map<string, boolean>();
  hiddenProgressBars = new Set<string>();
  showDetails = false;
  hidePanel = false;
  expandedSection: 'done' | 'error' | 'cancelled' | '' = '';
  hoveringPanel = false;
  uploadSub!: Subscription;
  autoCloseTimer: any;

  constructor(private fileService: FileService) {
    // Subscribe to upload tasks observable
    this.uploadSub = this.fileService.uploadTasks$.subscribe(tasks => {
      this.tasks = tasks;
      console.log("task:", tasks,);

      this.pauseMap = this.fileService.pauseMap;
      this.cancelMap = this.fileService.cancelMap;

      // If new uploads in progress → reopen panel
      if (this.groupByStatus(this.tasks, 'inProgress').length > 0) {
        this.hidePanel = false;
      }

      // If all uploads finished → close after 5s
      if (this.isAllUploadsFinalized(this.tasks)) {
        setTimeout(() => {
          // double-check in case new uploads started within 5s
          if (this.isAllUploadsFinalized(this.tasks) && !this.hoveringPanel) {
            this.hideProgressPanel();
          }
        }, 5000);
      }
    });
  }

  ngOnDestroy() {
    this.uploadSub.unsubscribe();
  }

  retryTask(task: UploadTask) {
    const newTask: UploadTask = {
      ...task,
      error: false,
      cancelled: false,
      progress: 0,
      done: false,
    };

    if (this.pauseMap.has(task.id)) {
      this.pauseMap.delete(task.id);
    }
    this.cancelMap.delete(task.id);
    this.fileService.enqueueTask(newTask);
  }

  startAutoCloseTimer() {
    clearTimeout(this.autoCloseTimer);
    this.autoCloseTimer = setTimeout(() => {
      if (this.isAllUploadsFinalized(this.tasks) && !this.hoveringPanel) {
        this.hideProgressPanel();
      }
    }, 5000);
  }

  clearAutoCloseTimer() {
    clearTimeout(this.autoCloseTimer);
  }


  togglePause(task: UploadTask) {
    if (this.pauseMap.has(task.id)) {
      this.pauseMap.delete(task.id);
    } else {
      this.pauseMap.set(task.id, true);
    }
  }

  cancelTask(task: UploadTask) {
    // Mark task as cancelled and update maps
    task.cancelled = true;
    this.pauseMap.delete(task.id);
    this.cancelMap.set(task.id, true);

    // Optionally notify FileService to stop upload if needed
  }

  toggleProgressBar(task: UploadTask) {
    if (this.hiddenProgressBars.has(task.id)) {
      this.hiddenProgressBars.delete(task.id);
    } else {
      this.hiddenProgressBars.add(task.id);
    }
  }

  hideProgressPanel() {
    this.hidePanel = true;
  }

  closePanel() {
    this.tasks = [];
    this.pauseMap.clear();
    this.cancelMap.clear();
    this.hiddenProgressBars.clear();
  }

  toggleSection(section: 'done' | 'error' | 'cancelled') {
    this.expandedSection = this.expandedSection === section ? '' : section;
  }

  countByStatus(tasks: UploadTask[], status: 'done' | 'error' | 'cancelled') {
    return tasks.filter(t => t[status] === true).length;
  }

  allDone(tasks: UploadTask[]): boolean {
    return tasks.length > 0 && tasks.every(t => t.done || t.error || t.cancelled);
  }

  isAllUploadsFinalized(tasks: UploadTask[]): boolean {
    return tasks.every(t => t.done || t.error || t.cancelled);
  }

  groupByStatus(tasks: UploadTask[], status: 'done' | 'error' | 'cancelled' | 'inProgress'): UploadTask[] {
    switch (status) {
      case 'done': return tasks.filter(t => t.done);
      case 'error': return tasks.filter(t => t.error);
      case 'cancelled': return tasks.filter(t => t.cancelled);
      case 'inProgress': return tasks.filter(t => !t.done && !t.error && !t.cancelled);
      default: return [];
    }
  }

  get allUploadsFinished(): boolean {
    return this.tasks.length > 0 && this.tasks.every(t => t.done || t.error);
  }
}
