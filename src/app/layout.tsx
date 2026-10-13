import type { Metadata } from "next";
import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  // Humaflow loads 400–800 only; never ask for heavier weights.
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Budget Buddy",
  description: "Plan your ICT budget. Know your options. Defend your decisions.",
};

// Each user's theme choice is stored per browser, as in Humaflow; first visit follows the system.
const themeScript = `try{var t=localStorage.getItem("bb-theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("hf-theme-dark")}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={hanken.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
