import { PageHeader } from "@/components/shared/PageHeader"
import { EmptyState } from "@/components/shared/EmptyState"
import { Wrench } from "lucide-react"

export default function SetupsPage() {
  return (
    <div>
      <PageHeader
        title="Setups"
        description="Manage your car setups across circuits and conditions."
        icon={Wrench}
      />
      <EmptyState
        icon={Wrench}
        title="Setup manager — coming in Phase 3"
        description="Store, version, and compare your setups. Link them to sessions to track which setup worked best."
      />
    </div>
  )
}
