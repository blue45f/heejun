#!/usr/bin/env bash
# heejun.store DNS/SSL 적용 여부 점검 스크립트
# 가비아 DNS 변경 후 진행 상황 확인용
#
# 사용법:
#   bash scripts/check-dns-ssl.sh
#
# 통과 조건:
#   1) A 레코드가 75.2.60.5(Netlify) 로 변경됨
#   2) www CNAME 이 *.netlify.app 으로 연결됨
#   3) HTTPS 인증서 CN/SAN 에 heejun.store 포함

set -u

DOMAIN="heejun.store"
# Netlify는 지역별 Edge IP가 다양함. 응답 헤더로 확인하는 게 가장 확실.
PASS=0
FAIL=0

ok()   { printf "  \033[32m✓\033[0m %s\n" "$1"; PASS=$((PASS+1)); }
fail() { printf "  \033[31m✗\033[0m %s\n" "$1"; FAIL=$((FAIL+1)); }
info() { printf "  \033[36mi\033[0m %s\n" "$1"; }

echo "▶ heejun.store DNS/SSL 점검"
echo ""

# 1) Netlify 응답 확인 (Server 헤더로 판정)
echo "[1/3] Netlify Edge 응답"
A_RECORDS=$(dig +short "$DOMAIN" A 2>/dev/null | tr '\n' ' ')
SERVER_HEADER=$(curl -sIk -m 5 "https://$DOMAIN" | tr -d '\r' | grep -i '^server:' | head -1 | sed 's/^[Ss]erver: *//')
info "현재 A: $A_RECORDS"
info "Server 헤더: ${SERVER_HEADER:-(없음)}"
if echo "$SERVER_HEADER" | grep -qi "netlify"; then
  ok "Netlify Edge 정상 응답"
else
  fail "Netlify 응답이 아님 (DNS 또는 호스팅 설정 확인)"
fi
echo ""

# 2) www CNAME 확인
echo "[2/3] www CNAME"
WWW_CNAME=$(dig +short "www.$DOMAIN" CNAME 2>/dev/null)
WWW_A=$(dig +short "www.$DOMAIN" A 2>/dev/null)
info "현재 CNAME: ${WWW_CNAME:-(없음)}"
info "현재 A:     ${WWW_A:-(없음)}"
if echo "$WWW_CNAME" | grep -q "netlify.app"; then
  ok "www → *.netlify.app 으로 정상 연결"
else
  fail "www 서브도메인이 Netlify로 연결되지 않음"
fi
echo ""

# 3) HTTPS 인증서 CN/SAN 확인
echo "[3/3] HTTPS 인증서"
CERT_INFO=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null \
  | openssl x509 -noout -subject -text 2>/dev/null \
  | grep -E "Subject:|DNS:" | head -5)
info "$(echo "$CERT_INFO" | head -1)"
if echo "$CERT_INFO" | grep -q "$DOMAIN"; then
  ok "인증서에 $DOMAIN 포함 (정상 발급 완료)"
else
  fail "인증서에 $DOMAIN 미포함 — Netlify 대시보드에서 'Provision certificate' 실행 필요"
fi
echo ""

# 종합
echo "─────────────────────────────"
printf "결과: \033[32m통과 %d\033[0m / \033[31m실패 %d\033[0m\n" "$PASS" "$FAIL"
if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "다음 단계:"
  echo "  - A 레코드 실패 시: 가비아 DNS 변경 후 10~60분 대기"
  echo "  - 인증서 실패 시:    https://app.netlify.com 에서 도메인 → HTTPS → Provision certificate"
  exit 1
fi
