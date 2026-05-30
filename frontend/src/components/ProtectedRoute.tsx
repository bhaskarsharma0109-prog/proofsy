"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { pageVariants } from "@/lib/animations";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { member, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = pathname?.startsWith("/login") || 
                        pathname?.startsWith("/signup") || 
                        pathname?.startsWith("/recipient") || 
                        pathname?.startsWith("/verify");

  useEffect(() => {
    if (!isLoading && !member && !isPublicRoute) {
      router.push("/login");
    }
  }, [member, isLoading, router, isPublicRoute]);

  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <motion.div
          variants={pageVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Loading workspace...</p>
        </motion.div>
      </div>
    );
  }

  if (!member) {
    return null;
  }

  return <>{children}</>;
}
