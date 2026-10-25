const won = n => Math.round(n).toLocaleString('ko-KR') + '원';
  const DEFAULT_RATES = {
    pension: 4.75, health: 3.595, ltc: 13.14, employment: 0.9,
    floor: 410000, ceiling: 6590000, minimumWage: 10320, minimumWageYear: 2026,
    updated: '2026-09-01', note: '국민연금공단·국민건강보험공단 2026년 고시 기준. 최저시급은 고용노동부 고시(2026년 10,320원, 2027년 10,700원)를 연도별로 적용'
  };
  const JOB_TABLE = [
    { code:'940306', name:'1인미디어콘텐츠창작자(유튜버·BJ)', aliases:['유튜버','유튜브','bj','스트리머','크리에이터','1인미디어'], rate:64.1 },
    { code:'940100', name:'작가·저술가·카피라이터', aliases:['작가','저술','소설','카피라이터','글쓰기'], rate:63.8 },
    { code:'940909', name:'IT 프리랜서 개발자', aliases:['개발자','프로그래머','it','앱개발','웹개발','코딩'], rate:61.7 },
    { code:'940909', name:'웹·그래픽 디자이너', aliases:['디자이너','디자인','웹디자인','그래픽','일러스트'], rate:61.7 },
    { code:'940903', name:'학원강사·과외교사', aliases:['강사','과외','학원','튜터','교습'], rate:61.7 },
    { code:'940912', name:'배달 라이더', aliases:['배달','라이더','배달원','퀵서비스','오토바이배달'], rate:78.6 },
    { code:'940917', name:'대리운전기사', aliases:['대리운전','대리기사'], rate:77.0 },
    { code:'940200', name:'보험설계사', aliases:['보험설계사','보험영업','보험'], rate:77.0 },
    { code:'940902', name:'사진작가', aliases:['사진작가','사진','포토그래퍼','촬영'], rate:69.6 },
    { code:'940305', name:'모델·배우', aliases:['모델','배우','연기'], rate:54.6 },
    { code:'940904', name:'번역가·통역사', aliases:['번역','통역','번역가','통역사'], rate:63.5 },
    { code:'940901', name:'학습지 교사·방문강사', aliases:['학습지','방문교사','학습지교사'], rate:65.5 },
    { code:'940601', name:'프리랜서 헤어·네일 디자이너', aliases:['미용사','헤어','네일','뷰티프리랜서'], rate:75.1 },
    { code:'940500', name:'상담·컨설팅 프리랜서', aliases:['컨설턴트','컨설팅','상담사'], rate:63.2 },
    { code:'940900', name:'기타 인적용역(직접확인 필요)', aliases:['기타'], rate:60.0 }
  ];
  const POSTS=(window.DATA&&window.DATA.posts)||[];
  const ARTICLES={};POSTS.forEach(p=>ARTICLES[p.slug]=p);
  const DEFAULT_RELATED = {
    salary: ['salary-4000-breakdown','insurance-rate-2026','salary-illusion'],
    insurance: ['pension-estimate','health-local-insured'],
    severance: ['severance-calc-example','severance-irp'],
    'annual-leave': ['annual-leave-deadline'],
    freelance: ['freelance-33-calc-guide','freelance-may-tax','freelance-refund'],
    'weekly-rest': ['weekly-rest-15h','minimum-wage-calc'],
    'minwage-check': ['minimum-wage-calc','weekly-rest-15h'],
    'daily-worker-tax': ['daily-worker-tax-guide'],
    'card-fee': ['card-fee-deposit-guide'],
    'split-14h': ['split-14h-labor-cost','weekly-rest-15h'],
    'tax-refund': ['freelance-may-tax','samjjeomsam-fee-compare','refund-negative-tips']
  };
