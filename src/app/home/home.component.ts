/* eslint-disable max-len */
/* eslint-disable curly */
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as JSZip from 'jszip';
import { ElectronService } from '../core/services';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  @ViewChild('comic', { static: false }) comic!: ElementRef;
  title = 'app';
  imageURL = '';
  zip = new JSZip();
  pages: Array<string> = [];

  constructor(public electron: ElectronService){
  }

  ngOnInit(): void {
  }

  async onFileSelected(event: any){
    this.electron.fs.mkdtemp('comics', (err, folder) => {
      console.log(folder);
      this.electron.childProcess.exec(`unrar x "${event.target.files[0].path}" -op ${folder}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`error: ${error.message}`);
          return;
        }
        if (stderr) {
          console.error(`stderr: ${stderr}`);
          return;
        }
        console.log(`stdout:\n${stdout}`);
      });
    });
  // const file: File = event.target.files[0];
  // file.arrayBuffer().then((buffer) => {
  //   this.zip.loadAsync(buffer).then((zip) => {
  //     zip.forEach((relativePath, zipEntry) => {
  //       zipEntry.async('blob').then((blob) => {
  //         if(!zipEntry.dir || blob.size > 0) this.pages.push(URL.createObjectURL(blob));
  //         this.comic.nativeElement.src = this.pages[0];
  //       });
  //     });
  //   });
  // });
  }
}
