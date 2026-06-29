import { Component, OnInit, AfterViewInit, ViewChildren, QueryList, ElementRef } from "@angular/core";
import { AppStorageService } from "../../shared/service/app-storage.service";
import { FileService } from "../../shared/service/file.service";
import { CommonModule } from "@angular/common";
import { SharedService } from "../../shared/shared.service";
import { Router } from "@angular/router";
import { ElectronFileService } from '../../shared/service/electron.service';

interface FileItem {
  name: string;
  type: string;
  icon: string;
}

interface Person {
  name: string;
  email: string;
  profilePic: string;
  visibleFiles: any[];
  extraCount: number;
  userId: string;
   allFiles: any[];
}

@Component({
  selector: "app-people",
  imports: [CommonModule],
  templateUrl: "./people.component.html",
  styleUrls: ["./people.component.scss"],
})
export class PeopleComponent implements OnInit, AfterViewInit {
  people: Person[] = [];
  loading = true;;
  errorMessage = "";
  isElectron: boolean = false;
  skeletonItems = Array(8).fill(0);

  constructor(
    private fileService: FileService,
    private sharedService: SharedService,
    private router: Router,
    private electrionFileService: ElectronFileService
  ) {}

  ngOnInit() {
    this.getUserData();
  }
  
  @ViewChildren('fileRow') fileRows!: QueryList<ElementRef>;


ngAfterViewInit() {
  setTimeout(() => this.adjustVisibleFiles(), 0);

  window.addEventListener('resize', () => {
    setTimeout(() => this.adjustVisibleFiles(), 100);
  });
}
  adjustVisibleFiles() {
  if (!this.fileRows) return;

  this.fileRows.forEach((row: ElementRef, index: number) => {
    const person = this.people[index];
    if (!person || !person.allFiles) return;

    const rowEl = row.nativeElement;
    const containerWidth = rowEl.clientWidth;

    const fileElements = rowEl.querySelectorAll('.file-badge'); 
    let fileWidth = 50; 

    if (fileElements.length > 0) {
      const rect = fileElements[0].getBoundingClientRect();
      fileWidth = rect.width + 6; 
    }

    const countBubbleWidth = 38; 
    let maxFit = Math.floor((containerWidth - countBubbleWidth) / fileWidth);

    if (maxFit < 1) maxFit = 1;

    if (person.allFiles.length > maxFit) {
      person.visibleFiles = person.allFiles.slice(0, maxFit);
      person.extraCount = person.allFiles.length - maxFit;
    } else {
      person.visibleFiles = person.allFiles;
      person.extraCount = 0;
    }
  });
}
  getIconForNode(node: any): string {
    return this.sharedService.getIconForNode(
      node?.fileType,
      node?.isFolder,
      node?.itemName
    );
  }


  goAllPeople(user: any): void {
    let obj = {
      name: user.name,
      email: user.email,
      userId: user.userId
    }
    const encodedUser = btoa(JSON.stringify(obj)); // encode full user object
    this.router.navigate(["/drive/people-view"], {
      queryParams: { user: encodedUser }
    });
  }



  getUserData() {
    const userId = AppStorageService.getItem("userId");
    this.loading = true;
    this.errorMessage = "";

    this.fileService.getUserDetails(userId).subscribe({
      next: (res: any) => {

        if (res?.success && Array.isArray(res.data)) {
          this.people = res.data.map((p: any) => {
            const files = p.fileDetails;
            const visible = files.slice(0, 4);
              visible.forEach((node: any) => {
              node.color = node.color || "#FBBF24";
              node.darkenColor = this.sharedService.darkenColor(node.color, 20);
            });
            return {
              userId: p.userId || p._id,
              name: this.getDisplayName(p),
              // name: p.firstName || 'Unknown',
              email: p.email || "No email",
              profilePic: p.profilePic || "assets/default-avatar.png",
              allFiles: files,                             
              visibleFiles: files.slice(0, 4),
              extraCount: files.length - 4 , 
            } as Person;
          });
  
        setTimeout(() => this.adjustVisibleFiles(), 0);
         } else {
          this.people = [];
          this.errorMessage = res?.message || "No data found.";
        }

        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = "Server error while fetching people.";
      },
    });
  }
  getDisplayName(person: any): string {
    if (person.firstName && person.firstName.trim().length > 0) {
      return person.firstName.trim();
    }

    if (person.email && person.email.includes("@")) {
      const username = person.email.split("@")[0];
      return username.charAt(0).toUpperCase() + username.slice(1);
    }

    return "Unknown";
  }

  getFileIcon(file: any): string {
    if (file.isFolder) return "assets/icons/folder.png";
    const type = file.fileType?.toLowerCase() || "";

    if (type.includes("pdf")) return "assets/icons/pdf.png";
    if (type.includes("xls") || type.includes("spreadsheet"))
      return "assets/icons/xls.png";
    if (
      type.includes("image") ||
      type.includes(".png") ||
      type.includes(".jpg")
    )
      return "assets/icons/image.png";
    if (type.includes("video")) return "assets/icons/video.png";

    return "assets/icons/file.png";
  }

  getInitial(name: string): string {
    return name ? name.charAt(0).toUpperCase() : "";
  }


getColor(person: any): string {
  const colors = ['bg-red-500','bg-green-500','bg-blue-500','bg-yellow-500','bg-purple-500'];
  const userName = person?.name || '';
  if (!userName) return 'bg-gray-400';
  const index = userName.charCodeAt(0) % colors.length;
  return colors[index];
}
}
