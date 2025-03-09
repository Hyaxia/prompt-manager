import '@testing-library/jest-dom';

// eslint-disable-next-line @typescript-eslint/no-namespace
declare global {
    namespace jest {
        interface Expect {
            toBeInTheDocument(): void;
            toHaveValue(value: string): void;
        }
    }
}

// Mock ResizeObserver which is not available in jsdom
window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};
