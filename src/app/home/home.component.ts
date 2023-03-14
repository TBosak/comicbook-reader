/* eslint-disable max-len */
/* eslint-disable curly */
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import * as JSZip from 'jszip';
import { ElectronService } from '../core/services';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  @ViewChild('comic', { static: false }) comic!: ElementRef;
  @ViewChild('fullPage', { static: false }) fullPage!: ElementRef;
  title = 'app';
  imageURL = '';
  zip = new JSZip();
  pages: Array<any> = [];
  tempDir = '';
  exec = this.electron.util.promisify(this.electron.childProcess.exec);
  readdir = this.electron.util.promisify(this.electron.fs.readdir);
  stat = this.electron.util.promisify(this.electron.fs.stat);
  readFile = this.electron.util.promisify(this.electron.fs.readFile);

  constructor(public electron: ElectronService, public sanitizer: DomSanitizer){
  }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    if(this.tempDir){
      this.electron.fs.rmSync(this.tempDir, { recursive: true });
      this.tempDir = null;
    }
  }

  async onFileSelected(event: any){
    if(event.target.files[0]){
      if(this.tempDir){
        this.electron.fs.rmSync(this.tempDir, { recursive: true });
        this.tempDir = null;
      }
    this.pages = [];
    if(event.target.files[0].path.endsWith('.cbr')){
      await this.handleCBR(event.target.files[0]);
    }
    if(event.target.files[0].path.endsWith('.cbz')){
      await this.handleCBZ(event.target.files[0]);
    }
  }
}

async handleCBZ(file: File){
  await file.arrayBuffer().then((buffer) => {
    this.zip.loadAsync(buffer).then((zip) => {
      const promises = [];
      zip.forEach((relativePath, zipEntry) => {
        promises.push(
          zipEntry.async('blob').then((blob) => {
            if (!zipEntry.dir || blob.size > 0) {
              return {file: zipEntry.name, blob: URL.createObjectURL(blob)};
            }
          })
        );
      });
      Promise.all(promises).then((pages) => {
        this.pages = pages.filter(Boolean).sort((a, b) => a.file.localeCompare(b.file));
        this.setPage(0);
      });
    });
  });
}


async handleCBR(file: File) {
  try {
    const folder = await this.electron.fs.promises.mkdtemp('comics');
    this.tempDir = folder;
    await this.exec(`unrar x "${file.path}" -op ${folder}`);
    const dirents = await this.readdir(folder, { withFileTypes: true });
    if (dirents[0].isDirectory()) {
      const subfolder = this.electron.path.join(folder, dirents[0].name);
      const files = await this.readdir(subfolder, { withFileTypes: true });
      const items = await Promise.all(
        files.map(async (comic) => {
          const filepath = this.electron.path.join(subfolder, comic.name);
          const stream = this.electron.fs.createReadStream(filepath);
          const chunks = [];
          for await (const chunk of stream) {
            chunks.push(chunk);
          }
          const blob = new Blob(chunks);
          return { file: comic.name, blob: URL.createObjectURL(blob) };
        })
      );
      this.pages.push.apply(this.pages, items);
    } else {
      const items = await Promise.all(
        dirents.map(async (comic) => {
          const filepath = this.electron.path.join(folder, comic.name);
          const stream = this.electron.fs.createReadStream(filepath);
          const chunks = [];
          for await (const chunk of stream) {
            chunks.push(chunk);
          }
          const blob = new Blob(chunks);
          return { file: comic.name, blob: URL.createObjectURL(blob) };
        })
      );
      this.pages.push.apply(this.pages, items);
    }
    this.pages = this.pages.sort((a, b) => a.file.localeCompare(b.file));
    this.setPage(0);
  } catch (error) {
    console.error(`error: ${error.message}`);
    return;
  } finally {
    this.electron.fs.rmSync(this.tempDir, { recursive: true });
    this.tempDir = null;
  }
}

  next(){
    const index = this.getCurrentPage();
    if(index + 1 < this.pages.length) this.setPage(index + 1);
  }

  previous(){
    const index = this.getCurrentPage();
    if(index - 1 >= 0) this.setPage(index - 1);
  }

  setPage(index: number){
    this.comic.nativeElement.src = this.pages[index].blob;
  }

  getCurrentPage(){
    return this.pages.findIndex((page) => page.blob === this.comic.nativeElement.src);
  }

  enlarge(){
    this.fullPage.nativeElement.style.backgroundImage = `url(' ${this.pages[this.getCurrentPage()].blob} ')`;
    this.fullPage.nativeElement.style.display = 'block';
  }

  close(){
    this.fullPage.nativeElement.style.display = 'none';
  }
}
