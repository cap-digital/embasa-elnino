import type { Metadata } from "next";
import { Geist, Montserrat } from "next/font/google";
import { MotionProvider } from "@/components/motion/motion-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: {
    default: "El Niño tá chegando · Painel de campanha · Embasa",
    template: "%s · Painel El Niño · Embasa",
  },
  description:
    "Acompanhamento da campanha “O El Niño tá chegando. Proteja a Bahia. Fique alerta com queimadas.” da Embasa.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${montserrat.variable} h-full antialiased`}
    >
      <body className="h-dvh overflow-hidden bg-background text-foreground">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
