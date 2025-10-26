import { Component, OnInit } from '@angular/core';
import { IonicModule, ToastController, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { PhotoService, UserPhoto } from '../services/photo.service';
import { Router } from '@angular/router';
import { PhotoModalComponent } from '../components/photo-modal/photo-modal.component';

@Component({
  standalone: true,
  selector: 'app-tab2',
  templateUrl: './tab2.page.html',
  styleUrls: ['./tab2.page.scss'],
  imports: [IonicModule, CommonModule]
})
export class Tab2Page implements OnInit {
  constructor(
    public photoService: PhotoService,
    private toast: ToastController,
    private modalCtrl: ModalController,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.photoService.loadSaved();
  }

  get photos(): UserPhoto[] { return this.photoService.getPhotos(); }

  async addPhoto() {
    try {
      await this.photoService.addNewToGallery();
      (await this.toast.create({ message: 'Selfie enregistré', duration: 1200 })).present();
    } catch {
      (await this.toast.create({ message: 'Erreur prise de photo', color: 'danger', duration: 1500 })).present();
    }
  }

  async openModal(p: UserPhoto) {
    const modal = await this.modalCtrl.create({
      component: PhotoModalComponent,
      componentProps: { photo: p },
      breakpoints: [0, 0.6, 0.9, 1],
      initialBreakpoint: 0.9
    });
    await modal.present();
    const { data } = await modal.onDidDismiss();
    if (data?.action === 'map') this.router.navigateByUrl('/tabs/tab3');
  }

  async like(p: UserPhoto, ev: Event) {
    ev.stopPropagation();
    await this.photoService.toggleLike(p.id);
  }

  async removePhoto(p: UserPhoto, ev: Event) {
    ev.stopPropagation();
    await this.photoService.deletePhoto(p);
  }
}
