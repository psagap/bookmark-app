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
                // Gruvbox-inspired palette
                gruvbox: {
                    bg: {
                        darkest: '#1d2021',
                        dark: '#282828',
                        DEFAULT: '#32302f',
                        light: '#3c3836',
                        lighter: '#504945',
                    },
                    fg: {
                        DEFAULT: '#ebdbb2',
                        light: '#fbf1c7',
                        muted: '#a89984',
                    },
                    red: {
                        DEFAULT: '#cc241d',
                        light: '#fb4934',
                    },
                    orange: {
                        DEFAULT: '#d65d0e',
                        light: '#fe8019',
                    },
                    yellow: {
                        DEFAULT: '#d79921',
                        light: '#fabd2f',
                    },
                    aqua: {
                        DEFAULT: '#689d6a',
                        light: '#8ec07c',
                    },
                    purple: {
                        DEFAULT: '#b16286',
                        light: '#d3869b',
                    },
                },
                // Legacy vintage colors (keeping for compatibility)
                vintage: {
                    navy: {
                        darkest: '#1d2021',
                        dark: '#282828',
                        DEFAULT: '#32302f',
                        light: '#3c3836',
                        lighter: '#504945',
                    },
                    amber: {
                        DEFAULT: '#d79921',
                        light: '#fabd2f',
                        lighter: '#fbf1c7',
                        dark: '#d65d0e',
                        darker: '#af3a03',
                    },
                    cream: '#ebdbb2',
                    gold: '#fabd2f',
                    copper: '#fe8019',
                    rust: '#cc241d',
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
        },
    },
    plugins: [require("tailwindcss-animate")],
}