const RATES=DEFAULT_RATES,RELATED=DEFAULT_RELATED;
// 연도별 최저시급 (고용노동부 고시). 해가 바뀌면 그 해 값이 자동으로 쓰인다(한국 날짜 기준).
const MINWAGE={2026:10320,2027:10700};
(function(){const y=new Date(Date.now()+9*3600e3).getUTCFullYear(),ys=Object.keys(MINWAGE).map(Number).filter(k=>k<=y);const k=ys.length?Math.max(...ys):Math.min(...Object.keys(MINWAGE).map(Number));RATES.minimumWage=MINWAGE[k];RATES.minimumWageYear=k})();
  function estimateMonthlyIncomeTax(monthlyGross, dependents){
    const g = monthlyGross;
    let rate;
    if (g <= 1500000) rate = 0.007;
    else if (g <= 2500000) rate = 0.015;
    else if (g <= 3500000) rate = 0.028;
    else if (g <= 5000000) rate = 0.045;
    else if (g <= 7000000) rate = 0.065;
    else rate = 0.085;
    const depAdj = 1 - Math.min(Math.max((dependents||1)-1,0),4)*0.03;
    return g * rate * depAdj;
  }
  function pensionBase(monthlyGross){ return Math.min(Math.max(monthlyGross, RATES.floor), RATES.ceiling); }

  // ---- 종합소득세 누진세율표 (2026년 기준, 단순화) ----
  const TAX_BRACKETS = [
    { limit: 14000000, rate: 0.06, deduction: 0 },
    { limit: 50000000, rate: 0.15, deduction: 1260000 },
    { limit: 88000000, rate: 0.24, deduction: 5760000 },
    { limit: 150000000, rate: 0.35, deduction: 15440000 },
    { limit: 300000000, rate: 0.38, deduction: 19940000 },
    { limit: Infinity, rate: 0.40, deduction: 25940000 }
  ];
  function calcTaxRefund(netReceived, expenseRate, dependents){
    const gross = netReceived / (1 - 0.033);
    const withheld = gross * 0.033;
    const expense = gross * (expenseRate/100);
    const incomeAmount = Math.max(gross - expense, 0);
    const basicDeduction = Math.max(dependents,1) * 1500000;
    const taxBase = Math.max(incomeAmount - basicDeduction, 0);
    let calculatedTax = 0;
    for (const b of TAX_BRACKETS){ if (taxBase <= b.limit){ calculatedTax = Math.max(taxBase*b.rate - b.deduction, 0); break; } }
    const standardTaxCredit = 70000;
    const finalIncomeTax = Math.max(calculatedTax - standardTaxCredit, 0);
    const localTax = finalIncomeTax * 0.1;
    const totalTaxDue = finalIncomeTax + localTax;
    const refund = withheld - totalTaxDue;
    return { gross, withheld, expense, incomeAmount, basicDeduction, taxBase, calculatedTax, finalIncomeTax, localTax, totalTaxDue, refund };
  }

  // 정적 SEO 랜딩 페이지(calc/{id}.html)가 실제로 존재하는 계산기 id 목록
  const CALC_STATIC_PAGES = ['salary','insurance','severance','annual-leave','weekly-rest','freelance','tax-refund'];

  // ---------- 계산기별 자주 묻는 질문 (인라인 미리보기, 전체 FAQ는 calc/{id}.html 정적 페이지 참고) ----------
  const CALC_FAQ = {
    salary: [
      { q:'비과세액은 어떤 항목을 넣어야 하나요?', a:'식대(월 20만원까지 비과세), 자가운전보조금 등 비과세 처리되는 수당의 월 합계를 입력하면 더 정확한 실수령액을 계산할 수 있어요.' },
      { q:'실제 급여명세서와 금액이 다른데 왜 그런가요?', a:'이 계산기는 참고용 추정치예요. 회사별 비과세 처리 방식, 소수점 반올림 기준에 따라 실제 금액과 차이가 날 수 있어요.' }
    ],
    insurance: [
      { q:'4대보험은 아르바이트도 가입해야 하나요?', a:'월 60시간 이상 근무하는 경우 원칙적으로 4대보험 가입 대상이 돼요. 주휴수당 지급 기준(주 15시간)과는 별개의 기준이니 주의하세요.' },
      { q:'4대보험료는 회사와 얼마씩 나눠 내나요?', a:'국민연금·건강보험은 근로자와 회사가 절반씩 부담하고, 고용보험은 항목별로 부담 비율이 다르며, 산재보험은 전액 회사가 부담해요.' }
    ],
    severance: [
      { q:'퇴직금은 1년 미만 근무해도 받을 수 있나요?', a:'계속근로기간이 1년 이상이어야 퇴직금 지급 대상이 돼요. 1년 미만 근무 시에는 법정 퇴직금이 발생하지 않아요.' },
      { q:'퇴직금은 언제까지 지급받아야 하나요?', a:'근로기준법상 퇴직일로부터 14일 이내에 지급하는 것이 원칙이며, 당사자 간 합의로 연장할 수 있어요.' }
    ],
    'annual-leave': [
      { q:'연차는 입사 1년 차부터 발생하나요?', a:'입사 후 1개월 개근 시 1일씩 연차가 발생하며, 1년 이상 근무 시 별도로 15일의 연차가 부여돼요.' },
      { q:'연차수당의 소멸시효는 얼마나 되나요?', a:'연차수당 청구권의 소멸시효는 3년이에요. 3년이 지나면 청구할 수 없으니 정산 여부를 미리 확인해두는 것이 좋아요.' }
    ],
    'weekly-rest': [
      { q:'주 15시간은 어떻게 계산하나요?', a:'실제 출근한 시간이 아니라 근로계약서에 정해진 소정근로시간을 기준으로 판단해요.' },
      { q:'최저임금과 주휴수당은 별개인가요?', a:'네, 주휴수당은 최저임금과 별도로 지급되는 법정 수당이에요. 최저시급으로 계산한 월급에는 주휴수당이 포함되어야 정상적인 급여예요.' }
    ],
    freelance: [
      { q:'3.3%는 항상 동일한가요?', a:'네, 사업소득 원천징수세율은 소득세 3%와 지방소득세 0.3%를 합친 3.3%로 계약금액 규모와 관계없이 동일하게 적용돼요.' },
      { q:'3.3% 뗀 금액을 다시 돌려받을 수 있나요?', a:'다음 해 5월 종합소득세 신고를 통해 실제 세액보다 많이 낸 경우 환급받을 수 있어요.' }
    ],
    'tax-refund': [
      { q:'경비율은 어떻게 확인하나요?', a:'홈택스에서 본인의 업종코드를 조회하면 정확한 단순경비율 또는 기준경비율을 확인할 수 있어요. 이 계산기의 경비율은 예시값이에요.' },
      { q:'환급액이 마이너스로 나오면 어떻게 하나요?', a:'추가 납부 대상이라는 의미예요. 5월 신고 기한 내에 부족한 세액을 납부해야 가산세를 피할 수 있어요.' }
    ],
    'labor-cost': [
      { q:'산재보험료율이 왜 이렇게 대략적인가요?', a:'산재보험료율은 업종별로 0.6%~18.6%까지 크게 차이가 나서, 정확한 요율은 근로복지공단 토탈서비스에서 사업장 업종코드로 직접 조회해야 해요.' },
      { q:'두루누리 지원금은 반영되어 있나요?', a:'아니요, 이 계산기는 지원금을 반영하지 않은 총 부담액을 보여줘요. 상시근로자 10인 미만 사업장은 두루누리 사회보험료 지원을 받을 수 있으니 별도로 확인해보세요.' }
    ],
    'minwage-check': [
      { q:'상여금도 최저임금 계산에 포함되나요?', a:'2024년 이후 정기상여금과 복리후생비는 전액 최저임금 산입범위에 포함돼요. 다만 식대 등 일부 비과세성 항목의 산입 여부는 세부 기준을 확인해야 해요.' },
      { q:'2027년 최저임금은 얼마인가요?', a:'2027년 최저시급은 10,700원이에요. 주 40시간 기준 월 2,236,300원이고, 2027년 1월 1일부터 이 계산기에도 자동으로 적용돼요.' },
      { q:'수습기간에는 최저임금보다 적게 줘도 되나요?', a:'수습 시작일로부터 3개월 이내에는 최저임금의 90%까지 감액할 수 있지만, 1년 미만 근로계약이거나 단순노무직종이면 감액이 적용되지 않아요.' }
    ],
    'daily-worker-tax': [
      { q:'일용직도 4대보험에 가입해야 하나요?', a:'고용보험과 산재보험은 일용직도 원칙적으로 의무가입 대상이에요. 국민연금·건강보험은 근무일수와 소득 기준에 따라 가입 여부가 달라져요.' },
      { q:'하루 15만원 이하로 받으면 세금이 아예 없나요?', a:'네, 일용근로소득은 1일 15만원까지 근로소득공제가 적용되어 그 이하 금액에는 원천징수세액이 발생하지 않아요.' }
    ]
  };
  const LEGAL_BASIS = {
    salary: '근로기준법 제43조(임금 지급), 국민연금법·국민건강보험법·고용보험법에 따라 4대보험료와 근로소득세가 원천공제됩니다. 소득세는 국세청 근로소득 간이세액표 기준 추정치입니다.',
    insurance: '국민연금법, 국민건강보험법(장기요양보험법 포함), 고용보험법에 따른 근로자 부담분 요율을 적용합니다. 매년 각 공단의 고시로 요율과 상하한액이 변경됩니다.',
    severance: '근로자퇴직급여 보장법 제8조에 따라 계속근로기간 1년에 대해 30일분의 평균임금을 퇴직금으로 지급해야 합니다. 평균임금 산정 기준은 근로기준법 시행령을 따릅니다.',
    'annual-leave': '근로기준법 제60조(연차 유급휴가)에 따라 발생한 연차 중 미사용분은 통상임금 또는 평균임금을 기준으로 수당으로 정산됩니다.',
    'weekly-rest': '근로기준법 제55조(주휴일)에 따라 1주 소정근로시간이 15시간 이상이고 소정근로일을 개근한 근로자에게 유급 주휴일이 부여됩니다.',
    freelance: '소득세법 제127조에 따라 사업소득 지급 시 3.3%(소득세 3% + 지방소득세 0.3%)가 원천징수됩니다. 이는 확정 세액이 아니며 다음 해 종합소득세 신고로 정산됩니다.',
    'tax-refund': '소득세법에 따른 종합소득세 신고·납부 의무 및 단순경비율 제도를 기준으로 한 근사 계산입니다. 실제 경비율은 국세청 고시 업종코드를 홈택스에서 확인해야 합니다.',
    'labor-cost': '국민연금법·국민건강보험법·고용보험법·산업재해보상보험법에 따라 사업주는 근로자 부담분 외에 별도의 사업주 부담분 보험료를 납부해야 합니다. 산재보험료율은 한국표준산업분류상 업종별로 상이합니다(근로복지공단 고시).',
    'minwage-check': '최저임금법 제6조에 따라 사용자는 최저임금액 이상의 임금을 지급해야 하며, 위반 시 3년 이하의 징역 또는 2천만원 이하의 벌금에 처해질 수 있습니다. 최저임금 산입범위는 최저임금법 시행규칙에서 정합니다.',
    'daily-worker-tax': '소득세법 제129조 및 제134조에 따라 일용근로소득은 1일 15만원을 공제한 금액에 6% 세율을 적용하고 55% 세액공제 후 원천징수합니다.'
  };
  // 3.3% 원천징수: 소득세·지방소득세 모두 10원 미만 버림, 소득세 1,000원 미만은 소액부징수
  const tax33 = g => { const it=Math.floor(g*0.03/10)*10; return it<1000 ? {it:0,lt:0} : {it, lt:Math.floor(it*0.1/10)*10}; };
  const wht33 = g => { const t=tax33(g); return {g, it:t.it, lt:t.lt, net:g-t.it-t.lt}; };
  const rev33 = net => { let g=Math.round(net/0.967), t=tax33(g);
    if(t.it===0) return {g:net, it:0, lt:0, net};
    for(let k=0;k<3&&g-t.it-t.lt!==net;k++){ g+=net-(g-t.it-t.lt); t=tax33(g); }
    return {g, it:t.it, lt:t.lt, net}; };
  const calcs = [
    { id:'salary', label:'연봉 실수령액', title:'연봉 실수령액 계산기', group:'employee',
      fields:[{id:'annual',label:'연봉(세전, 세금·보험 떼기 전 총액)',unit:'만원',placeholder:'예: 4000'},{id:'nonTaxable',label:'비과세액(식대 등, 월)',unit:'만원',placeholder:'예: 20'},{id:'dependents',label:'부양가족 수(본인 포함)',unit:'명',placeholder:'예: 1'}],
      run(v){
        const annual=(+v.annual||0)*10000, monthlyGross=annual/12, nonTax=(+v.nonTaxable||0)*10000;
        const taxableMonthly=Math.max(monthlyGross-nonTax,0);
        const pBase=pensionBase(taxableMonthly), pension=pBase*(RATES.pension/100);
        const health=taxableMonthly*(RATES.health/100), ltc=health*(RATES.ltc/100), employment=taxableMonthly*(RATES.employment/100);
        const incomeTax=estimateMonthlyIncomeTax(taxableMonthly,+v.dependents||1), localTax=incomeTax*0.1;
        const netMonthly=monthlyGross-(pension+health+ltc+employment+incomeTax+localTax);
        return { main: won(netMonthly)+' / 월',
          sub:[['세전 연봉(입력값)',won(annual)],['세전 월급여(연봉÷12)',won(monthlyGross)],[`국민연금(${RATES.pension}%)`,won(pension)],[`건강보험(${RATES.health}%)`,won(health)],['장기요양보험',won(ltc)],[`고용보험(${RATES.employment}%)`,won(employment)],['소득세+지방세(추정)',won(incomeTax+localTax)],['월 실수령액',won(netMonthly)],['연 실수령액(세후, 월×12 근사치)',won(netMonthly*12)]],
          related: RELATED.salary };
      }},
    { id:'salary-compare', label:'연봉 비교', title:'연봉 비교 계산기', group:'employee',
      disclaimerExtra:'두 조건의 부양가족 수는 동일하다고 가정하고 계산해요. 회사별로 비과세 항목 구성이 다르면 A/B의 비과세액을 다르게 입력해서 비교해보세요.',
      fields:[
        {id:'annualA',label:'A사 연봉(세전)',unit:'만원',placeholder:'예: 4000'},
        {id:'nonTaxableA',label:'A사 비과세액(월)',unit:'만원',placeholder:'예: 20'},
        {id:'annualB',label:'B사 연봉(세전)',unit:'만원',placeholder:'예: 4300'},
        {id:'nonTaxableB',label:'B사 비과세액(월)',unit:'만원',placeholder:'예: 20'},
        {id:'dependents',label:'부양가족 수(본인 포함, 공통)',unit:'명',placeholder:'예: 1'}
      ],
      run(v){
        function netOf(annualVal, nonTaxVal){
          const annual=(+annualVal||0)*10000, monthlyGross=annual/12, nonTax=(+nonTaxVal||0)*10000;
          const taxableMonthly=Math.max(monthlyGross-nonTax,0);
          const pBase=pensionBase(taxableMonthly), pension=pBase*(RATES.pension/100);
          const health=taxableMonthly*(RATES.health/100), ltc=health*(RATES.ltc/100), employment=taxableMonthly*(RATES.employment/100);
          const incomeTax=estimateMonthlyIncomeTax(taxableMonthly,+v.dependents||1), localTax=incomeTax*0.1;
          const netMonthly=monthlyGross-(pension+health+ltc+employment+incomeTax+localTax);
          return { monthlyGross, netMonthly };
        }
        const A = netOf(v.annualA, v.nonTaxableA);
        const B = netOf(v.annualB, v.nonTaxableB);
        const diff = B.netMonthly - A.netMonthly;
        const better = Math.abs(diff) < 1 ? '동일' : (diff>0 ? 'B사' : 'A사');
        return {
          main: better==='동일' ? '두 조건의 월 실수령액이 거의 같아요' : `${better} 조건이 월 ${won(Math.abs(diff))} 더 많아요`,
          sub:[
            ['A사 세전 월급여',won(A.monthlyGross)],['A사 월 실수령액',won(A.netMonthly)],
            ['B사 세전 월급여',won(B.monthlyGross)],['B사 월 실수령액',won(B.netMonthly)],
            ['연간 차이(월×12 근사)',won(Math.abs(diff)*12)]
          ],
          related: RELATED.salary
        };
      }},
    { id:'insurance', label:'4대보험 계산기', title:'4대보험 계산기', group:'employee',
      fields:[{id:'monthly',label:'월 급여(세전)',unit:'만원',placeholder:'예: 300'}],
      run(v){
        const m=(+v.monthly||0)*10000, pBase=pensionBase(m), pension=pBase*(RATES.pension/100);
        const health=m*(RATES.health/100), ltc=health*(RATES.ltc/100), employment=m*(RATES.employment/100);
        return { main: won(pension+health+ltc+employment)+' / 월 공제',
          sub:[['국민연금',won(pension)],['건강보험',won(health)],['장기요양보험',won(ltc)],['고용보험',won(employment)]],
          related: RELATED.insurance };
      }},
    { id:'severance', label:'퇴직금', title:'퇴직금 계산기', group:'employee',
      disclaimerExtra:'계산식: 1일 평균임금 = 최근 3개월간 지급된 임금총액 ÷ 그 3개월의 실제 달력일수(보통 89~92일) · 퇴직금 = 1일 평균임금 × 30일 × (재직기간 ÷ 365). 퇴사 직전 3개월에 어떤 달이 포함되는지에 따라 총일수(28~31일씩 합산)가 달라져서 회사마다 결과가 조금씩 다르게 느껴질 수 있어요. 정확한 일수는 급여명세서의 근무기간으로 확인하세요.',
      fields:[
        {id:'recent3',label:'최근 3개월 총급여(세전, 상여금 제외)',unit:'만원',placeholder:'예: 900'},
        {id:'recentDays',label:'최근 3개월 실제 달력일수',unit:'일',placeholder:'예: 90',hint:'정확히 모르면 90일로 두어도 큰 차이는 없어요. 급여명세서에 적힌 근무기간의 실제 날짜 수(89~92일)를 넣으면 더 정확해요.'},
        {id:'years',label:'근속연수',unit:'년',placeholder:'예: 3'},
        {id:'months',label:'근속개월(나머지 개월 수)',unit:'개월',placeholder:'예: 11',hint:'예: 3년 11개월 근무했다면 근속연수 3, 근속개월 11로 나눠 입력하세요.'}
      ],
      run(v){
        const total3=(+v.recent3||0)*10000, days3=+v.recentDays||90, years=+v.years||0, months=+v.months||0;
        const avgDaily=total3/days3, servicePeriodYears=years+months/12, severance=avgDaily*30*servicePeriodYears;
        return { main: won(severance), sub:[
          ['1일 평균임금(총급여÷총일수)',won(avgDaily)],
          ['근속기간',`${years}년 ${months}개월`],
          ['재직기간(년 환산)',servicePeriodYears.toFixed(2)+'년']
        ], related: RELATED.severance };
      }},
    { id:'annual-leave', label:'연차수당', title:'연차수당 계산기', group:'employee',
      disclaimerExtra:'통상시급을 정확히 모른다면, 급여명세서의 세전 월급여(기본급+각종 수당 합계, 상여금·비정기수당 제외)를 209로 나눈 값이 근사치예요. 209는 주 40시간 근무 기준 월 평균 소정근로시간(주휴시간 포함)이며, 회사 취업규칙에 따라 실제 통상시급 산정 기준은 다를 수 있어요.',
      fields:[
        {id:'hourlyWage',label:'통상시급',unit:'원',placeholder:'예: 15000',hint:'모르면 [세전 월급여 ÷ 209]로 계산한 값을 넣어보세요. 급여명세서의 월급여(기본급+수당, 상여금 제외) 기준이에요.'},
        {id:'unusedDays',label:'미사용 연차일수',unit:'일',placeholder:'예: 5'}
      ],
      run(v){
        const wage=+v.hourlyWage||0, days=+v.unusedDays||0, allowance=wage*8*days;
        return { main: won(allowance), sub:[['1일 통상임금(8시간 기준)',won(wage*8)],['미사용 연차',days+'일']], related: RELATED['annual-leave'] };
      }},
    { id:'weekly-rest', label:'주휴수당', title:'주휴수당 계산기', group:'employee',
      fields:[{id:'hourly',label:'시급',unit:'원',placeholder:'예: 10030'},{id:'weeklyHours',label:'주당 근무시간',unit:'시간',placeholder:'예: 20'}],
      run(v){
        const hourly=+v.hourly||0, wh=+v.weeklyHours||0;
        if (wh<15) return { main:'지급 대상 아님', sub:[['주 15시간 미만은 주휴수당 지급 대상이 아니에요','']], related: RELATED['weekly-rest'] };
        const dailyEq=Math.min(wh/5,8), allowance=dailyEq*hourly;
        return { main: won(allowance)+' / 주', sub:[['환산 1일 근무시간',dailyEq.toFixed(1)+'시간'],['주당 근무시간',wh+'시간']], related: RELATED['weekly-rest'] };
      }},
    { id:'freelance', label:'3.3% 계산기', title:'3.3% 계산기', group:'freelance', dual:true,
      fields:[{id:'contract',label:'계약 금액',unit:'원',placeholder:'0'},{id:'net',label:'실제 수령액',unit:'원',placeholder:'0'}],
      run(v){
        const r=wht33(+v.contract||0);
        return { main: won(r.net)+' 실수령', sub:[['소득세 3%',won(r.it)],['지방소득세 0.3%',won(r.lt)],['계약금액',won(r.g)]], related: RELATED.freelance };
      }},
    { id:'tax-refund', label:'종합소득세 환급 계산기', title:'종합소득세 환급 계산기', group:'freelance',
      disclaimerExtra:'업종별 경비율은 예시값이며 실제 국세청 고시 업종코드·경비율과 다를 수 있어요. 정확한 값은 홈택스에서 확인하세요.',
      fields:[
        {id:'netIncome', label:'작년 한 해 총소득(3.3% 떼고 받은 금액)', unit:'만원', placeholder:'예: 3000'},
        {id:'jobCode', label:'업종 선택', type:'select', options: JOB_TABLE.map((j,i)=>({value:i, label:`${j.name} (경비율 약 ${j.rate}%)`}))},
        {id:'dependents', label:'부양가족 수(본인 포함)', unit:'명', placeholder:'예: 1'}
      ],
      run(v){
        const netReceived=(+v.netIncome||0)*10000;
        const job = JOB_TABLE[+v.jobCode] || JOB_TABLE[JOB_TABLE.length-1];
        const dependents = +v.dependents||1;
        const r = calcTaxRefund(netReceived, job.rate, dependents);
        return {
          main: r.refund>=0 ? won(r.refund)+' 환급 예상' : won(-r.refund)+' 추가납부 예상',
          refund: r.refund,
          customRender: true,
          sub:[
            ['환산 총수입금액(연)', won(r.gross)],
            [`필요경비(${job.name}, ${job.rate}%)`, won(r.expense)],
            ['소득금액', won(r.incomeAmount)],
            ['기본공제(부양가족)', won(r.basicDeduction)],
            ['과세표준', won(r.taxBase)],
            ['산출세액(추정)', won(r.calculatedTax)],
            ['결정세액(소득세+지방소득세, 추정)', won(r.totalTaxDue)],
            ['기납부세액(원천징수 3.3%)', won(r.withheld)]
          ],
          related: RELATED['tax-refund']
        };
      }},
    { id:'labor-cost', label:'인건비 계산기', title:'인건비 계산기', group:'employer',
      disclaimerExtra:'산재보험료율은 업종에 따라 0.6%~18.6%까지 크게 차이나며 여기서는 평균적인 예시값(1.0%)을 사용했어요. 정확한 요율은 근로복지공단 토탈서비스에서 사업장 업종코드로 조회하세요. 고용보험 사업주 부담분(고용안정·직업능력개발사업)도 기업 규모별로 달라 예시값을 반영했어요.',
      fields:[
        {id:'monthlyWage',label:'직원 월 급여(세전, 1인 기준)',unit:'만원',placeholder:'예: 250'},
        {id:'employees',label:'해당 조건 직원 수',unit:'명',placeholder:'예: 1'}
      ],
      run(v){
        const wage=(+v.monthlyWage||0)*10000, emp=Math.max(+v.employees||1,1);
        const pBase=pensionBase(wage), pensionEmployer=pBase*(RATES.pension/100);
        const health=wage*(RATES.health/100), ltc=health*(RATES.ltc/100);
        const employmentEmployer=wage*((RATES.employment+0.25)/100);
        const industrialAccident=wage*(1.0/100);
        const totalPerEmployee = wage+pensionEmployer+health+ltc+employmentEmployer+industrialAccident;
        const totalAll = totalPerEmployee*emp;
        return { main: won(totalPerEmployee)+' / 인당 월 총 인건비',
          sub:[
            ['세전 월급여(입력값)',won(wage)],
            [`국민연금(사업주 부담, ${RATES.pension}%)`,won(pensionEmployer)],
            [`건강보험(사업주 부담, ${RATES.health}%)`,won(health)],
            ['장기요양보험(사업주 부담)',won(ltc)],
            ['고용보험(사업주 부담, 예시)',won(employmentEmployer)],
            ['산재보험(업종별 상이, 예시 1.0%)',won(industrialAccident)],
            ['직원 1인당 월 총 인건비',won(totalPerEmployee)],
            [`${emp}명 기준 월 합계`,won(totalAll)],
            [`${emp}명 기준 연 합계(월×12 근사)`,won(totalAll*12)]
          ],
          related: [] };
      }},
    { id:'minwage-check', label:'최저임금 계산기', title:'최저임금 계산기', group:'employer',
      disclaimerExtra:'식대 등 일부 수당은 최저임금 계산에서 빠질 수 있어요.',
      fields:[
        {id:'mode',type:'seg',label:'어떻게 받나요?',options:[{value:'month',label:'월급으로'},{value:'hour',label:'시급으로'}]},
        {id:'monthlyPay',when:'month',label:'월 급여 총액 (세전, 주휴수당 포함)',unit:'원',placeholder:'예: '+RATES.minimumWage*209},
        {id:'monthlyHours',when:'month',label:'월 근무시간 (유급 주휴시간 포함)',unit:'시간',placeholder:'예: 209',hint:'주 40시간 근무면 보통 월 209시간이에요.'},
        {id:'hourly',when:'hour',label:'내 시급',unit:'원',placeholder:'예: '+RATES.minimumWage}
      ],
      run(v){
        const min=RATES.minimumWage, yr=RATES.minimumWageYear;
        const verdict=d=>d<-0.5?`⚠️ 최저임금보다 시간당 ${won(-d)} 적어요`:`✅ 최저임금 이상이에요${d>=0.5?` (시간당 +${won(d)})`:''}`;
        if(v.mode==='hour'){
          const h=+v.hourly||0; if(h<=0) return {main:'시급을 입력해 주세요',sub:[],related:[]};
          return {main:verdict(h-min),sub:[['내 시급',won(h)],[`${yr}년 최저시급`,won(min)],[`${yr}년 최저 월급(209시간)`,won(min*209)],['주 15시간 이상 일하면 주휴수당은 따로 받아요.','']],related:RELATED['weekly-rest']||[]};
        }
        const pay=+v.monthlyPay||0, hours=+v.monthlyHours||0;
        if(hours<=0) return {main:'월 근무시간을 입력해 주세요',sub:[],related:[]};
        const eff=pay/hours, rows=[['내 월급',won(pay)],['시급으로 바꾸면',won(eff)],[`${yr}년 최저시급`,won(min)],[`${yr}년 최저 월급(209시간)`,won(min*209)]];
        if(Math.abs(hours-209)>0.01) rows.push([`${hours}시간 기준 최저 월급`,won(min*hours)]);
        return {main:verdict(eff-min),sub:rows,related:RELATED['minwage-check']};
      }},
    { id:'daily-worker-tax', label:'일용직 근로소득세', title:'일용직 근로소득세 계산기', group:'employer',
      disclaimerExtra:'일용근로소득세는 동일 고용주에게 3개월(건설공사는 1년) 미만 계속 근로하는 세법상 일용근로자에게 적용되는 계산식이에요. 4대보험(고용·산재보험은 일용직도 의무가입 대상인 경우가 많아요) 공제분은 이 계산에 포함되지 않았습니다.',
      fields:[
        {id:'dailyWage',label:'1일 급여(세전)',unit:'원',placeholder:'예: 150000'},
        {id:'workDays',label:'근무일수',unit:'일',placeholder:'예: 10'}
      ],
      run(v){
        const daily=+v.dailyWage||0, days=Math.max(+v.workDays||1,1);
        const taxableDaily = Math.max(daily-150000,0);
        const calculatedTax = taxableDaily*0.06;
        const credit = calculatedTax*0.55;
        const incomeTax = calculatedTax-credit;
        const localTax = incomeTax*0.1;
        const totalTaxDaily = incomeTax+localTax;
        const netDaily = daily-totalTaxDaily;
        return { main: won(netDaily)+' / 일 실지급액',
          sub:[
            ['1일 급여(세전, 입력값)',won(daily)],
            ['근로소득공제(비과세, 1일)',won(150000)],
            ['과세대상액',won(taxableDaily)],
            ['산출세액(6%)',won(calculatedTax)],
            ['근로소득세액공제(55%)',won(credit)],
            ['소득세',won(incomeTax)],
            ['지방소득세(10%)',won(localTax)],
            ['1일 원천징수세액 합계',won(totalTaxDaily)],
            ['1일 실지급액',won(netDaily)],
            [`${days}일 근무 시 실지급 합계`,won(netDaily*days)],
            [`${days}일 근무 시 원천징수세액 합계`,won(totalTaxDaily*days)]
          ],
          related: RELATED['daily-worker-tax'] };
      }}
  ];
