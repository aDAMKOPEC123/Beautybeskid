// apps/web/tailwind.config.ts
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        heading: ['Playfair Display', 'serif'],
        eyebrow: ['DM Sans', 'sans-serif'],
        sans: ['DM Sans', 'sans-serif'],
      },
      colors: {
        // Semantic tokens (HSL-based for dark mode compatibility)
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
        // Editorial palette — fixed values (botanical refresh)
        ivory: '#F4F9F5',
        cream: '#E8F3EA',
        caramel: '#3D7A54',    // forest green — primary action
        walnut: '#2A5C3E',     // deep forest accent
        espresso: '#1A3828',   // near-black text
        mink: '#5A7A62',       // muted green-gray
        oak: '#C4965A',        // warm oak accent (new token)
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
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" }
        },
        "slide-up": {
          from: { transform: "translateY(20px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" }
        },
        "clip-reveal": {
          from: { clipPath: "inset(100% 0 0 0)" },
          to: { clipPath: "inset(0% 0 0 0)" }
        },
        "overlay-in": {
          from: { clipPath: "inset(0 0 100% 0)" },
          to: { clipPath: "inset(0 0 0% 0)" }
        },
        "slideIn": {
          from: { opacity: "0", transform: "translateX(12px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        "barGrow": {
          from: { transform: "scaleY(0)" },
          to:   { transform: "scaleY(1)" },
        },
        "pulseGlow": {
          "0%, 100%": { boxShadow: "0 0 6px rgba(99,102,241,.4)" },
          "50%":      { boxShadow: "0 0 14px rgba(99,102,241,.7)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out forwards",
        "slide-up": "slide-up 0.6s cubic-bezier(0.76,0,0.24,1) forwards",
        "clip-reveal": "clip-reveal 0.7s cubic-bezier(0.76,0,0.24,1) forwards",
        "overlay-in": "overlay-in 0.4s ease-in-out forwards",
        "slideIn":    "slideIn 0.4s ease both",
        "barGrow":    "barGrow 0.5s ease both",
        "pulseGlow":  "pulseGlow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    require("@tailwindcss/typography")({
      target: 'legacy',
    }),
  ],
}
