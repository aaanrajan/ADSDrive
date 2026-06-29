import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { FileService } from '../../shared/service/file.service';
import { AppStorageService } from '../../shared/service/app-storage.service';


// interface Note {
//   title: string;
//   description: string;
//   pinned?: boolean;
//   color?: string;
// }

interface Note {
  id?: string;
  title: string;
  content: string;
  pinned: boolean;
  color: string;
  archived: boolean;
  userId: string;

}


@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [CommonModule, FormsModule, QuillModule],
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.scss'],
})
export class NotesComponent implements OnInit {

  isExpanded = false;
  openMenuNote: Note | null = null;
  selectedNote: Note | null = null;
  quillInstance: any;
  editorPaletteOpen = false;
  activeFormats: any = {};
  addQuillInstance: any;
  @ViewChild('noteBox') noteBox!: ElementRef;
  @ViewChild('addEditor') addEditor: any;
  deleteNoteData: Note | null = null;
  title = '';
  description = '';
  notes: Note[] = [];
  openPaletteNote: Note | null = null;
  colors: string[] = [
    'bg-white',
    'bg-red-200',
    'bg-orange-200',
    'bg-yellow-200',
    'bg-green-200',
    'bg-teal-200',
    'bg-blue-200',
    'bg-indigo-200',
    'bg-purple-200',
    'bg-pink-200',
    'bg-gray-200'
  ];
  quillModules = {
    toolbar: false,
    history: {
      delay: 500,
      maxStack: 100,
      userOnly: true
    }
  };

  constructor(private service: FileService) { }

  ngOnInit() {
    this.loadNotes();
  }

  loadNotes() {
    const userId = AppStorageService.getItem("userId");

    this.service.getNotes(userId).subscribe((res: any) => {
      console.log("API Response:", res);

      if (res?.data) {
        this.notes = [...res.data].reverse();
      }
    });
  }

  addNote() {

    if (!this.title && !this.description) return;

    const payload = {
      title: this.title,
      content: this.description,
      pinned: false,
      color: 'bg-white',
      archived: false,
      userId: AppStorageService.getItem("userId")
    };

    this.service.createNote(payload).subscribe(() => {
      this.loadNotes();
    });

    this.title = '';
    this.description = '';
    if (this.addEditor) {
      this.addEditor.quillEditor.setText('');
    }
    this.isExpanded = false;
  }

  toggleMenu(note: Note, event: MouseEvent) {
    event.stopPropagation();
    this.openMenuNote = this.openMenuNote === note ? null : note;
  }

  openEditor(note: Note, event: MouseEvent) {
    event.stopPropagation();
    this.selectedNote = note;
    this.openMenuNote = null;
  }

  copyNote(note: Note, event: MouseEvent) {
    event.stopPropagation();

    const textContent = `
${note.title || ''}
${this.stripHtml(note.content || '')}
  `;

    navigator.clipboard.writeText(textContent);
    this.openMenuNote = null;
  }

