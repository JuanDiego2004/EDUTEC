import type { Metadata } from "next";
import "./globals.css";

import { AppProviders } from "./providers";
import { AuthProvider } from "@/funcionalidades/autenticacion/ganchos/useAuth";

export const metadata: Metadata = {
  title: "I.E Reyna de la Paz",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>
          <AuthProvider>
            {children}
          </AuthProvider>
        </AppProviders>
      </body>
    </html>
  );
}