const DATA=window.DATA||{draws:[],pension:[],places:{},config:{}};
const CFG=DATA.config||{};
const fmtEok=n=>{n=Math.round(n||0);const e=Math.floor(n/1e8),m=Math.floor(n%1e8/1e4);return ((e?e+'억 ':'')+(m?m.toLocaleString()+'만':'')).trim()||n.toLocaleString()};
const DRAWS=DATA.draws.map(x=>({r:x[0],date:x[1],d:(+x[1].slice(5,7))+'/'+(+x[1].slice(8,10)),n:x[2],b:x[3],prize:x[4],win:x[5],auto:x[6],man:x[7],semi:x[8],sales:x[9]})).sort((a,b)=>b.r-a.r);
DRAWS.forEach(d=>{d.total=d.win?fmtEok(d.prize*d.win)+'원':'1등 없음';d.per=d.prize?fmtEok(d.prize):'0'});
const PEN=DATA.pension.map(x=>[x[0],x[1].slice(5).replace('-','.'),x[2]+'조 '+x[3],x[4],x[1].replace(/-/g,'.')]).sort((a,b)=>b[0]-a[0]);
const PL=DATA.places||{};
const ymd=s=>s.replace(/-/g,'.');
const TABS=[['home','⌂','홈'],['calc','≡','계산기'],['lotto','●','로또'],['pension','₩','연금복권'],['guide','✎','게시판']];
const col=n=>n<=10?'y':n<=20?'b':n<=30?'r':n<=40?'g':'n';
const ball=(n,s='')=>`<span class="ball ${col(n)} ${s}">${n}</span>`;
const balls=(d,s='')=>`<div class="balls">${d.n.map(n=>ball(n,s)).join('')}<span class="plus">+</span>${ball(d.b,s)}</div>`;
function pathOf(t){if(t=='home')return '/';if(t=='calc')return '/calc/';if(t.startsWith('c-'))return '/calc/'+t.slice(2)+'/';if(t=='lotto')return '/lotto/';if(t=='all')return '/lotto/all/';if(t.startsWith('draw'))return '/lotto/'+t.slice(4)+'/';if(t=='pension')return '/pension/';if(t=='penall')return '/pension/all/';if(t=='guide')return '/blog/';if(t.startsWith('b-'))return '/blog/'+t.slice(2)+'/';return '/'+t+'/'}
function routeOf(p){const s=(p||'/').replace(/index\.html$/,'').split('/').filter(Boolean);if(!s.length)return 'home';const a=s[0],b=s[1];if(a=='calc')return b?'c-'+b:'calc';if(a=='lotto')return b=='all'?'all':b?'draw'+b:'lotto';if(a=='pension')return b=='all'?'penall':'pension';if(a=='blog')return b?'b-'+decodeURIComponent(b):'guide';return a}
let cur=(typeof window!='undefined'&&window.__ROUTE)||routeOf(typeof location!='undefined'?location.pathname:'/'),pick=new Set,placeF='region',gens=[];
function go(t){location.href=pathOf(t)}
const A=(t,cls,inner)=>`<a href="${pathOf(t)}"${cls?` class="${cls}"`:''}>${inner}</a>`;
const foot=`<div class="ad-slot" id="ad-foot"></div><footer><div>계산 결과는 참고용 추정치예요. 정확한 금액은 해당 기관에서 확인하세요.</div><nav class="fl">${A('about','','소개')}${A('method','','계산 기준')}${A('contact','','문의')}${A('terms','','이용약관')}${A('privacy','','개인정보처리방침')}</nav><div>로또·연금복권 정보는 동행복권 공식 발표 자료 기준</div><div>만 19세 이상 구매 가능 · 도박 문제 상담 1336 (24시간)</div><div>통계와 번호 뽑기는 재미로 보는 정보예요</div><div>© ${new Date().getFullYear()} 받는돈 getdon24.com</div></footer>`;

