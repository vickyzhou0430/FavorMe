"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { clearUser } from "@/lib/user-store";

export default function LoginPage() {
  const router = useRouter();

  return (
    <AppShell title="Sign in">
      <div className="grid gap-4">
        <Card
          title="This page is deprecated"
          subtitle="Use the onboarding flow at `/onboarding` to set up your contract."
        >
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => router.replace("/onboarding")}>Go to onboarding</Button>
            <Button
              variant="ghost"
              onClick={() => {
                clearUser();
              }}
            >
              Clear local data
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
