"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RankingPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/feeds");
  }, [router]);

  return null;
}
