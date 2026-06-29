import { Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { FileService } from '../../shared/service/file.service';
import { AlertService } from '../../shared/alert-service/alert.service';
import { DriveConfig } from '../../shared/config/drive.config';

@Component({
  standalone: false,
selector: 'app-signup',
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss'
})
export class SignupComponent {
  registerForm!: FormGroup
  constructor(
    private _router: Router,
    private service: FileService,
    private fb: FormBuilder,
     private alertService: AlertService
  ) {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      firstName: ['', [Validators.required, this.noWhitespaceValidator]],
      lastName: [''],
      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/^(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/)
        ]
      ],
      contactNo: [
        '',
        [
          Validators.required,
          Validators.pattern('^[0-9]{10}$')
        ]
      ]
    });
  }

  register() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched(); // 🔁 triggers all validation messages
      return;
    }
    let data = {
        email: this.registerForm.get('email')?.value,
        password: this.registerForm.get('password')?.value,
        userType: 'USER',
        active: true,
        firstName: this.registerForm.get('firstName')?.value,
        lastName: this.registerForm.get('lastName')?.value,
        contactNo: this.registerForm.get('contactNo')?.value,
        mfaEnabled: false
    } 
    this.service.register(data).subscribe( (res: any)=> {
      if(res.success) {
        this.alertService.show('Account Created Succesfully.',  DriveConfig.VARIANTS.SUCCESS);
        this._router.navigate(['/login']);
      }
    })
  }

  onInputChange(event: any, controlName: string): void {
    const value = (event.target as HTMLInputElement).value;
    // this.registerForm.get(controlName)?.setValue(value);
    const control = this.registerForm.get(controlName);
    control?.setValue(value);
    control?.markAsTouched(); // 👈 This is important
  }

  noWhitespaceValidator(control: AbstractControl): ValidationErrors | null {
  const isWhitespace = (control.value || '').trim().length === 0;
  return isWhitespace ? { whitespace: true } : null;
}

}
