export default function Footer() {
  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-bold text-primary mb-4">Mr. 대박 디너서비스</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              프리미엄 디너 배달 서비스
              <br />
              특별한 날을 더욱 특별하게
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">서비스</h4>
            <ul className="space-y-2">
              <li>
                <a href="/dinners" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                  디너 선택
                </a>
              </li>
              <li>
                <a href="/dashboard" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                  내 대시보드
                </a>
              </li>
              <li>
                <a href="/auth" className="text-sm text-muted-foreground hover:text-accent transition-colors">
                  로그인
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">고객 지원</h4>
            <ul className="space-y-2">
              <li className="text-sm text-muted-foreground">고객센터: 02-1234-5678</li>
              <li className="text-sm text-muted-foreground">이메일: support@mrdaebak.com</li>
              <li className="text-sm text-muted-foreground">운영시간: 평일 10:00 - 22:00</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">&copy; 2025 Mr. 대박 디너서비스. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
