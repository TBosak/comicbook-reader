/* eslint-disable max-len */
/* eslint-disable curly */
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as JSZip from 'jszip';
import { ElectronService } from '../core/services';
import { Dirent } from 'fs';

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
  pages: Array<any> = [];
  tempDir = '';

  constructor(public electron: ElectronService){
  }

  ngOnInit(): void {
  }

  async onFileSelected(event: any){
    if(this.tempDir) this.electron.fs.rmSync(this.tempDir, { recursive: true });
    this.pages = [];
    if(event.target.files[0].path.endsWith('.cbr')){
      this.handleCBR(event.target.files[0]);
    }
    if(event.target.files[0].path.endsWith('.cbz')){
      this.handleCBZ(event.target.files[0]);
    }
  }

handleCBZ(file: File){
  file.arrayBuffer().then((buffer) => {
    this.zip.loadAsync(buffer).then((zip) => {
      zip.forEach((relativePath, zipEntry) => {
        zipEntry.async('blob').then((blob) => {
          if(!zipEntry.dir || blob.size > 0) this.pages.push({file: zipEntry.name, blob: URL.createObjectURL(blob)});
          this.pages = this.pages.sort((a, b) => a.file.localeCompare(b.file));
          this.comic.nativeElement.src = this.pages[0].blob;
        });
      });
    });
  });
}

handleCBR(file: File){
    this.electron.fs.mkdtemp('comics', (err, folder) => {
      this.tempDir = folder;
      this.electron.childProcess.exec(`unrar x "${file.path}" -op ${folder}`, (error, stdout, stderr) => {
        this.electron.fs.promises.readdir(`${folder}`, { withFileTypes: true})
        .then(dirents => {
          if(!dirents[0].isFile){ this.electron.fs.promises.readdir(`${folder}/${dirents[0].name}`, { withFileTypes: true})
          .then((files) => {
          files.sort().forEach((comic) => {
            this.electron.fs.readFile(`${folder}/${dirents[0].name}/${comic.name}`,(exc,buffer)=>{
              this.pages.push({ file: comic.name, blob: URL.createObjectURL(new Blob([buffer]))});
              this.pages = this.pages.sort((a, b) => a.file.localeCompare(b.file));
              this.comic.nativeElement.src = this.pages[0].blob;
            });
          });
        });
      }
      else{
        dirents.sort().forEach((comic) => {
          this.electron.fs.readFile(`${folder}/${comic.name}`,(exc,buffer)=>{
            this.pages.push({ file: comic.name, blob: URL.createObjectURL(new Blob([buffer]))});
            this.pages = this.pages.sort((a, b) => a.file.localeCompare(b.file));
            this.comic.nativeElement.src = this.pages[0].blob;
          });
        });
      }
      });
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
  }

  next(){
    const index = this.pages.findIndex((page) => page.blob === this.comic.nativeElement.src);
    if(index < this.pages.length - 1){
      this.comic.nativeElement.src = this.pages[index + 1].blob;
    }
  }

  previous(){
    const index = this.pages.findIndex((page) => page.blob === this.comic.nativeElement.src);
    if(index > 0){
      this.comic.nativeElement.src = this.pages[index - 1].blob;
    }
  }

}
