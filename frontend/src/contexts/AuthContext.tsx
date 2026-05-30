"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  member: any | null;
  organization: any | null;
  isLoading: boolean;
  login: (memberData: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  member: null,
  organization: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [member, setMember] = useState<any | null>(null);
  const [organization, setOrganization] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const fetchUser = async () => {
      // Don't fetch if on public recipient routes
      if (pathname?.startsWith("/recipient/") || pathname?.startsWith("/verify")) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await api.me();
        if (res.success && res.data) {
          setMember(res.data);
          setOrganization(res.data.organizationId);
        } else {
          // Clear if unauthorized
          setMember(null);
          setOrganization(null);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [pathname]);

  const login = (data: any) => {
    setMember(data);
    if (data.organizationId) setOrganization(data.organizationId);
  };

  const logout = async () => {
    await api.logout();
    setMember(null);
    setOrganization(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ member, organization, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