function lottoWin(){const d=DRAWS[0],m=[...pick];let res='';
 if(m.length===6){const h=m.filter(n=>d.n.includes(n)).length,bo=m.includes(d.b),rk=h==6?'1등':h==5&&bo?'2등':h==5?'3등':h==4?'4등':h==3?'5등':'낙첨';res=`<div class="res"><span>${h}개 일치${bo?' + 보너스':''}</span><b style="color:${rk=='낙첨'?'var(--mute)':'var(--red)'}">${rk}</b></div>`}
 else res=`<p class="note">번호 6개를 누르면 ${d.r}회 결과를 바로 알려 드려요 (${m.length}/6)</p>`;
 return `<section class="hero"><div class="t">제 ${d.r}회 당첨번호 <span>${d.d}</span></div>${balls(d)}<div class="big">${d.total}</div><div class="meta">1등 ${d.win}명 · 1인 ${d.per}원${d.auto!=null?` · 자동 ${d.auto} 수동 ${d.man}${d.semi?` 반자동 ${d.semi}`:''}`:''}</div>${A('draw'+d.r,'more',`${d.r}회 상세 분석 ›`)}<div class="cdw">다음 추첨까지 <span class="cd" id="cd"></span></div></section>
 <h2>로또 실수령액 계산기 <small>당첨금 입력</small></h2>${taxPanel()}
 <h2>지난 회차 <small>최근 5회</small></h2><div class="past">${DRAWS.slice(1,6).map(d=>A('draw'+d.r,'pc',`<p>${d.r}회 · ${d.d}</p>${balls(d,'sm')}`)).join('')}</div>${A('all','btn ghost allbtn','전체 회차 보기 ›')}${foot}`}
function tg(n){pick.has(n)?pick.delete(n):pick.size<6&&pick.add(n);render()}

function place(){const L=PL.latest||{r:0,rows:[]},REG=PL.regions||[],TOP=PL.top||[],seg=`<div class="seg">${[['region','시도별 1등'],['top','명당 순위']].map(([k,l])=>`<button class="${placeF==k?'on':''}" onclick="placeF='${k}';render()">${l}</button>`).join('')}</div>`;
 const tag=m=>`<span class="tag ${m=='수동'?'m':m=='반자동'?'s':''}">${m}</span>`;
 const st=`<h2>${L.r}회 1등 판매점 <small>1등 ${L.games}건</small></h2>${L.rows.map(s=>`<div class="it"><span class="nm">${s[0]}${s[3]>1?` ×${s[3]}`:''}</span><span class="ad one">${s[1]}</span>${tag(s[2])}</div>`).join('')}`;
 const mx=REG.length?REG[0][1]:1;
 if(placeF=='region')return st+`<h2>지역별 1등 <small>${PL.from}~${PL.to}회 · ${(PL.total||0).toLocaleString()}건</small></h2>${seg}<p class="note"><span class="dot"></span> ${L.r}회 1등 나온 지역 · 인터넷 판매 제외</p>${REG.map(r=>`<div class="rg"><span>${r[2]?'<span class="dot"></span>':''}</span><span class="nm">${r[0]}</span><div class="bar"><i style="width:${r[1]/mx*100}%"></i></div><b>${r[1].toLocaleString()}</b></div>`).join('')}${foot}`;
 return st+`<h2>명당 순위 TOP ${TOP.length} <small>1등 횟수</small></h2>${seg}${TOP.map((t,i)=>`<div class="it"><span class="rk">${i+1}</span><span class="nm">${t[0]}</span><span class="ad one">${t[1]}</span><span class="num">${t[2]}회</span></div>`).join('')}<p class="note" style="margin-top:8px">${PL.from}회부터 동행복권 1등 배출점 기록 기준이에요. 인터넷 판매는 뺐어요. 명당이 당첨 확률을 높이지는 않아요.</p>${foot}`}

function gen(){const c={};DRAWS.slice(0,10).forEach(d=>d.n.forEach(n=>c[n]=(c[n]||0)+1));const hot=Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,6).map(e=>+e[0]);const cold=Array.from({length:45},(_,i)=>i+1).filter(n=>!c[n]);
 return `<h2>번호 뽑기</h2><div class="panel"><div class="btns"><button class="btn" onclick="mk('rand')">랜덤 5게임</button><button class="btn ghost" onclick="mk('hot')">자주 나온 수 섞기</button></div>${gens.map((g,i)=>`<div class="gl"><em>${'ABCDE'[i]}</em><div class="balls" style="margin:0;gap:3px">${g.map(n=>ball(n,'sm')).join('')}</div></div>`).join('')||'<p class="note">버튼을 누르면 번호 5줄이 나와요</p>'}</div>
 <h2>최근 10회 통계</h2><div class="panel"><p class="note">많이 나온 번호</p><div class="balls" style="justify-content:flex-start;margin:0;gap:3px">${hot.map(n=>ball(n,'sm')).join('')}</div><p class="note">안 나온 번호 ${cold.length}개</p><div style="display:flex;flex-wrap:wrap;gap:3px">${cold.map(n=>ball(n,'sm')).join('')}</div></div>${foot}`}
function mk(t){const c={};DRAWS.slice(0,10).forEach(d=>d.n.forEach(n=>c[n]=(c[n]||0)+1));gens=[];for(let g=0;g<5;g++){const s=new Set;if(t=='hot'){const h=Object.keys(c).filter(k=>c[k]>1).map(Number);while(s.size<3)s.add(h[Math.floor(Math.random()*h.length)])}while(s.size<6)s.add(1+Math.floor(Math.random()*45));gens.push([...s].sort((a,b)=>a-b))}render()}

const PR=[['1등+2등 4장','combo',0,0],['1등','월',7e6,240],['2등·보너스','월',1e6,120],['3등','일시',1e6,1],['4등','일시',1e5,1],['5등','일시',5e4,1]];let pr=0;
function penCalc(){if(PR[pr][1]=='combo')return penCombo();const [n,k,g,m]=PR[pr],tx=k=='월'?Math.floor(g*.22):0,net=g-tx;const r=(a,b,st='')=>`<div class="res"><span>${a}</span><b ${st}>${b}</b></div>`;
 return `<div class="seg" style="flex-wrap:wrap">${PR.map((p,i)=>`<button class="${i==pr?'on':''}" style="flex:1 0 30%" onclick="pr=${i};render()">${p[0]}</button>`).join('')}</div>`
 +(k=='월'?r('매달 당첨금',W(g))+r('세금 22% (소득세 20% + 지방세 2%)','− '+W(tx))+`<div style="border-top:2px solid var(--fg)"></div>`+r('매달 실수령액',W(net),'style="font-size:20px;color:var(--blue)"')+r(`${m/12}년 동안 받는 총액`,W(net*m))+r('세금 총액',W(tx*m))
  :r('당첨금',W(g))+r('세금','0원 (200만원 이하 비과세)')+r('실수령액',W(g),'style="font-size:20px;color:var(--blue)"'))}
function penCombo(){const r=(a,b,st='')=>`<div class="res"><span>${a}</span><b ${st}>${b}</b></div>`,hr=w=>`<div style="border-top:${w}px solid var(--fg)"></div>`;
 const n1=7e6-Math.floor(7e6*.22),n2=1e6-Math.floor(1e6*.22),a=n1+n2*4;
 return `<div class="seg" style="flex-wrap:wrap">${PR.map((p,i)=>`<button class="${i==pr?'on':''}" style="flex:1 0 30%" onclick="pr=${i};render()">${p[0]}</button>`).join('')}</div>
 <p class="note">같은 번호를 1~5조 모두 사서(5장) 1등이 되면, 나머지 4장은 조만 달라서 자동으로 2등이에요.</p>
 <b>처음 10년 (1~120개월)</b>${r('1등 매달 700만 − 세금 22%',W(n1))}${r('2등 4장 × (100만 − 세금 22%)',W(n2*4))}${hr(2)}${r('매달 실수령액',W(a),'style="font-size:20px;color:var(--blue)"')}
 <b style="margin-top:6px">다음 10년 (121~240개월)</b>${r('1등만 계속',W(n1))}${hr(2)}${r('매달 실수령액',W(n1),'style="font-size:18px;color:var(--blue)"')}
 <b style="margin-top:6px">20년 합계</b>${r('1등 546만 × 240개월',W(n1*240))}${r('2등 312만 × 120개월',W(n2*4*120))}${hr(2)}${r('총 실수령액',W(n1*240+n2*4*120),'style="font-size:20px;color:var(--red)"')}${r('세금 총액',W(7e6*.22*240+1e6*.22*4*120))}`}
