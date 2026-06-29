import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedService } from '../shared/shared.service';
import { Router } from "@angular/router";
import { FileService } from '../shared/service/file.service';
import { AppStorageService } from '../shared/service/app-storage.service';
import { AlertService } from '../shared/alert-service/alert.service';
import { DriveConfig } from '../shared/config/drive.config';
import { SharedModule } from '../shared/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
@Component({
  selector: 'app-right-side-bar',
  templateUrl: './right-side-bar.component.html',
  styleUrls: ['./right-side-bar.component.scss'],
  standalone: true,
  imports: [CommonModule,FormsModule,ReactiveFormsModule],
})
export class RightSideBarComponent implements OnInit {

  @Input() selectedItem: any;
  @Input() homeIcon: boolean = false;
  @Input() page: any;
  activeTab: 'details' | 'activity' | 'comments' = 'details';
  isMobileDetailView = false;
  isMobileView = false;
  activities: any[] = [
    {
      section: 'Today',
      items: [
        {
          user: 'You',
          action: 'edited',
          file: 'A3 ads bike.png',
          time: 'Today at 12:20 PM'
        }
      ]
    },
    {
      section: 'Yesterday',
      items: [
        {
          user: 'You',
          action: 'shared',
          file: 'A3 ads bike.png',
          extra: 'with logeshs094@gmail.com',
          time: 'Yesterday at 3:00 PM'
        },
        {
          user: 'You',
          action: 'renamed',
          file: 'Bike design.png',
          newFile: 'A3 ads bike.png',
          time: 'Yesterday at 2:10 PM'
        }
      ]
    },
    {
      section: 'Last week',
      items: [
        {
          user: 'You',
          action: 'shared edit access',
          extra: 'to Madhan kumar',
          time: 'Thursday at 10:20 AM'
        },
        {
          user: 'You',
          action: 'commented on',
          file: 'A3 ads bike.png',
          time: 'Thursday at 8:20 AM'
        }
      ]
    },
    {
      section: 'July 21, 2025',
      items: [
        {
          user: 'You',
          action: 'edited',
          file: 'A3 ads bike.png',
          time: 'July 21, 2025 at 12:20 PM'
        },
        {
          user: 'You',
          action: 'shared edit access',
          extra: 'to Pradeep kumar',
          time: 'Thursday at 10:20 AM'
        }
      ]
    }
  ];
  // comments: any[] = [
  //   {
  //     section: 'Today',
  //     items: [
  //       {
  //         emai:"pradeep.natarajan@alldirectionsource.com",
  //         userName: 'Pradeep',
  //         action: 'commented',
  //         message: 'Need to improve the Banner design',
  //         time: 'Today at 12:20 PM',
  //          replies: [
  //   {
  //     user: 'Pradeep',
  //     message: 'Sure, I will update it.',
  //     time: 'Yesterday at 4:00 PM'
  //   },
  // ],
  //         avatar: 'assets/user1.png'
  //       }
  //     ]
  //   },
  //   {
  //     section: 'Yesterday',
  //     items: [
  //       {
  //         emai:"pradeep@alldirectionsource.com",
  //         userName: 'Madhan',
  //         action: 'commented',
  //         message: 'Add the filter to look better',
  //         time: 'Yesterday at 3:30 PM',
  //         avatar: 'assets/user2.png',
  //         replies:[]
  //       }
  //     ]
  //   }
  // ];
  @Output() backClicked = new EventEmitter<void>();
  loggedInUser = AppStorageService.getItem('email')
  comments:any[]=[]
  userId:any;
  email:any;
  showCommandDialog: boolean = false;
  commandText: string = "";
  selectedComment : any
  isSubmitting:boolean=false
  
  constructor(private sharedService: SharedService, private router: Router,private fileService : FileService,private alertService: AlertService,) { }

  ngOnInit() {
    this.userId = AppStorageService.getItem("userId");
    this.email = AppStorageService.getItem('email');
    this.checkMobileView();
    window.addEventListener('resize', () => this.checkMobileView());
  }

  ngOnChanges() {
    if (this.selectedItem) {
      console.log('selectedItem',this.selectedItem)
      this.selectedItem.color = this.selectedItem.color || '#FBBF24';
      this.selectedItem.darkenColor =
        this.sharedService.darkenColor(this.selectedItem.color, 20);
        this.getComment()
    }
  }

  checkMobileView() {
    this.isMobileView = window.innerWidth <= 640;
  }

  setActiveTab(tab: 'details' | 'activity' | 'comments') {
    if (this.isMobileView) {
      this.activeTab = 'details';
      return;
    }
    this.activeTab = tab;
  }

  goBack() {
    this.backClicked.emit();
  }

  formatSize(size?: number): string {
    return this.sharedService.formatSize(size);
  }

  getIconForNode(node: any): string {
    return this.sharedService.getIconForNode(
      node?.fileType,
      node?.isFolder,
      node?.itemName
    );
  }

