"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function DecisionPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/board");
  }, [router]);

  return (
    <AppShell title="决策模块已升级" subtitle="该能力已并入「心安指南」">
      <div className="grid gap-4">
        <Card title="去新版心安指南" subtitle="按照新需求，决策问答统一收敛到心安指南中">
          <Button onClick={() => router.replace("/board")}>前往心安指南</Button>
        </Card>
      </div>
    </AppShell>
  );
}
