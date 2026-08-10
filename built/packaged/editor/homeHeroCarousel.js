"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.homeHeroCarousel = void 0;
const analytics_1 = require("./analytics");
const heroSelector = ".projectsdialog .getting-started-segment.hero";
const rotationDelayMs = 9000;
const swipeThresholdPx = 40;
const portalCourseUrl = "https://app.portaldogomaker.com.br/curso/177f1593-9a9e-4268-9771-1497139958be";
class HomeHeroCarousel {
    constructor() {
        this.activeIndex = 0;
        this.suppressClickUntil = 0;
        this.handleVisibilityChange = () => {
            if (document.hidden)
                this.clearTimer();
            else
                this.scheduleNext();
        };
        this.handleHeroClick = (event) => {
            if (Date.now() < this.suppressClickUntil || event.target.closest(".dogocode-hero-dots"))
                return;
            const slide = this.slides[this.activeIndex];
            if (!slide.url)
                return;
            analytics_1.googleAnalytics.track("select_promotion", {
                promotion_id: "portal_dogomaker_course",
                promotion_name: "Portal DogoMaker course"
            });
            window.location.assign(slide.url);
        };
        this.handleKeyDown = (event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
                return;
            event.preventDefault();
            event.stopPropagation();
            this.show(this.activeIndex + (event.key === "ArrowLeft" ? -1 : 1), true);
        };
        this.handlePointerDown = (event) => {
            this.pointerStartX = event.clientX;
        };
        this.handlePointerUp = (event) => {
            if (this.pointerStartX === undefined)
                return;
            const distance = event.clientX - this.pointerStartX;
            this.pointerStartX = undefined;
            if (Math.abs(distance) < swipeThresholdPx)
                return;
            event.preventDefault();
            event.stopPropagation();
            this.suppressClickUntil = Date.now() + 500;
            this.show(this.activeIndex + (distance < 0 ? 1 : -1), true);
        };
        this.handlePointerCancel = () => {
            this.pointerStartX = undefined;
        };
    }
    initialize() {
        if (this.observer)
            return;
        this.slides = [
            { imageUrl: this.assetUrl("banner-home.jpg"), label: "Banner DogoCode" },
            { imageUrl: this.assetUrl("banner-home_2.jpg"), label: "Curso Portal DogoMaker", url: portalCourseUrl }
        ];
        this.slides.forEach(slide => {
            const image = new Image();
            image.src = slide.imageUrl;
        });
        this.observer = new MutationObserver(() => this.mount());
        this.observer.observe(document.body, { childList: true, subtree: true });
        document.addEventListener("visibilitychange", this.handleVisibilityChange);
        this.mount();
    }
    assetUrl(filename) {
        return pxt.webConfig && pxt.webConfig.isStatic
            ? `${pxt.webConfig.relprefix}docs/static/${filename}`
            : `/static/${filename}`;
    }
    mount() {
        const nextHero = document.querySelector(heroSelector);
        if (!nextHero) {
            this.unmount();
            return;
        }
        if (nextHero === this.hero && this.controls && this.controls.parentElement === nextHero)
            return;
        this.unmount();
        this.hero = nextHero;
        this.hero.classList.add("dogocode-hero-carousel");
        this.hero.tabIndex = 0;
        this.hero.setAttribute("role", "region");
        this.hero.setAttribute("aria-label", "Destaques DogoCode");
        this.hero.addEventListener("click", this.handleHeroClick);
        this.hero.addEventListener("keydown", this.handleKeyDown);
        this.hero.addEventListener("pointerdown", this.handlePointerDown);
        this.hero.addEventListener("pointerup", this.handlePointerUp);
        this.hero.addEventListener("pointercancel", this.handlePointerCancel);
        this.controls = document.createElement("div");
        this.controls.className = "dogocode-hero-dots";
        this.controls.setAttribute("role", "group");
        this.controls.setAttribute("aria-label", "Selecionar banner");
        this.slides.forEach((slide, index) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "dogocode-hero-dot";
            button.setAttribute("aria-label", `Exibir ${slide.label}`);
            button.addEventListener("click", event => {
                event.stopPropagation();
                this.show(index, true);
            });
            this.controls.appendChild(button);
        });
        this.hero.appendChild(this.controls);
        this.show(this.activeIndex, false);
    }
    unmount() {
        this.clearTimer();
        if (!this.hero)
            return;
        this.hero.removeEventListener("click", this.handleHeroClick);
        this.hero.removeEventListener("keydown", this.handleKeyDown);
        this.hero.removeEventListener("pointerdown", this.handlePointerDown);
        this.hero.removeEventListener("pointerup", this.handlePointerUp);
        this.hero.removeEventListener("pointercancel", this.handlePointerCancel);
        this.hero = undefined;
        this.controls = undefined;
    }
    show(index, restartTimer) {
        if (!this.hero)
            return;
        this.activeIndex = (index + this.slides.length) % this.slides.length;
        const slide = this.slides[this.activeIndex];
        this.hero.style.backgroundImage = `url("${slide.imageUrl}")`;
        this.hero.setAttribute("data-dogocode-hero-index", `${this.activeIndex}`);
        this.hero.setAttribute("aria-label", `Destaques DogoCode: ${slide.label}`);
        const buttons = this.controls && this.controls.querySelectorAll("button");
        if (buttons) {
            Array.prototype.forEach.call(buttons, (button, buttonIndex) => {
                const active = buttonIndex === this.activeIndex;
                button.classList.toggle("active", active);
                button.setAttribute("aria-pressed", active ? "true" : "false");
            });
        }
        if (restartTimer || !this.timer)
            this.scheduleNext();
    }
    scheduleNext() {
        this.clearTimer();
        if (!document.hidden && this.hero) {
            this.timer = window.setTimeout(() => this.show(this.activeIndex + 1, true), rotationDelayMs);
        }
    }
    clearTimer() {
        if (this.timer)
            window.clearTimeout(this.timer);
        this.timer = undefined;
    }
}
exports.homeHeroCarousel = new HomeHeroCarousel();
