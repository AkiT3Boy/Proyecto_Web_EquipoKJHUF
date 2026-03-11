import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private loginModalVisibleSubject = new BehaviorSubject<boolean>(false);
  loginModalVisible$: Observable<boolean> = this.loginModalVisibleSubject.asObservable();

  constructor() {}

  openLoginModal(): void {
    this.loginModalVisibleSubject.next(true);
  }

  closeLoginModal(): void {
    this.loginModalVisibleSubject.next(false);
  }
}
