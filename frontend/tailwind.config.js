/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
        './pages/**/*.{js,jsx}',
        './components/**/*.{js,jsx}',
        './app/**/*.{js,jsx}',
        './src/**/*.{js,jsx}',
    ],
    prefix: "",
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            colors: {
                // Custom violet override - using #9b8cb6 as base
                violet: {
                    50: '#f5f3f7',
                    100: '#ebe7ef',
                    200: '#d7cfe0',
                    300: '#c3b7d1',
                    400: '#af9fc2',
                    500: '#9b8cb6',  // Base color
                    600: '#7c6f92',
                    700: '#5d536d',
                    800: '#3e3749',
                    900: '#1f1b24',
                    950: '#0f0d12',
                },
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                // Theme-aware Gruvbox palette - NOW USING CSS VARIABLES
                gruvbox: {
                    bg: {
                        darkest: 'var(--theme-bg-darkest)',
                        dark: 'var(--theme-bg-dark)',
                        DEFAULT: 'var(--theme-bg)',
                        light: 'var(--theme-bg-light)',
                        lighter: 'var(--theme-bg-lighter)',
                    },
                    fg: {
                        DEFAULT: 'var(--theme-fg)',
                        light: 'var(--theme-fg-light)',
                        muted: 'var(--theme-fg-muted)',
                    },
                    red: {
                        DEFAULT: 'var(--theme-accent-1)',
                        light: 'var(--theme-accent-1)',
                    },
                    orange: {
                        DEFAULT: 'var(--theme-secondary)',
                        light: 'var(--theme-secondary-light)',
                    },
                    yellow: {
                        DEFAULT: 'var(--theme-primary)',
                        light: 'var(--theme-primary-light)',
                    },
                    aqua: {
                        DEFAULT: 'var(--theme-accent-2)',
                        light: 'var(--theme-accent-2)',
                    },
                    purple: {
                        DEFAULT: 'var(--theme-accent-3)',
                        light: 'var(--theme-accent-3)',
                    },
                    blue: {
                        DEFAULT: 'var(--theme-accent-4)',
                        light: 'var(--theme-accent-4)',
                    },
                },
                // Legacy vintage colors - also using CSS variables
                vintage: {
                    navy: {
                        darkest: 'var(--theme-bg-darkest)',
                        dark: 'var(--theme-bg-dark)',
                        DEFAULT: 'var(--theme-bg)',
                        light: 'var(--theme-bg-light)',
                        lighter: 'var(--theme-bg-lighter)',
                    },
                    amber: {
                        DEFAULT: 'var(--theme-primary)',
                        light: 'var(--theme-primary-light)',
                        lighter: 'var(--theme-fg-light)',
                        dark: 'var(--theme-secondary)',
                        darker: 'var(--theme-accent-1)',
                    },
                    cream: 'var(--theme-fg)',
                    gold: 'var(--theme-primary-light)',
                    copper: 'var(--theme-secondary-light)',
                    rust: 'var(--theme-accent-1)',
                },
                // Direct theme color access
                theme: {
                    bg: {
                        darkest: 'var(--theme-bg-darkest)',
                        dark: 'var(--theme-bg-dark)',
                        DEFAULT: 'var(--theme-bg)',
                        light: 'var(--theme-bg-light)',
                        lighter: 'var(--theme-bg-lighter)',
                    },
                    fg: {
                        DEFAULT: 'var(--theme-fg)',
                        light: 'var(--theme-fg-light)',
                        muted: 'var(--theme-fg-muted)',
                    },
                    primary: {
                        DEFAULT: 'var(--theme-primary)',
                        light: 'var(--theme-primary-light)',
                    },
                    secondary: {
                        DEFAULT: 'var(--theme-secondary)',
                        light: 'var(--theme-secondary-light)',
                    },
                    accent: {
                        1: 'var(--theme-accent-1)',
                        2: 'var(--theme-accent-2)',
                        3: 'var(--theme-accent-3)',
                        4: 'var(--theme-accent-4)',
                    },
                },
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
            keyframes: {
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
            },
            fontFamily: {
                display: 'var(--font-display)',
                body: 'var(--font-body)',
                mono: 'var(--font-mono)',
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
}
