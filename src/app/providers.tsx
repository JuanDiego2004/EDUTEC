"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { Toaster } from "sonner";

export function AppProviders({ children }: { children: ReactNode }) {
  
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {    
            staleTime: 1000 * 60 * 5,      
            refetchOnWindowFocus: false,
            refetchOnMount: true,
            retry: 1, 
            refetchOnReconnect: true, 
            gcTime: 1000 * 60 * 10, 
          },
          mutations: {
            
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  );
}
