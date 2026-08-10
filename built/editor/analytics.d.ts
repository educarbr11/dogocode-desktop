declare type AnalyticsValue = string | number;
declare type AnalyticsParameters = pxt.Map<AnalyticsValue>;
export interface AnalyticsProvider {
    initialize(): void;
    isEnabledEnvironment(): boolean;
    track(name: string, parameters?: AnalyticsParameters): void;
    trackPxtEvent(id: string, data?: pxt.Map<string | number>): void;
}
export declare const googleAnalytics: AnalyticsProvider;
export {};
