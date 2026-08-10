"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleAnalytics = void 0;
const measurementId = "G-YPJ8TVLGCS";
const duplicateWindowMs = 1000;
const allowedParameters = {
    page_view: ["page_location", "page_title"],
    screen_view: ["screen_name"],
    navigation: ["destination"],
    project_action: ["action"],
    editor_interaction: ["action", "editor"],
    editor_mode_change: ["editor"],
    block_interaction: ["action"],
    simulator_action: ["action", "editor"],
    code_compile: ["status", "editor", "duration_ms"],
    code_deploy: ["status", "duration_ms"],
    hardware_connection: ["action", "connection_type", "status"],
    hardware_flash: ["status"],
    bluetooth_action: ["action", "status"],
    tutorial_action: ["action", "step"],
    extension_action: ["action"],
    share_action: ["action"],
    select_promotion: ["promotion_id", "promotion_name"],
};
const allowedContextParameters = ["language", "target_version", "hardware_variant", "platform"];
class GoogleAnalyticsProvider {
    constructor() {
        this.initialized = false;
        this.lastEventTime = 0;
    }
    initialize() {
        if (this.initialized || !this.isEnabledEnvironment())
            return;
        this.initialized = true;
        const analyticsWindow = window;
        analyticsWindow.dataLayer = analyticsWindow.dataLayer || [];
        analyticsWindow.gtag = analyticsWindow.gtag || function () {
            analyticsWindow.dataLayer.push(arguments);
        };
        analyticsWindow.gtag("consent", "default", {
            analytics_storage: "denied",
            ad_storage: "denied",
            ad_user_data: "denied",
            ad_personalization: "denied"
        });
        analyticsWindow.gtag("set", "ads_data_redaction", true);
        analyticsWindow.gtag("js", new Date());
        analyticsWindow.gtag("config", measurementId, {
            send_page_view: false,
            allow_google_signals: false,
            allow_ad_personalization_signals: false
        });
        this.loadGoogleTag();
        this.wrapPxtTelemetry();
        this.track("page_view", {
            page_location: `${window.location.origin}${window.location.pathname}`,
            page_title: "DogoCode Editor"
        });
    }
    isEnabledEnvironment() {
        if (typeof window === "undefined" || window.location.protocol !== "https:")
            return false;
        if (!pxt.webConfig || !pxt.webConfig.isStatic)
            return false;
        if (pxt.BrowserUtils.isPxtElectron())
            return false;
        if (/^(localhost|127\.0\.0\.1|\[::1\])$/i.test(window.location.hostname))
            return false;
        try {
            return window.self === window.top;
        }
        catch (e) {
            return false;
        }
    }
    track(name, parameters) {
        if (!this.initialized || !allowedParameters[name])
            return;
        const sanitized = this.sanitizeParameters(name, parameters);
        const eventKey = `${name}:${JSON.stringify(sanitized)}`;
        const now = Date.now();
        if (eventKey === this.lastEventKey && now - this.lastEventTime < duplicateWindowMs)
            return;
        this.lastEventKey = eventKey;
        this.lastEventTime = now;
        try {
            window.gtag("event", name, sanitized);
        }
        catch (e) {
            pxt.debug(`GA4 event ignored: ${name}`);
        }
    }
    trackPxtEvent(id, data) {
        if (id === "compile") {
            this.compileStartTime = Date.now();
            this.compileEditor = this.safeEditor(data && data["editor"]);
        }
        if (id === "deploy.start") {
            this.trackCompileResult("completed");
        }
        else if (id === "compile.noemit") {
            this.trackCompileResult("failed");
        }
        const event = this.mapPxtEvent(id, data);
        if (event)
            this.track(event.name, event.parameters);
    }
    trackCompileResult(status) {
        if (!this.compileStartTime)
            return;
        this.track("code_compile", {
            status,
            editor: this.compileEditor,
            duration_ms: Date.now() - this.compileStartTime
        });
        this.compileStartTime = undefined;
        this.compileEditor = undefined;
    }
    loadGoogleTag() {
        if (document.querySelector(`script[data-dogocode-ga4="${measurementId}"]`))
            return;
        const script = document.createElement("script");
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
        script.setAttribute("data-dogocode-ga4", measurementId);
        script.onerror = () => pxt.debug("GA4 script was blocked or unavailable");
        document.head.appendChild(script);
    }
    wrapPxtTelemetry() {
        this.originalTickEvent = pxt.tickEvent;
        const provider = this;
        pxt.tickEvent = function (id, data, opts) {
            if (provider.originalTickEvent)
                provider.originalTickEvent(id, data, opts);
            provider.trackPxtEvent(id, data);
        };
    }
    sanitizeParameters(name, parameters) {
        const result = this.safeContext();
        const allowed = allowedParameters[name] || [];
        if (parameters) {
            allowed.forEach(key => {
                const value = parameters[key];
                if (typeof value === "number" && isFinite(value)) {
                    result[key] = Math.max(0, Math.min(Math.round(value), 3600000));
                }
                else if (typeof value === "string") {
                    result[key] = value.substring(0, 100);
                }
            });
        }
        return result;
    }
    safeContext() {
        const result = { platform: "web" };
        const language = pxt.Util.userLanguage();
        const targetVersion = pxt.appTarget && pxt.appTarget.versions && pxt.appTarget.versions.target;
        const hardwareVariant = pxt.hwVariant;
        if (language && /^[a-z]{2,3}(?:-[a-z0-9]{2,8})?$/i.test(language))
            result.language = language.substring(0, 16);
        if (targetVersion && /^[a-z0-9._-]+$/i.test(targetVersion))
            result.target_version = targetVersion.substring(0, 40);
        if (hardwareVariant && /^[a-z0-9._-]+$/i.test(hardwareVariant))
            result.hardware_variant = hardwareVariant.substring(0, 40);
        Object.keys(result).forEach(key => {
            if (allowedContextParameters.indexOf(key) < 0)
                delete result[key];
        });
        return result;
    }
    mapPxtEvent(id, data) {
        const editor = this.safeEditor(data && data["editor"]);
        switch (id) {
            case "app.home": return this.event("screen_view", { screen_name: "home" });
            case "app.editor": return this.event("screen_view", { screen_name: "editor" });
            case "menu.home": return this.event("navigation", { destination: "home" });
            case "app.newproject":
            case "projects.new": return this.event("project_action", { action: "create" });
            case "app.open.file": return this.event("project_action", { action: "open_file" });
            case "import":
            case "import.zip":
            case "import.extension":
            case "projects.import":
            case "projects.importurl": return this.event("project_action", { action: "import" });
            case "activity.edit": return this.event("editor_interaction", { action: "edit", editor });
            case "sidebar.showBlocks":
            case "blocks.showBlocks": return this.event("editor_mode_change", { editor: "blocks" });
            case "sidebar.showPython":
            case "blocks.showpython": return this.event("editor_mode_change", { editor: "python" });
            case "sidebar.showTypescript":
            case "blocks.showjavascript":
            case "blocks.switchjavascript": return this.event("editor_mode_change", { editor: "javascript" });
            case "blocks.create": return this.event("block_interaction", { action: "create" });
            case "run": return this.event("simulator_action", { action: "run", editor });
            case "debug":
            case "simulator.debug": return this.event("simulator_action", { action: "debug", editor });
            case "simulator.start": return this.event("simulator_action", { action: "start" });
            case "simulator.stop": return this.event("simulator_action", { action: "stop" });
            case "simulator.suspend": return this.event("simulator_action", { action: "suspend" });
            case "compile": return this.event("code_compile", { status: "started", editor });
            case "compile.noemit": return undefined;
            case "deploy.start": return this.event("code_deploy", { status: "started" });
            case "deploy.finished": return this.event("code_deploy", { status: "completed", duration_ms: this.safeNumber(data && data["elapsedMs"]) });
            case "deploy.exception": return this.event("code_deploy", { status: "failed", duration_ms: this.safeNumber(data && data["elapsedMs"]) });
            case "hid.flash.connect": return this.event("hardware_connection", { action: "connect", connection_type: "webusb", status: "completed" });
            case "downloaddialog.button.webusb": return this.event("hardware_connection", { action: "select", connection_type: "webusb", status: "started" });
            case "menu.pair.bluetooth": return this.event("bluetooth_action", { action: "open", status: "started" });
            case "webble.connected": return this.event("bluetooth_action", { action: "connect", status: "completed" });
            case "webble.fail.fail": return this.event("bluetooth_action", { action: "connect", status: "failed" });
            case "hid.flash.start": return this.event("hardware_flash", { status: "started" });
            case "hid.flash.success":
            case "hid.flash.full.success":
            case "hid.flash.quick.success": return this.event("hardware_flash", { status: "completed" });
            case "hid.flash.error":
            case "hid.flash.full.error":
            case "hid.flash.quick.error": return this.event("hardware_flash", { status: "failed" });
            case "tutorial.start": return this.event("tutorial_action", { action: "start" });
            case "tutorial.next": return this.event("tutorial_action", { action: "next", step: this.safeNumber(data && data["step"]) });
            case "tutorial.previous": return this.event("tutorial_action", { action: "previous", step: this.safeNumber(data && data["step"]) });
            case "tutorial.finish":
            case "tutorial.complete": return this.event("tutorial_action", { action: "complete" });
            case "tutorial.exit":
            case "tutorial.exit.home":
            case "menu.exitTutorial": return this.event("tutorial_action", { action: "exit" });
            case "blocks.extensions.open": return this.event("extension_action", { action: "open" });
            case "extensions.import":
            case "extensions.importfile": return this.event("extension_action", { action: "import" });
            case "menu.share": return this.event("share_action", { action: "open" });
            case "publish": return this.event("share_action", { action: "publish" });
            default: return undefined;
        }
    }
    event(name, parameters) {
        if (parameters) {
            Object.keys(parameters).forEach(key => {
                if (parameters[key] === undefined)
                    delete parameters[key];
            });
        }
        return { name, parameters };
    }
    safeEditor(value) {
        if (typeof value !== "string")
            return undefined;
        const normalized = value.toLowerCase().replace(/editor$/, "");
        if (normalized === "blocks" || normalized === "python")
            return normalized;
        if (normalized === "javascript" || normalized === "typescript" || normalized === "js")
            return "javascript";
        return undefined;
    }
    safeNumber(value) {
        return typeof value === "number" && isFinite(value) ? value : undefined;
    }
}
exports.googleAnalytics = new GoogleAnalyticsProvider();
