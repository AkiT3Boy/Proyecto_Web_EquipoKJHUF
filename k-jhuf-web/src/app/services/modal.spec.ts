import { TestBed } from '@angular/core/testing';
import { ModalService } from './modal.service';

describe('ModalService', () => {
  let service: ModalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ModalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should open and close login modal', (done) => {
    service.loginModalVisible$.subscribe(visible => {
      expect(visible).toBeDefined();
    });

    service.openLoginModal();
    service.closeLoginModal();
    done();
  });
});