function pension(){const p=PEN[0],[jo,num]=[p[2].split('조')[0],p[2].split(' ')[1]];
 return `<section class="hero"><div class="t">제 ${p[0]}회 연금복권720+ <span>${p[1]}</span></div><div class="balls"><span class="ball jo">${jo}<small>조</small></span>${num.split('').map((c,k)=>`<span class="ball ${['r','y','b','g','pu','n'][k]}">${c}</span>`).join('')}</div><div class="meta" style="margin-top:12px">1등 월 700만원 × 20년 · 매주 목요일 19:05 추첨</div><div class="cdw">다음 추첨까지 <span class="cd" id="cdp"></span></div></section>
 <h2>연금복권 실수령액 <small>등수 선택</small></h2><div class="panel">${penCalc()}<p class="note">연금형은 매달 받는 금액에 22%가 붙어요. 1등은 20년, 2등과 보너스는 10년 동안 받아요.</p></div><h2>지난 회차 <small>최근 5회</small></h2>${PEN.slice(1,6).map(p=>`<div class="pen"><span><strong>${p[0]}회</strong><small>${p[1]}</small></span><b>${p[2]}</b></div>`).join('')}${A('penall','btn ghost allbtn','전체 회차 보기 ›')}${foot}`}

let amtV=String((DRAWS[0]&&DRAWS[0].prize)||1881025430);
const W=v=>Math.floor(v).toLocaleString()+'원';
function calc(a){if(a<=2e6)return{free:1,base:a,lo:0,hi:0,inc:0,loc:0,tot:0,net:a,rate:0};
 const base=a-1000,lo=Math.min(base,3e8),hi=Math.max(base-3e8,0),inc=Math.floor((lo*.2+hi*.3)/10)*10,loc=Math.floor(inc*.1/10)*10,tot=inc+loc;
 return{base,lo,hi,inc,loc,tot,net:a-tot,rate:tot/a*100}}
function breakdown(a){const c=calc(a);
 if(c.free)return `<div class="res"><span>세금</span><b>0원</b></div><div class="res"><span>실수령액</span><b style="font-size:20px;color:var(--blue)">${W(a)}</b></div><p class="note">200만원 이하라 세금이 없어요 (5등·4등·3등 대부분).</p>`;
 const r=(k,v,s='')=>`<div class="res"><span>${k}</span><b ${s}>${v}</b></div>`;
 return r('당첨금',W(a))+r('① 구입비 공제','− 1,000원')+r('과세 대상',W(c.base))
 +`<div style="border-top:1px solid var(--line)"></div>`
 +r('② 소득세 3억까지 × 20%',W(c.lo*.2))+(c.hi?r('③ 소득세 3억 초과분 × 30%',W(c.hi*.3)):'')
 +r('④ 지방소득세 (소득세 × 10%)',W(c.loc))+r('세금 합계','− '+W(c.tot))
 +`<div style="border-top:2px solid var(--fg)"></div>`
 +r('실수령액',W(c.net),'style="font-size:20px;color:var(--blue)"')+r('실효세율',c.rate.toFixed(1)+' %')}
function taxPanel(){const a=+amtV.replace(/\D/g,'')||0;return `<div class="panel"><input id="amt" inputmode="numeric" value="${a.toLocaleString()}" oninput="amtV=this.value;upd()" aria-label="당첨금 (세금 떼기 전)"><div class="btns">${DRAWS[0]?`<button class="btn ghost" onclick="setA(${DRAWS[0].prize})">${DRAWS[0].r}회 1등</button>`:''}<button class="btn ghost" onclick="setA(5e7)">5천만</button><button class="btn ghost" onclick="setA(15e5)">150만</button></div><div id="bd" style="display:grid;gap:10px">${breakdown(a)}</div></div><button class="btn ghost" style="width:100%;margin-top:8px" onclick="go('b-lotto-tax-guide')">계산 방법 자세히 보기 ›</button>`}









function setA(v){amtV=String(v);render()}
function upd(){document.getElementById('bd').innerHTML=breakdown(+amtV.replace(/\D/g,'')||0)}

let boardF='전체';
function draw(r){const i=DRAWS.findIndex(d=>d.r==r);if(i<0)return allDraws();const d=DRAWS[i],p=DRAWS[i+1],n=d.n,sum=n.reduce((a,b)=>a+b,0),odd=n.filter(x=>x%2).length;
 const bands=[[1,10],[11,20],[21,30],[31,40],[41,45]].map(([a,b])=>n.filter(x=>x>=a&&x<=b).length);
 let runs=0;for(let k=1;k<6;k++)if(n[k]==n[k-1]+1)runs++;const rep=p?n.filter(x=>p.n.includes(x)):[];
 const empty=['1번대','10번대','20번대','30번대','40번대'].filter((_,k)=>!bands[k]);
 return `<div class="crumb">${A('lotto','','로또')} › ${d.r}회</div><h1 class="h1">로또 ${d.r}회 당첨번호</h1><p class="note">${ymd(d.date)} 추첨</p>${balls(d)}
 <h2>1등 당첨금</h2><div class="panel kv"><span>1등 총 당첨금</span><b>${d.total}</b><span>1등 당첨자</span><b>${d.win}명${d.auto!=null?` (자동 ${d.auto} · 수동 ${d.man}${d.semi?` · 반자동 ${d.semi}`:''})`:''}</b><span>1인당</span><b>${d.per}원</b>${d.sales?`<span>총 판매금액</span><b>${fmtEok(d.sales)}원</b>`:''}</div>
 <h2>번호 분석</h2><div class="panel kv"><span>번호 합계</span><b>${sum}</b><span>홀 : 짝</span><b>${odd} : ${6-odd}</b><span>연속 번호</span><b>${runs}쌍</b><span>구간 분포</span><b>${bands.join(' · ')}</b><span>직전 회차와 겹친 수</span><b>${rep.length?rep.join(', '):'없음'}</b></div>
 <div class="art" style="margin-top:12px"><p>${d.r}회 당첨번호의 합은 ${sum}이고, 홀수 ${odd}개와 짝수 ${6-odd}개가 나왔어요. ${runs?`연속 번호가 ${runs}쌍 들어 있어요. `:''}${empty.length?`${empty.join(', ')} 번호는 하나도 나오지 않았어요. `:''}${p?`직전 ${p.r}회와 ${rep.length?rep.join(', ')+'번이 겹쳤어요':'겹치는 번호가 없었어요'}.`:''}</p></div>
 ${PL.latest&&d.r==PL.latest.r?`<h2>1등 판매점 <small>1등 ${PL.latest.games}건</small></h2>${PL.latest.rows.map(s=>`<div class="it"><span class="nm">${s[0]}${s[3]>1?` ×${s[3]}`:''}</span><span class="ad one">${s[1]}</span><span class="tag ${s[2]=='수동'?'m':s[2]=='반자동'?'s':''}">${s[2]}</span></div>`).join('')}`:''}
 <a class="ext" href="https://www.dhlottery.co.kr/lt645/result" target="_blank" rel="noopener">동행복권 공식 결과 확인하기 ↗</a>
 <div class="pn">${p?A('draw'+p.r,'',`‹ ${p.r}회`):'<span></span>'}${i>0?A('draw'+DRAWS[i-1].r,'',`${DRAWS[i-1].r}회 ›`):''}</div>${foot}`}