  getComment() {
    console.log(this.selectedItem)
    this.fileService.getComment(this.selectedItem.driveItemId).subscribe((res: any) => {
      if (res) {
        this.comments = Object.keys(res).map((key) => ({
          section: key,
          items: res[key].map((item: any) => ({
            id: item.id,
            driveItemId: item.driveItemId,
            userId: item.userId,
            userName: item.userName,
            email: item.email,
            action: 'commented',
            message: item.message,
            parentId: item.parentId,
            isEdited: item.isEdited,
            createdDate: item.createdDate,
            time: this.formatTime(item.createdDate),
            replies: (item.replies || []).map((reply: any) => ({
              id: reply.id,
              driveItemId: reply.driveItemId,
              userId: reply.userId,
              userName: reply.userName,
              email: reply.email,
              action: 'replied',
              message: reply.message,
              parentId: reply.parentId,
              isEdited: reply.isEdited,
              createdDate: reply.createdDate,
              time: this.formatTime(reply.createdDate)
            }))
          }))
        }));
      }
    })
  }

  formatTime(date: string): string {
    return new Date(date).toLocaleString();
  }


  openReplyDialog(item: any) {
    this.isEditMode =false
    this.selectedComment = item
    this.commandText = "";
    this.showCommandDialog = true;
  }

  closeCommandDialog() {
    this.showCommandDialog = false;
  }

  submitCommand() {
    this.isSubmitting = true
    let data :any= {
      userId: this.userId,
      userName: this.email,
      message: this.commandText,
      driveItemId: this.selectedComment.driveId,     
      shareDetailId:this.selectedItem.shareDetailId,
      itemName: this.selectedItem.itemName
    }
    if(this.editAction == 'REPLY' && this.isEditMode){
      data['id'] = this.selectedReplyComment?.id
      data['parentId']= this.selectedComment.id
    } else if(this.editAction == 'DIRECT' && this.isEditMode){
      data['id'] = this.selectedComment?.id
    } else {
       data['parentId']= this.selectedComment.id
    }
    this.fileService.commentpost(data).subscribe({
      next: (res: any) => {
        this.alertService.show("Comment added successfully!", DriveConfig.VARIANTS.SUCCESS);
        this.showCommandDialog = false;
        this.isSubmitting = false
        this.getComment()
      }, error: (error: any) => {
        console.error('Move operation failed:', error);
        this.alertService.show("Failed to Submit", DriveConfig.VARIANTS.DANGER);
        this.isSubmitting = false
      },
    });

  }

  deleteReply(item: any, replyIndex: any, replyItem: any) {
    item.replies.splice(replyIndex, 1);
    this.fileService.deleteComment(replyItem.id).subscribe({
      next: (res: any) => {
        this.alertService.show("Comment delete successfully!", DriveConfig.VARIANTS.SUCCESS);
        this.selectedCommentItem = null
        this.replyItem = null
        this.replyIndex = null
        this.deleteAction = null
        this.isShowConfirmationModel = false;  
        this.getComment()
      }, error: (error: any) => {
        this.alertService.show("Failed to delete", DriveConfig.VARIANTS.DANGER);
        this.isSubmitting = false
      },
    });
  }

    deleteDirectComment(item: any , index:any) {
    this.comments.splice(index, 1);
    this.fileService.deleteDirectComment(item.id).subscribe({
      next: (res: any) => {
        if(res){
        this.alertService.show("Comment delete successfully!", DriveConfig.VARIANTS.SUCCESS);
        this.selectedCommentItem = null
        this.replyItem = null
        this.replyIndex = null
        this.deleteAction = null
        this.isShowConfirmationModel = false;  
        this.getComment()
        }

      }, error: (error: any) => {
        this.alertService.show("Failed to delete", DriveConfig.VARIANTS.DANGER);
        this.isSubmitting = false
      },
    });
  }

  modelTitle: string = '';
  modelMessage: string = '';
  actionBtn: string = '';
  revertBtnText: string = '';
  isShowConfirmationModel: boolean = false;
  replyItem:any
  replyIndex:any
  selectedCommentItem:any
  deleteAction:any
  directCommentIndex:any
  openConfirmationModel(action?:any,item?: any, replyIndex?: any, replyItem?: any,directCommentIndex?:any) {
    this.revertBtnText = 'Cancel';
    this.actionBtn =  'Confirm' 
    this.modelTitle = 'Delete';
    this.modelMessage = 'Are you sure you want to  delete these comment? This action cannot be undone.'
    this.selectedCommentItem = item
    this.replyItem = replyItem
    this.replyIndex = replyIndex
    this.directCommentIndex  = directCommentIndex
    this.deleteAction = action
    this.isShowConfirmationModel = true;  
  }

   closeModel(res: boolean) {
    if (res) {  
      if(this.deleteAction == 'REPLY'){
        this.isShowConfirmationModel = false;  
        this.deleteReply(this.selectedCommentItem,this.replyIndex,this.replyItem)
      } else {
        this.deleteDirectComment(this.selectedCommentItem,this.directCommentIndex)
      }
      
    } else {
     this.isShowConfirmationModel = false;  
    }
  }
  editAction:any
  selectedReplyComment:any
  isEditMode:boolean=false
   openEditDialog(action?:any,item?: any,replyIndex?:any,replyItem?:any) {    
    this.editAction = action
    this.selectedComment = item
    this.isEditMode = true
    if(action == 'REPLY'){
     this.commandText = replyItem.message;
     this.selectedReplyComment = replyItem
    } else{
      this.commandText = item.message;      
    }    
    this.showCommandDialog = true;
  }
}