declare class HomeHeroCarousel {
    private observer;
    private hero;
    private controls;
    private slides;
    private activeIndex;
    private timer;
    private pointerStartX;
    private suppressClickUntil;
    initialize(): void;
    private assetUrl;
    private mount;
    private unmount;
    private show;
    private scheduleNext;
    private clearTimer;
    private handleVisibilityChange;
    private handleHeroClick;
    private handleKeyDown;
    private handlePointerDown;
    private handlePointerUp;
    private handlePointerCancel;
}
export declare const homeHeroCarousel: HomeHeroCarousel;
export {};