const PAGES={about:['소개',`<p>받는돈(getdon24.com)은 세금과 공제를 떼고 실제로 손에 들어오는 돈을 계산해 주는 한국어 사이트예요. 월급, 프리랜서 3.3%, 퇴직금, 주휴수당처럼 "얼마를 받게 되지?"가 궁금한 분이 숫자만 넣고 바로 확인할 수 있게 만들었어요.</p><h3>무엇을 제공하나요</h3><ul><li>계산기: 연봉 실수령액, 4대보험, 퇴직금, 연차수당, 주휴수당, 3.3% 계산, 종합소득세 환급, 인건비, 최저임금, 일용직 세금, 카드 수수료, 쪼개기 고용, 로또·연금복권 세금</li><li>정보 게시판: 계산기에 넣은 숫자가 어디서 나오는지, 어떤 점을 조심해야 하는지 풀어 쓴 글</li><li>로또 6/45·연금복권720+ 당첨 결과와 당첨금 실수령액 계산</li></ul><h3>글과 계산기를 만드는 방식</h3><p>글은 AI 도구의 도움을 받아 쓰고 있어요. 글에 나오는 계산 예시는 사이트 계산기로 다시 계산해 숫자를 맞춰요. 법령·세율·보험료율은 공식 자료나 이를 인용한 자료로 확인한 내용만 담고, 확실하지 않은 부분은 "확인 필요"라고 적어요. 계산에 쓴 기준은 <a href="/method/">계산 기준과 출처</a>에서 볼 수 있어요.</p><h3>정정 요청</h3><p>잘못된 숫자나 설명을 발견하면 <a href="/contact/">문의</a>로 알려 주세요. 확인한 뒤 고치고, 글 아래에 확인한 날짜를 남겨요.</p><h3>공식 기관과의 관계</h3><p>받는돈은 국세청, 국민연금공단, 국민건강보험공단, 고용노동부, 동행복권과 관계없는 개인 운영 정보 사이트예요. 복권을 팔거나 당첨금을 지급하지 않아요. 로또와 연금복권 번호·당첨금은 동행복권이 공개한 자료를 받아 보여 드리고, 통계와 번호 뽑기는 재미로 보는 정보예요.</p><h3>광고</h3><p>지금 이 사이트에는 광고가 없어요. 앞으로 광고를 달게 되면 본문과 구분해서 표시하고, <a href="/privacy/">개인정보처리방침</a>에 먼저 알릴게요.</p>`],
contact:['문의',`<p>잘못된 계산이나 설명, 추가했으면 하는 계산기, 제휴·기타 문의는 메일로 보내 주세요.</p><p><b style="user-select:all">${CFG.email||''}</b></p><p class="note">메일 주소를 길게 눌러 복사할 수 있어요.</p><h3>정정 요청은 이렇게 보내 주세요</h3><ul><li>문제가 있는 페이지 주소</li><li>어느 부분이 어떻게 다른지, 알고 계신 근거(공식 안내 페이지 등)</li></ul><p>확인한 결과 잘못이 맞으면 계산기나 글을 고치고 확인한 날짜를 남겨요. 모든 문의에 답장을 약속하지는 못하지만 내용은 꼼꼼히 읽어요.</p><h3>세금·노무 상담은 하지 않아요</h3><p>개인별 세금 신고, 노무 분쟁은 국세청 국세상담센터(126), 고용노동부 1350 상담센터처럼 공식 상담 창구나 전문가에게 문의해 주세요.</p>`],
privacy:['개인정보처리방침',`<p>받는돈(getdon24.com, 이하 "사이트")은 회원가입이 없고, 이름·연락처 같은 개인정보를 직접 받지 않아요. 아래는 2026년 10월 24일 현재 사이트에서 실제로 일어나는 일이에요.</p><h3>입력한 숫자</h3><p>계산기에 넣은 연봉, 시급 같은 숫자는 이용자의 브라우저 안에서만 계산돼요. 서버로 보내거나 저장하지 않아요.</p><h3>자동으로 처리되는 정보</h3><p>사이트는 Cloudflare Pages로 제공돼요. 페이지를 불러올 때 Cloudflare 서버가 접속 IP 주소, 브라우저 종류 같은 일반적인 접속 기록을 처리할 수 있어요. 운영자는 이 기록으로 개인을 식별하려 하지 않아요. 화면 글꼴은 jsDelivr(CDN)에서 불러오기 때문에 이때도 접속 정보가 jsDelivr로 전달될 수 있어요.</p><h3>쿠키</h3><p>사이트는 스스로 쿠키를 만들지 않아요. 현재는 광고나 방문 분석 도구도 쓰지 않아요.</p><h3>문의 메일</h3><p>문의 주소(${CFG.email||''})로 온 메일은 Cloudflare 이메일 전달 기능을 거쳐 운영자의 메일함으로 전달돼요. 보내 주신 이름, 메일 주소, 내용은 문의에 답하고 정정하는 데에만 쓰고, 처리에 필요한 동안만 보관해요.</p><h3>앞으로 광고·분석 도구를 쓰게 되면</h3><p>Google 애드센스나 방문 분석 도구를 도입하면 이 방침을 먼저 고치고 알려요. Google을 포함한 제3자 광고 사업자는 쿠키로 이용자의 이전 방문 기록을 바탕으로 광고를 보여 줄 수 있어요. 맞춤 광고는 <a href="https://adssettings.google.com" target="_blank" rel="noopener">Google 광고 설정</a>에서 끌 수 있고, Google이 광고 파트너 사이트의 정보를 쓰는 방법은 <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener">Google 안내</a>에서 볼 수 있어요. 동의가 필요한 지역의 이용자에게는 동의 절차를 먼저 적용해요.</p><h3>이용자의 권리</h3><p>사이트가 가진 개인정보(문의 메일 등)의 열람·삭제를 원하면 문의 메일로 요청해 주세요.</p><h3>아동</h3><p>사이트는 만 14세 미만 아동을 대상으로 하지 않아요.</p><h3>시행일</h3><p>2026년 10월 24일</p>`],
terms:['이용약관·면책',`<p>이 약관은 받는돈(getdon24.com, 이하 "사이트") 이용에 적용돼요. 사이트를 이용하면 아래 내용에 동의한 것으로 봐요.</p><h3>서비스</h3><p>사이트는 계산기와 정보글을 무료로 제공해요. 회원가입이나 결제는 없어요.</p><h3>계산 결과는 참고용이에요</h3><p>계산기와 글의 숫자는 공개된 요율·공식으로 계산한 추정치예요. 회사의 급여 규정, 공제 항목, 개인 사정, 법령 개정에 따라 실제 금액은 달라져요. 세금 신고나 계약처럼 중요한 결정은 국세청, 4대보험 공단, 고용노동부의 공식 안내나 전문가의 확인을 거쳐 주세요.</p><h3>책임의 한계</h3><p>운영자는 정확한 정보를 위해 노력하지만 모든 내용이 항상 최신이거나 정확하다고 보증하지 않아요. 사이트 정보를 따라 내린 결정의 결과에 대해서는 법이 허용하는 범위에서 책임지지 않아요.</p><h3>복권 정보</h3><p>사이트는 복권을 팔거나 당첨금을 지급하지 않아요. 당첨 번호와 당첨금은 동행복권 공식 발표가 기준이에요. 복권은 만 19세 이상만 살 수 있고, 도박 문제는 1336(24시간)에서 상담할 수 있어요.</p><h3>저작권</h3><p>사이트의 글과 화면의 저작권은 운영자에게 있어요. 출처를 밝힌 짧은 인용은 괜찮지만, 글 전체를 그대로 옮겨 게시하는 것은 허락 없이 할 수 없어요.</p><h3>외부 링크</h3><p>사이트에는 공식 기관 등 외부 사이트로 가는 링크가 있어요. 외부 사이트의 내용은 운영자가 관리하지 않아요.</p><h3>정정과 약관 변경</h3><p>잘못된 내용은 <a href="/contact/">문의</a>로 알려 주세요. 약관을 바꾸면 이 페이지에 날짜와 함께 반영해요.</p><h3>시행일</h3><p>2026년 10월 24일</p>`],
method:['계산 기준과 출처',`<p>받는돈 계산기가 쓰는 요율과 공식이에요. 2026년 10월 24일 기준으로 정리했고, 값이 바뀌면 계산기와 이 페이지를 함께 고쳐요.</p><h3>4대보험 근로자 부담 (2026년)</h3><div class="kv"><span>국민연금</span><b>${RATES.pension}% (노사 합계 9.5%)</b><span>건강보험</span><b>${RATES.health}% (노사 합계 7.19%)</b><span>장기요양보험</span><b>건강보험료의 ${RATES.ltc}% (노사 절반씩)</b><span>고용보험</span><b>${RATES.employment}% (실업급여분)</b></div><p class="note" style="margin-top:8px">출처: 국민연금공단, 국민건강보험공단, 고용노동부 안내를 정리한 자료로 확인했어요. 국민연금은 기준소득월액 상한·하한이 있어 월급이 아주 높거나 낮으면 달라져요.</p><h3>연봉 실수령액</h3><p>월급 = 연봉 ÷ 12에서 비과세액(식대 등)을 뺀 금액에 위 요율을 곱해 보험료를 구해요. 소득세는 국세청 근로소득 간이세액표를 그대로 쓰지 않고, 월급 구간별 비율과 부양가족 수로 단순하게 추정해요. 그래서 실제 급여명세서와 몇 만 원 차이가 날 수 있어요.</p><h3>3.3% 계산</h3><p>사업소득 원천징수는 소득세 3%(소득세법 제129조)와 그 10%인 지방소득세 0.3%(지방세법 제103조의13)를 합친 3.3%예요. 계산기는 두 세금 모두 10원 미만을 버리고, 소득세가 1,000원 미만이면 떼지 않는 소액부징수를 반영해요. 다만 지급 유형에 따라 소액부징수 적용이 다를 수 있다는 설명이 있어, 아주 적은 금액은 지급처에 확인해 주세요.</p><h3>일용직 근로소득세</h3><p>하루 급여에서 15만원을 빼고, 남은 금액에 6%를 곱한 뒤 55%를 세액공제하고, 지방소득세 10%를 더해요.</p><h3>종합소득세 환급 예측</h3><p>원천징수로 낸 3.3%와, 업종별 경비율·기본공제·누진세율표로 추정한 세액을 비교해요. 경비율은 예시값이라 홈택스의 본인 업종 경비율과 다를 수 있어요.</p><h3>최저임금과 주휴수당</h3><p>2026년 적용 최저임금은 시간급 10,320원이에요(고용노동부 고시, 2026년 1월 1일~12월 31일 적용). 주 40시간 근무(월 209시간, 주휴 포함)로 환산하면 월 2,156,880원이에요. 주휴수당은 주 소정근로시간이 15시간 이상일 때 하루 평균 근무시간(최대 8시간) 분의 시급을 더해 계산해요. 2027년 적용 금액은 해가 바뀌는 시점에 맞춰 반영할 계획이에요.</p><h3>로또·연금복권 세금</h3><p>복권 당첨금은 200만원 이하이면 세금이 없고, 3억원까지는 소득세 20%+지방소득세 2%=22%, 3억원을 넘는 부분은 33%예요. 연금복권은 매달 받는 금액에서 22%를 떼요.</p><h3>공식 자료 바로가기</h3><ul><li><a href="https://www.law.go.kr" target="_blank" rel="noopener">국가법령정보센터</a></li><li><a href="https://www.hometax.go.kr" target="_blank" rel="noopener">국세청 홈택스</a></li><li><a href="https://www.nps.or.kr" target="_blank" rel="noopener">국민연금공단</a></li><li><a href="https://www.nhis.or.kr" target="_blank" rel="noopener">국민건강보험공단</a></li><li><a href="https://www.moel.go.kr" target="_blank" rel="noopener">고용노동부</a></li><li><a href="https://www.minimumwage.go.kr" target="_blank" rel="noopener">최저임금위원회</a></li><li><a href="https://www.dhlottery.co.kr" target="_blank" rel="noopener">동행복권</a></li></ul><h3>한계</h3><p>이 계산기들은 일반적인 경우를 가정한 추정치예요. 회사별 공제 항목, 개인별 공제·감면, 법 개정은 반영되지 않을 수 있어요. 틀린 부분을 발견하면 <a href="/contact/">문의</a>로 알려 주세요.</p>`]};

let allN=30,penN=30;
function allDraws(){return `<div class="crumb">${A('lotto','','로또')} › 전체 회차</div><h1 class="h1">로또 전체 회차 당첨번호</h1><p class="note">1회부터 ${DRAWS.length}회까지</p>${DRAWS.slice(0,allN).map(d=>A('draw'+d.r,'gcard',`<div><b>${d.r}회 <small>${ymd(d.date)}</small></b><div class="balls" style="justify-content:flex-start;margin:6px 0 0;gap:3px">${d.n.map(n=>ball(n,'sm')).join('')}<span class="plus">+</span>${ball(d.b,'sm')}</div></div><span>›</span>`)).join('')}${allN<DRAWS.length?`<button class="btn ghost" style="width:100%;margin-top:10px" onclick="allN+=50;render()">50회 더 보기</button>`:''}${foot}`}
function penAll(){return `<div class="crumb">${A('pension','','연금복권')} › 전체 회차</div><h1 class="h1">연금복권720+ 전체 회차 당첨번호</h1><p class="note">1회부터 ${PEN.length}회까지 · 1등 번호와 보너스 번호</p>${PEN.slice(0,penN).map(p=>`<div class="pen"><span><strong>${p[0]}회</strong><small>${p[4]}</small></span><b>${p[2]}</b></div>`).join('')}${penN<PEN.length?`<button class="btn ghost" style="width:100%;margin-top:10px" onclick="penN+=50;render()">50회 더 보기</button>`:''}<a class="ext" href="https://www.dhlottery.co.kr/pt720/result" target="_blank" rel="noopener">동행복권 공식 결과 확인하기 ↗</a>${foot}`}
let lottoF='win',calcG='all',boardQ='';const CV={};
const GL={all:'전체',employee:'직장인',freelance:'프리랜서·N잡',employer:'사업주',lotto:'복권'};
const LCALC=[{id:'lotto-tax',label:'로또 세금 계산기',title:'로또 세금 계산기',group:'lotto'},{id:'pension-tax',label:'연금복권 세금 계산기',title:'연금복권 세금 계산기',group:'lotto'}];
const CARD_TIER=[['연매출 3억 이하 (영세)',0.40,0.15],['3억~5억 (중소1)',1.00,0.75],['5억~10억 (중소2)',1.15,0.90],['10억~30억 (중소3)',1.45,1.15],['30억 초과 (일반, 평균 예시)',2.00,1.50]];
calcs.push({id:'card-fee',label:'카드 수수료 계산기',title:'카드 수수료 계산기',group:'employer',
 disclaimerExtra:'카드 수수료율은 금융위원회가 정한 우대수수료율 기준이고, 30억 초과 일반가맹점은 카드사별로 달라 평균 예시값을 썼어요. 입금은 보통 결제 후 2~3영업일 뒤에 들어와요.',
 fields:[{id:'amount',label:'손님이 카드로 결제한 금액 (부가세 포함)',unit:'원',placeholder:'예: 25000'},
  {id:'tier',label:'우리 가게 연매출',type:'select',options:CARD_TIER.map((t,i)=>({value:i,label:`${t[0]} · 신용 ${t[1]}% / 체크 ${t[2]}%`}))},
  {id:'card',label:'카드 종류',type:'select',options:[{value:0,label:'신용카드'},{value:1,label:'체크카드'}]},
  {id:'biz',label:'사업자 유형',type:'select',options:[{value:0,label:'개인 일반과세자'},{value:1,label:'법인사업자'}]}],
 run(v){const a=+v.amount||0,t=CARD_TIER[+v.tier||0],rate=+v.card?t[2]:t[1],fee=Math.round(a*rate/100),dep=a-fee,
  supply=Math.round(a/1.1),vat=a-supply,credit=+v.biz?0:Math.floor(a*0.013),keep=dep-vat+credit;
  return{main:won(dep)+' 통장 입금',sub:[['결제 금액',won(a)],[`카드 수수료 (${rate}%)`,'− '+won(fee)],['통장에 들어오는 돈',won(dep)],
   ['나중에 낼 부가세 (결제액의 1/11)','− '+won(vat)],[+v.biz?'카드매출 세액공제 (법인은 없음)':'카드매출 세액공제 (1.3%)','+ '+won(credit)],['세금까지 빼고 실제로 남는 돈',won(keep)],
   ['통장에 들어온 돈 중 부가세는 1월·7월 신고 때 내야 해요. 미리 따로 떼어 두면 편해요.','']],related:RELATED['card-fee']}}});