  stripHtml(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  confirmDelete(note: Note, event: MouseEvent) {
    event.stopPropagation();
    this.deleteNoteData = note;
    this.openMenuNote = null;
  }

  deleteConfirmed() {
    if (!this.deleteNoteData) return;

    this.service.deleteNote(this.deleteNoteData.id!).subscribe(() => {
      this.loadNotes();
      this.deleteNoteData = null;
    });

  }

  cancelDelete() {
    this.deleteNoteData = null;
  }

  closeEditor() {

    if (!this.selectedNote?.content) return;

    const payload = {
      title: this.selectedNote.title,
      content: this.selectedNote.content,
      pinned: this.selectedNote.pinned,
      color: this.selectedNote.color,
      archived: this.selectedNote.archived,
      userId: this.selectedNote.userId
    };

    this.service.updateNote(this.selectedNote.id!, payload)
      .subscribe(() => {
        this.loadNotes();   // reload from backend
        this.selectedNote = null;
      });

  }

  togglePin(note: Note, event: MouseEvent) {
    event.stopPropagation();

    this.service.updatePinned(note.id!, !note.pinned)
      .subscribe(() => {
        this.loadNotes();
      });
  }

  get pinnedNotes() {
    return this.notes.filter(note => note.pinned);
  }

  get otherNotes() {
    return this.notes.filter(note => !note.pinned);
  }

  @HostListener('document:click', ['$event'])
  clickOutside(event: MouseEvent) {

    if (this.noteBox && !this.noteBox.nativeElement.contains(event.target)) {

      if (this.isExpanded) {

        if (this.title || (this.description && this.description !== '<p><br></p>')) {
          this.addNote();
        }

        this.isExpanded = false;

        if (this.addQuillInstance) {
          this.addQuillInstance.setText('');
        }
      }

      this.openMenuNote = null;
    }
  }

  expandNote() {
    this.isExpanded = true;
  }


  togglePalette(note: Note, event: MouseEvent) {
    event.stopPropagation();
    this.openPaletteNote =
      this.openPaletteNote === note ? null : note;
  }


  setColor(note: Note, color: string, event: MouseEvent) {
    event.stopPropagation();

    note.color = color;

    const payload = {
      title: note.title,
      content: note.content,
      pinned: note.pinned,
      color: note.color,
      archived: note.archived,
      userId: note.userId
    };

    this.service.updateNote(note.id!, payload)
      .subscribe(() => {
        this.loadNotes();
      });

    this.openPaletteNote = null;
  }

  format(type: string, value?: any) {

    const editor = this.selectedNote ? this.quillInstance : this.addQuillInstance;

    if (!editor) return;

    const range = editor.getSelection(true);
    if (!range) return;

    const currentFormat = editor.getFormat(range);

    if (type === 'header') {

      const range = editor.getSelection(true);
      if (!range) return;

      const current = editor.getFormat();

      // 👉 correct sizes
      const sizeValue = value === 1 ? 'large' : 'small';

      if (current.size === sizeValue) {
        editor.format('size', false);
        editor.format('bold', false);
      } else {
        editor.format('size', sizeValue);
        editor.format('bold', true);
      }

      return;
    }

    if (type === 'clean') {
      editor.removeFormat(range.index, range.length);
      return;
    }

    const isActive = currentFormat[type];
    editor.format(type, !isActive);
  }

  isEmpty(content: string): boolean {
    return !content || content === '<p><br></p>';
  }

  onEditorCreated(quill: any) {
    this.quillInstance = quill;

    if (this.selectedNote?.content) {
      quill.clipboard.dangerouslyPasteHTML(this.selectedNote.content);
    }

    quill.on('text-change', (delta: any, old: any, source: any) => {

      if (this.selectedNote) {
        this.selectedNote.content = quill.root.innerHTML;
      }

      if (source !== 'user') return;

      const text = quill.getText();
      const urlRegex = /(https?:\/\/[^\s]+)/g;

      let match;
      while ((match = urlRegex.exec(text)) !== null) {
        const url = match[0];
        const index = match.index;

        quill.formatText(index, url.length, 'link', url);
      }
    });

    quill.root.addEventListener('click', (event: any) => {
      const target = event.target;
      if (target.tagName === 'A') {
        event.preventDefault();
        window.open(target.getAttribute('href'), '_blank');
      }
    });
  }

  undo() {
    const editor = this.selectedNote ? this.quillInstance : this.addQuillInstance;
    if (!editor) return;
    editor.getModule('history').undo();
  }

  redo() {
    const editor = this.selectedNote ? this.quillInstance : this.addQuillInstance;
    if (!editor) return;
    editor.getModule('history').redo();
  }

  clearFormatting() {
    const editor = this.selectedNote ? this.quillInstance : this.addQuillInstance;

    if (!editor) return;

    const range = editor.getSelection(true);
    if (!range) return;
    editor.removeFormat(range.index, range.length);
    editor.format('bold', false);
    editor.format('italic', false);
    editor.format('underline', false);
    editor.format('header', false);
  }

  onAddEditorCreated(quill: any) {
    this.addQuillInstance = quill;

    quill.on('text-change', (delta: any, old: any, source: any) => {
      this.description = quill.root.innerHTML;

      if (source !== 'user') return;

      const text = quill.getText();
      const urlRegex = /(https?:\/\/[^\s]+)/g;

      let match;
      while ((match = urlRegex.exec(text)) !== null) {
        const url = match[0];
        const index = match.index;

        quill.formatText(index, url.length, 'link', url);
      }
    });

    // 👉 click open
    quill.root.addEventListener('click', (event: any) => {
      const target = event.target;
      if (target.tagName === 'A') {
        event.preventDefault();
        window.open(target.getAttribute('href'), '_blank');
      }
    });
  }

  autoResize(event: any) {
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  convertLinks(content: string): string {
    if (!content) return '';

    const urlRegex = /(https?:\/\/[^\s]+)/g;

    return content.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
  }
}