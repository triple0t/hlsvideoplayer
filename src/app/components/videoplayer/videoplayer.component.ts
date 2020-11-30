import { Component, ElementRef, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import * as HLS from 'hls.js';
import { LoaderAndNotificationService } from 'src/app/services/notification.service';
import { VideoPlayerService } from 'src/app/services/videoplayer.service';

@Component({
  selector: 'app-videoplayer',
  templateUrl: './videoplayer.component.html',
  styleUrls: ['./videoplayer.component.scss']
})
export class VideoplayerComponent implements OnInit, AfterViewInit {

  videoContainer: HTMLDivElement;
  videoElement: HTMLVideoElement;
  progressEle: HTMLProgressElement;

  playerIsReady = false;
  currentStream;
  errormessage;

  @ViewChild('videoContainer') set navtiveVideoContainerElement(el: ElementRef) {
    this.videoContainer = el.nativeElement;
  }

  @ViewChild('player') set navtivePlayerElement(el: ElementRef) {
    this.videoElement = el.nativeElement;
  }

  @ViewChild('progressElement') set navtiveProgressElement(el: ElementRef) {
    if (el?.nativeElement) this.progressEle = el.nativeElement;
  }

  hls: HLS;

  constructor(
    private vidService: VideoPlayerService,
    private loaderService: LoaderAndNotificationService) {}

  ngOnInit(): void {}

  ngAfterViewInit() {
    this.videoElement.controls = false;

    if (HLS.isSupported()) {
      this.vidService.stream.subscribe(res => {
        if (res && res.src) {
          this.errormessage = false;
          this.currentStream = res;
          this.setupPlayer(res.src);
        }
      })
    } else {
      console.log('HLS Not supoorted');
      this.errormessage = 'HLS Not supoorted. Plese Upgrade your Browser or Try Google Chrome.';
    }
  }

  setupPlayer(mediasrc) {
    if (this.hls) {
      this.hls.destroy();
    }

    this.hls = new HLS();

    this.hls.attachMedia(this.videoElement);

    this.hls.on(HLS.Events.MEDIA_ATTACHED, () => {
      this.hls.loadSource(mediasrc);
    });

    this.setUpEventListner();
  }

  setUpEventListner() {
    // Loader events
    this.hls.on(HLS.Events.MANIFEST_LOADING, () => {
      this.showLoader();
    });

    this.hls.on(HLS.Events.MANIFEST_PARSED, () => {
      this.videoElement.play();
    });

    this.hls.on(HLS.Events.FRAG_LOADED, () => {
      this.playerIsReady = true;
      this.hideLoader();
    });

    this.videoElement.addEventListener('loadedmetadata', () => {
      this.progressEle.setAttribute('max', String(this.videoElement.duration));
    });

    this.videoElement.addEventListener('timeupdate', () => {
      if (!this.progressEle.getAttribute('max')) this.progressEle.setAttribute('max', String(this.videoElement.duration));
      this.progressEle.value = this.videoElement.currentTime;
    });

    this.videoElement.addEventListener('ended', () => {
      if (this.isNextStreamAvaliable()) {
        this.nextStream();
      }
    });

    this.handleErrorEvents();
  }

  handleErrorEvents() {
    this.hls.on(HLS.Events.ERROR, (event, data) => {
      if (data.fatal) {
        switch(data.type) {
        case HLS.ErrorTypes.NETWORK_ERROR:
          // try to recover network error
          console.log("fatal network error encountered, trying to recover");
          this.errormessage = 'fatal network error encountered, trying to recover';
          if (this.hls) this.hls.startLoad();
          break;
        case HLS.ErrorTypes.MEDIA_ERROR:
          console.log("fatal media error encountered, try to recover");
          this.errormessage = 'fatal media error encountered, trying to recover';
          if (this.hls) this.hls.recoverMediaError();
          break;
        default:
          // cannot recover
          // throw error
          this.errormessage = 'Error fatal. Please try again.';
          this.hls.destroy();
          break;
        }
      }
    });
  }

  showLoader() {
    this.loaderService.showLoader();
  }

  hideLoader() {
    this.loaderService.hideLoader();
    this.errormessage = false;
  }

  playOrPauseVideo() {
    if (this.videoElement.paused || this.videoElement.ended) {
      this.videoElement.play();
    } else {
      this.videoElement.pause();
    }

  }

  muteOrUnmuteVideo() {
    this.videoElement.muted = !this.videoElement.muted;
  }

  skipAhead(event) {
    const pos = (event.pageX  - this.progressEle.offsetLeft) / this.progressEle.offsetWidth;
    const finalPos = pos * this.videoElement.duration;
    this.videoElement.currentTime = finalPos;
    this.progressEle.value = finalPos;
  }

  convertTime(time: number) {
    return (+time / 60).toFixed(2);
  }

  isUserInFullScreen() {
    // @ts-ignore
    return !!(document.mozFullScreen || document.msFullscreenElement || document.fullscreenElement);
  }

  setFullScreen() {
    if (this.isUserInFullScreen()) {
      if (document.exitFullscreen) document.exitFullscreen(); // @ts-ignore
      else if (document.mozCancelFullScreen) document.mozCancelFullScreen(); // @ts-ignore
      else if (document.webkitCancelFullScreen) document.webkitCancelFullScreen(); // @ts-ignore
      else if (document.msExitFullscreen) document.msExitFullscreen();
   }
   else {
      if (this.videoContainer.requestFullscreen) this.videoContainer.requestFullscreen(); // @ts-ignore
      else if (this.videoContainer.mozRequestFullScreen) this.videoContainer.mozRequestFullScreen(); // @ts-ignore
      else if (this.videoContainer.webkitRequestFullScreen) this.videoContainer.webkitRequestFullScreen(); // @ts-ignore
      else if (this.videoContainer.msRequestFullscreen) this.videoContainer.msRequestFullscreen();
   }
  }

  isNextStreamAvaliable() {
    return !!this.vidService.isNextStreamAvaliable(this.currentStream);
  }

  nextStream() {
    this.vidService.gotoNextAvaliableStream(this.currentStream);
  }

}