CALC_FAQ['card-fee']=[{q:'통장에 들어올 때 부가세도 빠지나요?',a:'아니요. 카드사는 수수료만 빼고 보내요. 결제 금액에 들어 있는 부가세(1/11)는 나중에 부가세 신고 때 사업자가 직접 내요.'},{q:'카드매출 세액공제는 누구나 받나요?',a:'직전 연도 공급가액 10억원 이하 개인사업자가 받아요. 연간 한도가 있고 법인은 받을 수 없어요.'},{q:'간이과세자는 어떻게 되나요?',a:'간이과세자는 업종별 부가가치율을 적용해 부가세가 훨씬 적어요. 이 계산기는 일반과세자 기준이라 부가세가 실제보다 크게 나와요.'}];
LEGAL_BASIS['card-fee']='여신전문금융업법에 따른 영세·중소가맹점 우대수수료율과 부가가치세법(세율 10%), 신용카드 등 매출세액공제(부가가치세법 제46조)를 기준으로 한 추정치예요.';
calcs.push({id:'split-14h',label:'쪼개기 고용 계산기',title:'쪼개기 고용 계산기',group:'employer',
 disclaimerExtra:'한 달은 4.345주로 계산했어요. 4대보험은 월 60시간 이상이면 가입 대상으로 보고 사업주 부담분(산재 1.0% 예시 포함)을 넣었어요. 실제 가입 여부와 요율은 근로조건에 따라 달라요.',
 fields:[{id:'wage',label:'시급',unit:'원',placeholder:'예: '+RATES.minimumWage},{id:'need',label:'가게에 필요한 주간 총 근무시간',unit:'시간',placeholder:'예: 30'},{id:'split',label:'쪼갤 때 1명당 주 근무시간',unit:'시간',placeholder:'예: 14'}],
 run(v){const w=+v.wage||0,need=+v.need||0,sp=Math.min(+v.split||14,14.99),W=4.345;
  const cost=h=>{const base=h*W*w,ju=h>=15?Math.min(h,40)/40*8*W*w:0,pay=base+ju,ins=h*W>=60?pensionBase(pay)*RATES.pension/100+pay*RATES.health/100*(1+RATES.ltc/100)+pay*(RATES.employment+0.25+1.0)/100:0,sev=h>=15?pay/12:0;return{base,ju,pay,ins,sev,tot:pay+ins+sev}};
  if(!need||!w)return{main:'시급과 근무시간을 넣어 주세요',sub:[]};
  const one=cost(need),n=Math.ceil(need/sp),last=need-sp*(n-1),parts=[...Array(n-1).fill(sp),last],cs=parts.map(cost),tot=cs.reduce((a,c)=>a+c.tot,0),diff=one.tot-tot;
  return{main:diff>0?`1명 고용이 월 ${won(diff)} 더 나가요`:`쪼개도 월 ${won(-diff)} 더 나가요`,sub:[
   [`A. 1명이 주 ${need}시간 근무`,null],['기본급 (시급 × 시간 × 4.345주)',won(one.base)],[`주휴수당 (${need>=15?'주 15시간 이상 → 지급':'15시간 미만 → 없음'})`,won(one.ju)],['4대보험 사업주 부담',won(one.ins)],['퇴직금 적립 (월급의 1/12)',won(one.sev)],['A. 월 총 인건비',won(one.tot)],['A. 실제 시간당 비용',won(one.tot/(need*W))],
   [`B. ${n}명이 주 ${parts.map(x=>+x.toFixed(1)).join('·')}시간씩 근무`,null],['기본급 합계',won(cs.reduce((a,c)=>a+c.base,0))],['주휴수당','0원'],['4대보험 사업주 부담',won(cs.reduce((a,c)=>a+c.ins,0))],['퇴직금 적립','0원'],['B. 월 총 인건비',won(tot)],['B. 실제 시간당 비용',won(tot/(need*W))],
   ['1년으로 보면 차이',won(Math.abs(diff)*12)],
   ['주 15시간 이상 일하면 주휴수당, 연차, 퇴직금(1년 이상 근무 시)이 생겨요. 쪼개면 아끼는 대신 사람을 더 뽑고 관리해야 해요.',''],
   ['계약은 14시간이어도 실제로 4주 평균 15시간 이상 일했다면 주휴수당을 줘야 해요.','']],related:RELATED['split-14h']}}});
CALC_FAQ['split-14h']=[{q:'주 14시간으로 계약하면 불법인가요?',a:'계약 자체는 불법이 아니에요. 다만 실제 근무가 4주 평균 주 15시간 이상이면 주휴수당, 연차, 퇴직금 지급 의무가 생겨요. 연장근무가 잦으면 결국 15시간을 넘기 쉬워요.'},{q:'시간당 실제 인건비는 얼마인가요?',a:'주 15시간 이상이면 주휴수당이 붙어 시급의 약 1.2배가 실제 시간당 비용이에요. 여기에 4대보험과 퇴직금 적립까지 더하면 더 올라가요.'}];
CALC_FAQ['weekly-rest'].push({q:'주 14시간 근무면 주휴수당이 없나요?',a:'네, 4주 평균 주 15시간 미만이면 주휴수당이 없어요. 15시간 근무와 14시간 쪼개기의 인건비 차이는 주 14시간 쪼개기 비교 계산기에서 볼 수 있어요.'});
LEGAL_BASIS['split-14h']='근로기준법 제18조 제3항에 따라 4주 평균 1주 소정근로시간이 15시간 미만인 초단시간근로자에게는 주휴일(제55조)과 연차(제60조)가 적용되지 않고, 근로자퇴직급여 보장법 제4조에 따라 퇴직급여도 적용되지 않아요.';
CALC_FAQ.freelance=(CALC_FAQ.freelance||[]).concat([{q:'왜 0.967로 나누나요?',a:'3.3%를 떼고 받으면 세전 금액의 96.7%가 들어와요. 그래서 받은 금액을 0.967로 나누면 세전 금액이 나와요.'},{q:'원 단위가 조금 안 맞아요',a:'세금은 10원 미만을 버리고 떼기 때문에 몇 원 차이가 날 수 있어요. 지급명세서나 홈택스의 지급 내역이 가장 정확해요.'}]);
CALC_FAQ.freelance.push({q:'소액부징수란 무엇인가요?',a:'원천징수할 소득세가 1,000원 미만이면 세금을 떼지 않는 제도예요. 3.3%에서는 소득세 3%가 1,000원 미만인 33,333원 이하를 받을 때 세금이 0원이에요. 그 외에는 소득세와 지방소득세 모두 10원 미만을 버리고 떼요.'});
CALC_FAQ['lotto-tax']=[{q:'3억이 넘으면 전부 33%인가요?',a:'아니요. 3억원까지는 22%, 3억원을 넘는 부분에만 33%가 붙어요.'},{q:'다른 소득과 합쳐서 신고해야 하나요?',a:'복권 당첨금은 분리과세라 지급할 때 세금을 떼면 끝나요. 따로 신고하지 않아요.'}];
LEGAL_BASIS['lotto-tax']='소득세법에 따라 복권 당첨금은 기타소득으로 분리과세돼요. 3억원까지 20%, 초과분 30%의 소득세에 지방소득세 10%가 더해지고, 200만원 이하는 과세하지 않아요.';
CALC_FAQ['pension-tax']=[{q:'1등이면 2등도 같이 받나요?',a:'같은 번호를 1~5조 모두 샀다면 나머지 4장은 2등이 돼요. 계산기의 1등+2등 4장을 눌러 보세요.'},{q:'매달 세금을 떼나요?',a:'네, 매달 지급할 때 22%를 떼고 들어와요.'}];
LEGAL_BASIS['pension-tax']='연금복권 당첨금도 기타소득으로 분리과세돼요. 매달 지급액에 소득세 20%와 지방소득세 2%를 합친 22%를 원천징수해요.';
const ALLC=()=>calcs.concat(LCALC),VIS=()=>ALLC().filter(c=>!c.hidden);
function openCalc(id){go('c-'+id)}
function home(){const M=[['calc','계산기',`${VIS().length}종`,'연봉 실수령액, 퇴직금, 주휴수당, 3.3% 역산까지'],['lotto','로또',`${DRAWS[0].r}회`,'당첨번호, 1등 지역·명당, 실수령액'],['pension','연금복권',`${PEN[0][0]}회`,'당첨번호, 1등+2등 동시 당첨 실수령액'],['guide','게시판',`글 ${allPosts().length}개`,'급여·세금·복권 정보글']];
 return `<section class="intro"><h1 class="hero-h1">세금 떼고<br><span>진짜 받는 돈</span>을 계산해요</h1><p>월급부터 퇴직금, 프리랜서 3.3%, 로또와 연금복권 당첨금까지. 세전 금액만 넣으면 통장에 들어올 금액을 바로 보여 드려요.</p></section>
 <div class="menu2">${M.map(m=>A(m[0],'',`<span class="mt"><b>${m[1]}</b><small>${m[2]}</small></span><span class="md">${m[3]}</span>`)).join('')}</div>${foot}`}
function calcList(){const list=VIS().filter(c=>calcG=='all'||c.group==calcG);
 return `<h1 class="h1">실수령액 계산기 모음</h1><p class="note">${VIS().length}종 · 숫자만 넣으면 바로 계산돼요</p><div class="chips">${Object.keys(GL).map(k=>`<button class="${k==calcG?'on':''}" onclick="calcG='${k}';render()">${GL[k]}</button>`).join('')}</div>
 ${list.map(c=>A('c-'+c.id,'gcard lg',`<div><b class="one">${c.label}</b></div><span>›</span>`)).join('')}${foot}`}
const ex=f=>f.type=='seg'?f.options[0].value:f.type=='select'?'0':((f.placeholder||'').match(/[\d.]+/)||[''])[0];
const LEAD={salary:'연봉만 넣으면 4대보험과 세금을 뗀 월급이 나와요',
 'salary-compare':'두 회사 연봉을 넣고 실수령액 차이를 비교해요',insurance:'월급에서 빠지는 4대보험료를 항목별로 보여 드려요',
 severance:'최근 3개월 급여와 근속기간으로 퇴직금을 계산해요','annual-leave':'남은 연차를 돈으로 바꾸면 얼마인지 계산해요',
 'weekly-rest':'시급과 주당 근무시간으로 주휴수당을 계산해요',freelance:'프리랜서 원천징수 3.3%를 뗀 실제 수령액을 확인해 보세요.',
'tax-refund':'작년 소득으로 5월 환급액을 미리 가늠해 봐요',
 'labor-cost':'사업주가 내는 4대보험까지 더한 실제 인건비예요','minwage-check':'월급이나 시급이 최저임금을 지키는지 바로 확인해요',
 'daily-worker-tax':'일당과 근무일수로 일용직 세금과 실제 지급액을 계산해요','card-fee':'카드 결제액에서 수수료와 부가세를 뺀 남는 돈이에요',
 'split-14h':'주 15시간 1명과 14시간 여러 명의 인건비를 비교해요',
 'lotto-tax':'당첨금에서 세금을 뗀 실수령액을 계산해요','pension-tax':'연금복권720+ 당첨금에서 세금을 뗀 실수령액이에요'};
