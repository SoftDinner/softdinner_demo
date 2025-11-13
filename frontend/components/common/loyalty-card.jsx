export default function LoyaltyCard({ tier, totalOrders, totalSpent, discountRate, nextTier }) {
  const tierEmojis = {
    bronze: "🥉",
    silver: "🥈",
    gold: "🥇",
    platinum: "💎",
  }

  const tierNames = {
    bronze: "브론즈",
    silver: "실버",
    gold: "골드",
    platinum: "플래티넘",
  }

  const progress = nextTier && nextTier.minOrders ? 
    Math.min(100, Math.max(0, ((Number(totalOrders || 0) / Number(nextTier.minOrders)) * 100))).toFixed(0) : 
    (nextTier ? 100 : 0)

  return (
    <div className="bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-foreground">단골 등급</h3>
        <div className="text-5xl">{tierEmojis[tier]}</div>
      </div>

      <div className="space-y-4">
        <div className="bg-white/50 rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-1">현재 등급</div>
          <div className="text-2xl font-bold text-primary">{tierNames[tier]}</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/50 rounded-lg p-3">
            <div className="text-xs text-muted-foreground mb-1">총 주문</div>
            <div className="text-lg font-bold text-foreground">{Number(totalOrders || 0)}회</div>
          </div>
          <div className="bg-white/50 rounded-lg p-3">
            <div className="text-xs text-muted-foreground mb-1">총 지출</div>
            <div className="text-lg font-bold text-foreground">₩{Number(totalSpent || 0).toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-white/50 rounded-lg p-4">
          <div className="text-sm text-muted-foreground mb-2">현재 할인율</div>
          <div className="text-3xl font-bold text-green-600">{(Number(discountRate || 0) * 100).toFixed(0)}%</div>
        </div>

        {nextTier && (
          <div className="bg-white/50 rounded-lg p-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">다음 등급까지</span>
              <span className="text-foreground font-bold text-primary">
                주문 {Math.max(0, Number(nextTier.minOrders || 0) - Number(totalOrders || 0))}회 남음
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className="bg-gradient-to-r from-primary to-primary/70 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-1 text-right">
              {isNaN(Number(progress)) ? '0' : progress}% 달성
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
