import { SavingsGoals } from "@/components/SavingsGoals";
import { PremiumBadge } from "@/components/premium/PremiumBadge";

export default function Goals() {
  console.log('Goals component loading');
  return (
    <div>
      {/* Premium Badge - Visible at top */}
      <div className="flex justify-center mb-4 pt-4">
        <PremiumBadge variant="default" className="animate-fade-in" />
      </div>
      <SavingsGoals />
    </div>
  );
}