// 천 단위 쉼표: CV 에는 쉼표 없는 숫자만 저장하고 화면에만 쉼표를 붙인다
const fmtN=x=>{const [i,...d]=String(x).replace(/[^\d.]/g,'').split('.');return i.replace(/^0+(?=[0-9])/,'').replace(/\B(?=(\d{3})+(?!\d))/g,',')+(d.length?'.'+d.join(''):'')};
function nIn(el,id,fid){const raw=el.value.replace(/[^\d.]/g,''),left=el.value.slice(0,el.selectionStart).replace(/[^\d.]/g,'').length,f=fmtN(raw);el.value=f;
 let n=0,p=0;while(p<f.length&&n<left){if(/[\d.]/.test(f[p]))n++;p++}try{el.setSelectionRange(p,p)}catch(e){}
 CV[id][fid]=raw;runC(id)}
const fieldHtml=(id,f,big)=>f.type=='seg'?`<div class="seg mseg" role="group" aria-label="${f.label}">${f.options.map(o=>`<button type="button" class="${CV[id][f.id]==o.value?'on':''}" onclick="CV['${id}']['${f.id}']='${o.value}';render()">${o.label}</button>`).join('')}</div>`:`<label class="fl2" for="f-${f.id}">${f.label}</label>`+(f.type=='select'?`<select id="f-${f.id}" onchange="CV['${id}']['${f.id}']=this.value;runC('${id}')">${f.options.map(o=>`<option value="${o.value}" ${String(o.value)==String(CV[id][f.id])?'selected':''}>${o.label}</option>`).join('')}</select>`:`<div class="inw"><input id="f-${f.id}" inputmode="decimal" autocomplete="off" value="${fmtN(CV[id][f.id])}" oninput="nIn(this,'${id}','${f.id}')">${f.unit?`<span class="un">${f.unit}</span>`:''}</div>`)+(f.hint?`<p class="note">${f.hint}</p>`:'');
const rwH=(a,b)=>`<div class="rw"><span>${a}</span><b>${b}</b></div>`;
function resHtml(id){const c=calcs.find(x=>x.id==id),v=CV[id];
 if(c.dual){const a=wht33(+v.contract||0),b=rev33(+v.net||0),
  card=(r,l,m)=>rwH('기본세율(3%)',won(r.it))+rwH('지방소득세율(0.3%)',won(r.lt))+'<hr class="cdiv">'+rwH('총 3.3% 금액',won(r.it+r.lt))+`<div class="rbig"><span>${l}</span><b>${won(m)}</b></div>`;
  return{contract:card(a,'실제 수령액',a.net),net:card(b,'계약 금액',b.g)}}
 let r;try{r=c.run(v)}catch(e){return '<p class="note">숫자를 확인해 주세요.</p>'}
 return (r.sub||[]).map(([a,b])=>b===null?`<b class="rh">${a}</b>`:b===''?`<p class="note">${a}</p>`:rwH(a,b)).join('')+(c.disclaimerExtra?`<p class="note">${c.disclaimerExtra}</p>`:'')+`<div class="rbig${/^✅/.test(r.main)?' ok':''}"><b>${r.main}</b></div>`}
function relHtml(id){const c=calcs.find(x=>x.id==id);let r;try{r=c.run(CV[id])}catch(e){return ''}
 const l=(r.related||[]).filter(s=>ARTICLES[s]);return l.length?`<p class="note" style="margin-top:14px">관련 글</p>`+l.map(s=>A('b-'+s,'rl one',`${ARTICLES[s].title} ›`)).join(''):''}
function calcView(id){const L=LCALC.find(x=>x.id==id);if(L){const faq=(CALC_FAQ[id]||[]).map(q=>`<details><summary>${q.q}</summary><p>${q.a}</p></details>`).join('');
 return `<div class="crumb">${A('calc','','계산기')} › 복권</div><h1 class="h1">${L.title}</h1><div class="panel">${id=='lotto-tax'?taxPanel():penCalc()}</div><details class="dt"><summary>법적 근거·이용 안내</summary><p>${LEGAL_BASIS[id]}</p></details><h2>자주 묻는 질문</h2><div>${faq}</div>${foot}`}
 const c=calcs.find(x=>x.id==id);if(!c)return calcList();CV[id]=CV[id]||{};c.fields.forEach(f=>{if(CV[id][f.id]==null)CV[id][f.id]=ex(f)});
 const faq=(CALC_FAQ[id]||[]).map(q=>`<details><summary>${q.q}</summary><p>${q.a}</p></details>`).join('');
 const head=`<div class="crumb">${A('calc','','계산기')} › ${GL[c.group]}</div><header class="chead"><h1>${c.title}</h1><p>${LEAD[id]||'숫자만 넣으면 바로 계산돼요'}</p></header>`;
 let body;
 if(c.dual){const R=resHtml(id),LB={contract:'<b class="hl">계약 금액</b> 기준',net:'<b class="hl">실제 수령액</b> 기준'},
  card=k=>`<section class="ccard"><div class="crow"><label class="ct" for="f-${k}">${LB[k]}</label><div class="inw"><input id="f-${k}" inputmode="decimal" autocomplete="off" value="${fmtN(CV[id][k])}" onfocus="this.select()" oninput="nIn(this,'${id}','${k}')"><span class="un">원</span></div></div><div id="dres-${k}">${R[k]}</div></section>`;
  body=`<div class="dual">${['contract','net'].map(card).join('')}</div>`}
 else body=`<section class="ccard">${c.fields.filter(f=>!f.when||f.when==CV[id].mode).map(f=>fieldHtml(id,f)).join('')}<div id="cres">${resHtml(id)}</div></section>`;
 const info=`<details class="info"><summary>자세히 알아보기</summary><div id="crel">${relHtml(id)}</div>${LEGAL_BASIS[id]?`<h3>법적 근거·이용 안내</h3><p>${LEGAL_BASIS[id]}</p>`:''}${faq?`<h3>자주 묻는 질문</h3>${faq}`:''}</details>`;
 return `<div class="calc">${head}${body}${info}</div>${foot}`}
function runC(id){const c=calcs.find(x=>x.id==id);if(!c)return;const set=(i,h)=>{const e=document.getElementById(i);if(e)e.innerHTML=h};
 if(c.dual){const R=resHtml(id);set('dres-contract',R.contract);set('dres-net',R.net)}else set('cres',resHtml(id));set('crel',relHtml(id))}
const pd=s=>ymd(ARTICLES[s].date);
function allPosts(){return POSTS.map(p=>({id:'b-'+p.slug,t:p.title,c:p.cat,d:ymd(p.date),e:p.excerpt})).sort((a,b)=>b.d.localeCompare(a.d))}
const postRow=p=>A(p.id,'gcard',`<div><b class="one">${p.t}</b><small class="one">${p.c} · ${p.d}</small></div><span>›</span>`);
function guide(){const all=allPosts(),cats=['전체',...new Set(all.map(p=>p.c))];
 return `<h1 class="h1">정보 게시판</h1><p class="note">급여·세금·복권 정보글 ${all.length}개</p><input id="bq" placeholder="글 제목 검색" value="${boardQ}" oninput="boardQ=this.value;document.getElementById('bl').innerHTML=bl()" style="margin:10px 0" aria-label="글 제목 검색"><div class="chips">${cats.map(c=>`<button class="${c==boardF?'on':''}" onclick="boardF='${c}';render()">${c}</button>`).join('')}</div><div id="bl">${bl()}</div>${foot}`}
function bl(){const l=allPosts().filter(p=>(boardF=='전체'||p.c==boardF)&&(!boardQ||p.t.includes(boardQ)));return l.length?l.map(postRow).join(''):'<p class="note">찾는 글이 없어요.</p>'}
function bpost(s){const a=ARTICLES[s];if(!a)return guide();const c=ALLC().find(x=>x.id==a.calc);
 return `<div class="crumb">${A('guide','','게시판')} › ${a.cat}</div><h1 class="h1">${a.title}</h1><p class="note">${pd(s)} · ${a.cat} · ${a.min}분</p><article class="art" style="margin-top:12px">${(typeof window!='undefined'&&window.__POSTHTML)||''}</article>${c?A('c-'+c.id,'btn cta',`${c.title} 바로 쓰기 ›`):''}${foot}`}
function lotto(){const seg=`<div class="chips" style="margin-top:12px">${[['win','당첨번호'],['place','지역·명당'],['gen','번호뽑기']].map(([k,l])=>`<button class="${k==lottoF?'on':''}" onclick="lottoF='${k}';render()">${l}</button>`).join('')}</div>`;
 return seg+(lottoF=='place'?place():lottoF=='gen'?gen():lottoWin())}
function tabOf(c){if(PAGES[c])return '';if(c.startsWith('c-'))return 'calc';if(c.startsWith('draw')||c=='all')return 'lotto';if(c=='penall')return 'pension';if(c.startsWith('g-')||c.startsWith('b-'))return 'guide';return c}

function tabsHtml(){return TABS.map(([k,i,l])=>`<a href="${pathOf(k)}" class="${k==tabOf(cur)?'on':''}"><i>${i}</i>${l}</a>`).join('')}
function view(){return cur.startsWith('c-')?calcView(cur.slice(2)):cur.startsWith('b-')?bpost(cur.slice(2)):cur=='all'?allDraws():cur=='penall'?penAll():cur.startsWith('draw')?draw(+cur.slice(4)):PAGES[cur]?`<h1 class="h1">${PAGES[cur][0]}</h1><div class="art">${PAGES[cur][1]}</div>`+foot:({home,calc:calcList,lotto,guide,pension}[cur]||home)()}
function render(){document.getElementById('tabs').innerHTML=tabsHtml();
 const v=view();if(!(cur.startsWith('b-')&&window.__PRE))document.getElementById('app').innerHTML=v;if(cur.startsWith('c-'))runC(cur.slice(2));tick()}
function nextAt(dow,h,m){const now=new Date,k=new Date(now.getTime()+(now.getTimezoneOffset()+540)*6e4),t=new Date(k);t.setDate(k.getDate()+((dow-k.getDay()+7)%7));t.setHours(h,m,0,0);if(t<k)t.setDate(t.getDate()+7);const s=Math.floor((t-k)/1e3),p=x=>String(x).padStart(2,'0');return `${Math.floor(s/86400)}일 ${p(Math.floor(s%86400/3600))}:${p(Math.floor(s%3600/60))}:${p(s%60)}`}
function tick(){const lt=nextAt(6,20,35),pt=nextAt(4,19,5),set=(i,v)=>{const e=document.getElementById(i);if(e)e.textContent=v};set('cd',lt);set('cdp',pt);const t=tabOf(cur);set('hsub',t=='lotto'?'로또 추첨 '+lt:t=='pension'?'연금복권 추첨 '+pt:'')}
if(!window.__PRERENDER){setInterval(tick,1000);render()}
