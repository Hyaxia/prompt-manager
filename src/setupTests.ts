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


// Ignore warnings about act not being wrapped in act
const originalError = console.error;
console.error = (...args) => {
    if (/Warning.*not wrapped in act/.test(args[0])) {
        return;
    }
    originalError.call(console, ...args);
};

// Mock ResizeObserver which is not available in jsdom
window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};
