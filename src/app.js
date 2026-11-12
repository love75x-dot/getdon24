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
  // 국세청 근로소득 간이세액표(2026.3.1. 시행) 그대로 찾기. pay=비과세 뺀 월급(원), fam=공제대상가족(본인 포함), kids=8~20세 자녀 수
  function ntsTax(pay, fam, kids){
    const T=(typeof window!=='undefined'&&window.DATA&&window.DATA.wtax)||null;
    if(!T) return estimateMonthlyIncomeTax(pay,fam);
    fam=Math.max(1,Math.round(+fam||1)); kids=Math.max(0,Math.min(Math.round(+kids||0),fam-1));
    const col=(f)=>{
      const k=pay/1000;
      if(k<T.rows[0][0]) return 0;
      if(k<10000){ const r=T.rows.find(r=>k>=r[0]&&k<r[1]); return r?r[1+f]:0; }
      const b=T.over.find(o=>k>o[0]&&(o[1]==null||k<=o[1]))||T.over[0];
      if(k===10000) return T.at10000[f-1];
      return Math.floor((T.at10000[f-1]+b[2]+(pay-b[0]*1000)*b[3]+b[4])/10)*10;
    };
    let t = fam<=11 ? col(fam) : col(11)-(col(10)-col(11))*(fam-11);
    const kd = kids<=0?0 : kids===1?T.kids[0] : T.kids[1]+(kids-2)*T.kids[2];
    return Math.max(0,t-kd);
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
    salary: '근로기준법 제43조(임금 지급), 국민연금법·국민건강보험법·고용보험법에 따라 4대보험료와 근로소득세가 원천공제됩니다. 소득세는 국세청 근로소득 간이세액표(소득세법 시행령 별표2, 2026.3.1. 시행)를 그대로 적용합니다.',
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
      fields:[{id:'annual',label:'연봉(세전, 세금·보험 떼기 전 총액)',unit:'만원',placeholder:'예: 4000'},{id:'nonTaxable',label:'비과세액(식대 등, 월)',unit:'만원',placeholder:'예: 20'},{id:'dependents',label:'부양가족 수(본인 포함)',unit:'명',placeholder:'예: 1'},{id:'kids',label:'8~20세 자녀 수',unit:'명',placeholder:'예: 0',hint:'부양가족 수에 들어간 자녀 중 8세 이상 20세 이하인 자녀예요. 연 소득이 100만원을 넘는 자녀는 빼요.'}],
      run(v){
        const annual=(+v.annual||0)*10000, monthlyGross=annual/12, nonTax=(+v.nonTaxable||0)*10000;
        const taxableMonthly=Math.max(monthlyGross-nonTax,0);
        const pBase=pensionBase(taxableMonthly), pension=pBase*(RATES.pension/100);
        const health=taxableMonthly*(RATES.health/100), ltc=health*(RATES.ltc/100), employment=taxableMonthly*(RATES.employment/100);
        const incomeTax=ntsTax(taxableMonthly,+v.dependents||1,+v.kids||0), localTax=Math.floor(incomeTax*0.1/10)*10;
        const netMonthly=monthlyGross-(pension+health+ltc+employment+incomeTax+localTax);
        return { main: won(netMonthly)+' / 월',
          sub:[['세전 연봉(입력값)',won(annual)],['세전 월급여(연봉÷12)',won(monthlyGross)],[`국민연금(${RATES.pension}%)`,won(pension)],[`건강보험(${RATES.health}%)`,won(health)],['장기요양보험',won(ltc)],[`고용보험(${RATES.employment}%)`,won(employment)],['소득세(국세청 간이세액표)',won(incomeTax)],['지방소득세(소득세의 10%)',won(localTax)],['월 실수령액',won(netMonthly)],['연 실수령액(세후, 월×12 근사치)',won(netMonthly*12)]],
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
          const incomeTax=ntsTax(taxableMonthly,+v.dependents||1,0), localTax=Math.floor(incomeTax*0.1/10)*10;
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
      disclaimerExtra:'1년 이상 일하고 주 15시간 이상 근무했을 때 받아요. 평균임금이 통상임금보다 적으면 통상임금으로 계산해요.',
      fields:[
        {id:'start',type:'date',label:'입사일',def:'2022-03-02'},
        {id:'end',type:'date',label:'퇴직일',def:'2026-11-01',hint:'퇴직일은 마지막 근무일의 다음 날이에요.'},
        {id:'mode',type:'seg',label:'평균임금',options:[{value:'calc',label:'평균임금 계산'},{value:'direct',label:'평균임금 직접 입력'}]},
        {id:'pay3',when:'calc',label:'퇴직 전 3개월 급여 총액',unit:'원',placeholder:'예: 9000000',hint:'기본급과 매달 받는 수당, 연장수당을 모두 더한 세전 금액이에요.'},
        {id:'bonus',when:'calc',label:'1년 상여금 총액',unit:'원',placeholder:'예: 0',hint:'퇴직 전 1년 동안 받은 상여금이에요. 3/12만큼 더해요.'},
        {id:'leave',when:'calc',label:'1년 연차수당',unit:'원',placeholder:'예: 0',hint:'퇴직 전 1년 동안 받은 연차수당이에요. 3/12만큼 더해요.'},
        {id:'daily',when:'direct',label:'1일 평균임금',unit:'원',placeholder:'예: 100000'}
      ],
      run(v){
        if(v.recent3!=null&&!v.start){ // 예전 방식 (퇴사 합계 계산기에서 사용)
          const total3=(+v.recent3||0)*10000, days3_=+v.recentDays||90, years=+v.years||0, months=+v.months||0;
          const avgDaily=total3/days3_, yrs=years+months/12;
          return { main: won(avgDaily*30*yrs), sub:[['1일 평균임금',won(avgDaily)],['근속기간',`${years}년 ${months}개월`]], related: RELATED.severance };}
        const toD=x=>{const m=String(x||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?Date.UTC(+m[1],+m[2]-1,+m[3]):null};
        const a=toD(v.start),b=toD(v.end);if(a==null||b==null||b<=a)return{main:'입사일과 퇴직일을 확인해 주세요',sub:[],related:[]};
        const svc=Math.round((b-a)/864e5),D=days3(v.end);
        const parts=v.mode==='direct'?null:{pay:+v.pay3||0,bon:(+v.bonus||0)*3/12,lv:(+v.leave||0)*3/12};
        const daily=parts?(parts.pay+parts.bon+parts.lv)/D:(+v.daily||0);
        if(!daily)return{main:'급여를 넣어 주세요',sub:[],related:[]};
        const y=Math.floor(svc/365),mo=Math.floor((svc%365)/30.4);
        const rows=[['근속기간',`${svc.toLocaleString()}일 (약 ${y}년 ${mo}개월)`]];
        if(parts){rows.push(['3개월 급여',won(parts.pay)]);if(parts.bon)rows.push(['상여금 × 3/12',won(parts.bon)]);if(parts.lv)rows.push(['연차수당 × 3/12',won(parts.lv)]);rows.push([`1일 평균임금 (÷ ${D}일)`,won(daily)])}
        else rows.push(['1일 평균임금',won(daily)]);
        if(svc<365)return{main:'퇴직금 0원 (1년 미만)',sub:rows,related:RELATED.severance};
        const sev=daily*30*svc/365;rows.push(['계산',`${won(daily)} × 30일 × ${svc}일 ÷ 365`]);
        return { main:`퇴직금 ${won(sev)}`, sub:rows, related: RELATED.severance };
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
      fields:[{id:'hourly',label:'시급',unit:'원',placeholder:'예: '+RATES.minimumWage},{id:'weeklyHours',label:'주당 근무시간',unit:'시간',placeholder:'예: 20'}],
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
const TABS=[['home','⌂','홈'],['calc','≡','계산기'],['find','◎','받을돈 찾기'],['lotto','●','복권'],['guide','✎','정보']];
const col=n=>n<=10?'y':n<=20?'b':n<=30?'r':n<=40?'g':'n';
const ball=(n,s='')=>`<span class="ball ${col(n)} ${s}">${n}</span>`;
const balls=(d,s='')=>`<div class="balls">${d.n.map(n=>ball(n,s)).join('')}<span class="plus">+</span>${ball(d.b,s)}</div>`;
function pathOf(t){if(t=='home')return '/';if(t=='calc')return '/calc/salary/';if(t.startsWith('c-'))return '/calc/'+t.slice(2)+'/';if(t=='lotto')return '/lotto/';if(t=='all')return '/lotto/all/';if(t.startsWith('draw'))return '/lotto/'+t.slice(4)+'/';if(t=='pension')return '/pension/';if(t=='penall')return '/pension/all/';if(t=='guide')return '/blog/';if(t.startsWith('b-'))return '/blog/'+t.slice(2)+'/';if(t.startsWith('l-'))return '/life/'+t.slice(2)+'/';return '/'+t+'/'}
function routeOf(p){const s=(p||'/').replace(/index\.html$/,'').split('/').filter(Boolean);if(!s.length)return 'home';const a=s[0],b=s[1];if(a=='calc')return b?'c-'+b:'calc';if(a=='lotto')return b=='all'?'all':b?'draw'+b:'lotto';if(a=='pension')return b=='all'?'penall':'pension';if(a=='blog')return b?'b-'+decodeURIComponent(b):'guide';if(a=='life')return b?'l-'+b:'life';return a}
let cur=(typeof window!='undefined'&&window.__ROUTE)||routeOf(typeof location!='undefined'?location.pathname:'/'),pick=new Set,placeF='region',gens=[];
function go(t){location.href=pathOf(t)}
const LOTNOTE=`<div class="lotnote"><div>로또·연금복권 정보는 동행복권 공식 발표 자료 기준이에요.</div><div>만 19세 이상 구매 가능 · 도박 문제 상담 <b>1336</b> (24시간)</div><div>통계와 번호 뽑기는 재미로 보는 정보예요. 당첨 확률을 바꾸지 않아요.</div></div>`;
const A=(t,cls,inner)=>`<a href="${pathOf(t)}"${cls?` class="${cls}"`:''}>${inner}</a>`;
const foot=`<div class="ad-slot" id="ad-foot"></div><footer><div>계산 결과는 참고용 추정치예요. 정확한 금액은 해당 기관에서 확인하세요.</div><nav class="fl">${A('about','','소개')}${A('method','','계산 기준')}${A('contact','','문의')}${A('terms','','이용약관')}${A('privacy','','개인정보처리방침')}</nav><div>© ${new Date().getFullYear()} 받는돈 getdon24.com</div></footer>`;

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
 return lotSwitch('pension')+`<section class="hero"><div class="t">제 ${p[0]}회 연금복권720+ <span>${p[1]}</span></div><div class="balls"><span class="ball jo">${jo}<small>조</small></span>${num.split('').map((c,k)=>`<span class="ball ${['r','y','b','g','pu','n'][k]}">${c}</span>`).join('')}</div><div class="meta" style="margin-top:12px">1등 월 700만원 × 20년 · 매주 목요일 19:05 추첨</div><div class="cdw">다음 추첨까지 <span class="cd" id="cdp"></span></div></section>
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
method:['계산 기준과 출처',`<p>받는돈 계산기가 쓰는 요율과 공식이에요. 2026년 10월 24일 기준으로 정리했고, 값이 바뀌면 계산기와 이 페이지를 함께 고쳐요.</p><h3>4대보험 근로자 부담 (2026년)</h3><div class="kv"><span>국민연금</span><b>${RATES.pension}% (노사 합계 9.5%)</b><span>건강보험</span><b>${RATES.health}% (노사 합계 7.19%)</b><span>장기요양보험</span><b>건강보험료의 ${RATES.ltc}% (노사 절반씩)</b><span>고용보험</span><b>${RATES.employment}% (실업급여분)</b></div><p class="note" style="margin-top:8px">출처: 국민연금공단, 국민건강보험공단, 고용노동부 안내를 정리한 자료로 확인했어요. 국민연금은 기준소득월액 상한·하한이 있어 월급이 아주 높거나 낮으면 달라져요.</p><h3>연봉 실수령액</h3><p>월급 = 연봉 ÷ 12에서 비과세액(식대 등)을 뺀 금액에 위 요율을 곱해 보험료를 구해요. 소득세는 국세청 홈택스에서 받은 근로소득 간이세액표(2026년 3월 1일 시행판)를 그대로 찾아 써요. 월급 1,000만원이 넘으면 표에 적힌 계산식을 쓰고, 8~20세 자녀 수만큼 정해진 금액(1명 20,830원, 2명 45,830원, 3명부터 1명당 33,330원 추가)을 빼요. 회사가 80%·120% 원천징수를 고른 경우는 달라질 수 있어요.</p><h3>3.3% 계산</h3><p>사업소득 원천징수는 소득세 3%(소득세법 제129조)와 그 10%인 지방소득세 0.3%(지방세법 제103조의13)를 합친 3.3%예요. 계산기는 두 세금 모두 10원 미만을 버리고, 소득세가 1,000원 미만이면 떼지 않는 소액부징수를 반영해요. 다만 지급 유형에 따라 소액부징수 적용이 다를 수 있다는 설명이 있어, 아주 적은 금액은 지급처에 확인해 주세요.</p><h3>일용직 근로소득세</h3><p>하루 급여에서 15만원을 빼고, 남은 금액에 6%를 곱한 뒤 55%를 세액공제하고, 지방소득세 10%를 더해요.</p><h3>종합소득세 환급 예측</h3><p>원천징수로 낸 3.3%와, 업종별 경비율·기본공제·누진세율표로 추정한 세액을 비교해요. 경비율은 예시값이라 홈택스의 본인 업종 경비율과 다를 수 있어요.</p><h3>최저임금과 주휴수당</h3><p>2026년 적용 최저임금은 시간급 10,320원이에요(고용노동부 고시, 2026년 1월 1일~12월 31일 적용). 주 40시간 근무(월 209시간, 주휴 포함)로 환산하면 월 2,156,880원이에요. 주휴수당은 주 소정근로시간이 15시간 이상일 때 하루 평균 근무시간(최대 8시간) 분의 시급을 더해 계산해요. 2027년 적용 금액은 해가 바뀌는 시점에 맞춰 반영할 계획이에요.</p><h3>로또·연금복권 세금</h3><p>복권 당첨금은 200만원 이하이면 세금이 없고, 3억원까지는 소득세 20%+지방소득세 2%=22%, 3억원을 넘는 부분은 33%예요. 연금복권은 매달 받는 금액에서 22%를 떼요.</p><h3>공식 자료 바로가기</h3><ul><li><a href="https://www.law.go.kr" target="_blank" rel="noopener">국가법령정보센터</a></li><li><a href="https://www.hometax.go.kr" target="_blank" rel="noopener">국세청 홈택스</a></li><li><a href="https://www.nps.or.kr" target="_blank" rel="noopener">국민연금공단</a></li><li><a href="https://www.nhis.or.kr" target="_blank" rel="noopener">국민건강보험공단</a></li><li><a href="https://www.moel.go.kr" target="_blank" rel="noopener">고용노동부</a></li><li><a href="https://www.minimumwage.go.kr" target="_blank" rel="noopener">최저임금위원회</a></li><li><a href="https://www.dhlottery.co.kr" target="_blank" rel="noopener">동행복권</a></li></ul><h3>한계</h3><p>이 계산기들은 일반적인 경우를 가정한 추정치예요. 회사별 공제 항목, 개인별 공제·감면, 법 개정은 반영되지 않을 수 있어요. 틀린 부분을 발견하면 <a href="/contact/">문의</a>로 알려 주세요.</p>`]};

let allN=30,penN=30;
function allDraws(){return `<div class="crumb">${A('lotto','','로또')} › 전체 회차</div><h1 class="h1">로또 전체 회차 당첨번호</h1><p class="note">1회부터 ${DRAWS.length}회까지</p>${DRAWS.slice(0,allN).map(d=>A('draw'+d.r,'gcard',`<div><b>${d.r}회 <small>${ymd(d.date)}</small></b><div class="balls" style="justify-content:flex-start;margin:6px 0 0;gap:3px">${d.n.map(n=>ball(n,'sm')).join('')}<span class="plus">+</span>${ball(d.b,'sm')}</div></div><span>›</span>`)).join('')}${allN<DRAWS.length?`<button class="btn ghost" style="width:100%;margin-top:10px" onclick="allN+=50;render()">50회 더 보기</button>`:''}${foot}`}
function penAll(){return `<div class="crumb">${A('pension','','연금복권')} › 전체 회차</div><h1 class="h1">연금복권720+ 전체 회차 당첨번호</h1><p class="note">1회부터 ${PEN.length}회까지 · 1등 번호와 보너스 번호</p>${PEN.slice(0,penN).map(p=>`<div class="pen"><span><strong>${p[0]}회</strong><small>${p[4]}</small></span><b>${p[2]}</b></div>`).join('')}${penN<PEN.length?`<button class="btn ghost" style="width:100%;margin-top:10px" onclick="penN+=50;render()">50회 더 보기</button>`:''}<a class="ext" href="https://www.dhlottery.co.kr/pt720/result" target="_blank" rel="noopener">동행복권 공식 결과 확인하기 ↗</a>${foot}`}
let lottoF='win',calcG='all',boardQ='';const CV={};
const GL={all:'전체',employee:'직장인',freelance:'프리랜서·N잡',employer:'사업주',money:'재테크',lotto:'복권'};
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
// 관련 계산기 (계산기 화면 아래에 링크로 보여 줌)
const CALC_SRC={salary:()=>'소득세: 국세청 근로소득 간이세액표(2026.3.1. 시행) · 4대보험 2026년 요율','salary-compare':()=>'소득세: 국세청 간이세액표(2026.3.1. 시행)',unemployment:()=>`${UB.year}년 기준 · 고용노동부, 고용보험법`,overtime:()=>'근로기준법 제56조 기준',resign:()=>`실업급여 ${UB.year}년 기준 · 고용노동부`,'minwage-check':()=>`${RATES.minimumWageYear}년 최저시급 기준 · 고용노동부 고시`};
const CALC_REL={salary:['goal-100m','goal-50m','savings'],deposit:['savings','goal','compound'],savings:['deposit','goal-50m','goal-100m'],goal:['goal-50m','goal-100m','savings'],'goal-50m':['goal-100m','savings','salary'],'goal-100m':['goal-50m','savings','salary'],loan:['prepay-fee','goal'],'prepay-fee':['loan'],compound:['goal','deposit'],unemployment:['resign','severance','annual-leave'],overtime:['parttime','weekly-rest','minwage-check'],resign:['unemployment','severance','annual-leave'],severance:['resign','unemployment'],'annual-leave':['resign','overtime'],parttime:['overtime','weekly-rest','minwage-check'],'weekly-rest':['parttime','overtime'],'minwage-check':['parttime','overtime']};
// ---------- 1단계: 일하다 받는 돈 ----------
// 실업급여 기준 (출처·기준일 확인한 값만). 해가 바뀌면 새 연도 값을 확인해서 추가한다.
//  - 지급률 60%, 소정급여일수 표: 고용노동부 FAQ (2019.10.1. 이후 이직자 기준)
//  - 상한액 하루 68,100원: 고용노동부 2025-12-16 발표 (2026년)
//  - 하한액: 고용보험법 제46조 — 최저시급 × 80% × 1일 소정근로시간(8시간). 2026년 최저시급 10,320원으로 계산한 값
//    (공식 발표 금액은 아직 확인 못 함 → docs/benefits-todo.md)
const UB={year:2026,rate:0.6,cap:68100,minWage:10320,src:'고용노동부 (상한액 2025-12-16 발표, 받는 기간 표는 고용노동부 FAQ)'};
UB.floor=Math.floor(UB.minWage*0.8*8);
const UB_DAYS={u50:[120,150,180,210,240],o50:[120,180,210,240,270]};
const UB_SPAN=['1년 미만','1년~3년 미만','3년~5년 미만','5년~10년 미만','10년 이상'];
function ubCalc(dailyAvg,spanIdx,old){const raw=dailyAvg*UB.rate,day=Math.min(Math.max(raw,UB.floor),UB.cap),days=(old?UB_DAYS.o50:UB_DAYS.u50)[spanIdx]||120;
 return{raw,day,days,total:day*days,capped:raw>UB.cap,floored:raw<UB.floor}}
const yrIdx=y=>y<1?0:y<3?1:y<5?2:y<10?3:4;
const SRC_LINE=(t)=>`<p class="srcline">${t}</p>`;

// 평균임금: 퇴직 전 3개월 임금 총액 ÷ 그 기간 날수 (근로기준법 제2조). 상여금·연차수당은 지난 1년치 × 3/12
function days3(last){const m=String(last||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return 91;const e=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));const s=new Date(e);s.setUTCMonth(s.getUTCMonth()-3);return Math.round((e-s)/864e5)}
function avgWage(v){if(v.mode!=='item'){const D=days3(v.last),tot=(+v.monthly||0)*3;return{D,base:tot,fix:0,meal:0,mealOut:0,vary:0,bon:0,lv:0,tot,daily:tot/D,simple:1}}const D=days3(v.last),base=(+v.base||0)*3,fix=(+v.fixed||0)*3,meal=v.mealIn==='no'?0:(+v.meal||0)*3,vary=+v.vary||0,bon=(+v.bonus||0)*3/12,lv=(+v.leave||0)*3/12;
 const tot=base+fix+meal+vary+bon+lv;return{D,base,fix,meal,mealOut:v.mealIn==='no'?(+v.meal||0)*3:0,vary,bon,lv,tot,daily:tot/D}}
calcs.push({id:'unemployment',label:'실업급여 계산기',title:'실업급여 계산기',group:'employee',
 disclaimerExtra:'회사 사정으로 그만둔 경우에 받아요. 실제 금액은 회사가 내는 이직확인서의 평균임금으로 고용센터가 정해요.',
 fields:[{id:'mode',type:'seg',label:'입력 방식',options:[{value:'simple',label:'간단히'},{value:'item',label:'항목별로 자세히'}]},
  {id:'monthly',when:'simple',label:'퇴직 전 3개월 월평균 급여',unit:'원',placeholder:'예: 3000000',hint:'세전 금액이에요. 식대·상여금 처리까지 맞추려면 "항목별로 자세히"를 고르세요.'},
  {id:'base',when:'item',label:'월 기본급 (세전)',unit:'원',placeholder:'예: 2500000'},
  {id:'fixed',when:'item',label:'고정 수당 (월)',hint:'직책·자격·근속수당처럼 매달 같은 금액으로 받는 수당이에요.',unit:'원',placeholder:'예: 200000'},
  {id:'meal',when:'item',label:'월 식대',unit:'원',placeholder:'예: 200000'},
  {id:'mealIn',when:'item',type:'select',label:'식대 평균임금 포함',hint:'모두에게 매달 같은 금액을 주는 식대는 원칙적으로 포함돼요. 실비 정산·현물 제공이거나 이직확인서에서 빠졌다면 "빼기"를 고르세요.',options:[{value:'yes',label:'넣기'},{value:'no',label:'빼기'}]},
  {id:'vary',when:'item',label:'3개월 변동 수당 합계',unit:'원',placeholder:'예: 0',hint:'연장·야간수당처럼 달마다 다른 수당은 3개월치를 더해서 넣어요.'},
  {id:'bonus',when:'item',label:'1년 상여금 총액',unit:'원',placeholder:'예: 0',hint:'3/12만큼 평균임금에 더해요.'},
  {id:'leave',when:'item',label:'1년 연차수당',unit:'원',placeholder:'예: 0',hint:'퇴직 전 1년 동안 받은 연차수당이에요. 퇴사하면서 새로 받는 연차수당은 넣지 않아요.'},
  {id:'last',type:'date',label:'마지막 근무일',def:''},
  {id:'hours',type:'select',label:'하루 근로시간',hint:'하루 소정근로시간이에요. 하한액이 이 시간에 맞춰 줄어요.',options:[8,7,6,5,4,3].map(h=>({value:String(h),label:h===8?'8시간 (보통 전일제)':h+'시간'}))},
  {id:'span',type:'select',label:'고용보험 가입 기간',hint:'여러 회사에서 가입한 기간을 모두 합쳐요.',options:UB_SPAN.map((l,i)=>({value:String(i),label:l}))},
  {id:'age',type:'select',label:'퇴직 시 만나이',options:[{value:'u50',label:'50세 미만'},{value:'o50',label:'50세 이상·장애인'}]}],
 run(v){if(v.mealIn==='0')v.mealIn='yes';const a=avgWage(v),span=+v.span||0,old=v.age==='o50',hrs=(+v.hours>0?+v.hours:8);
  if(!a.tot)return{main:'급여 항목을 넣어 주세요',sub:[],related:[]};
  const floor=Math.floor(UB.minWage*0.8*hrs),raw=a.daily*UB.rate,day=Math.min(Math.max(raw,floor),UB.cap),days=(old?UB_DAYS.o50:UB_DAYS.u50)[span]||120;
  const rows=[['평균임금 (3개월)',null],[a.simple?'월평균 급여 × 3':'기본급 × 3',won(a.base)]];
  if(a.fix)rows.push(['고정 수당 × 3',won(a.fix)]);if(a.meal)rows.push(['식대 × 3',won(a.meal)]);if(a.mealOut)rows.push(['식대 (뺐어요)','0원']);
  if(a.vary)rows.push(['연장·야간 등 수당',won(a.vary)]);if(a.bon)rows.push(['상여금 × 3/12',won(a.bon)]);if(a.lv)rows.push(['연차수당 × 3/12',won(a.lv)]);
  if(!a.simple)rows.push(['3개월 합계',won(a.tot)]);rows.push([`하루 평균임금 (÷ ${a.D}일)`,won(a.daily)],
   ['실업급여',null],['그 60%',won(raw)],[raw>UB.cap?'하루 받는 돈 (상한 적용)':raw<floor?`하루 받는 돈 (하한 적용, ${hrs}시간 기준)`:'하루 받는 돈',won(day)],
   ['받는 기간',`${days}일 (약 ${Math.round(days/30*10)/10}개월)`],['한 달(30일)에',won(day*30)]);
  if(!v.last)rows.push(['마지막 근무일을 넣으면 3개월 날수가 정확해져요 (지금은 91일).','']);
  return{main:`실업급여 총 ${won(day*days)}`,sub:rows,related:[]}}});
CALC_FAQ['unemployment']=[{q:'스스로 그만두면 못 받나요?',a:'원칙적으로는 못 받아요. 다만 임금 체불, 회사 이전으로 통근이 어려워진 경우 등 법에서 정한 사유가 있으면 받을 수 있어요. 받을 수 있는지는 고용센터에서 정해요.'},{q:'식대는 평균임금에 들어가나요?',a:'회사가 모든 직원에게 매달 같은 금액을 주는 식대는 일한 대가로 보고 원칙적으로 포함돼요. 실제 쓴 만큼 정산하거나 밥으로 주는 경우는 빠져요. 회사가 낸 이직확인서에 식대가 빠져 있다면 계산기에서 "빼기"를 골라 맞춰 보세요.'},{q:'상여금과 연차수당은 어떻게 넣나요?',a:'퇴직 전 1년 동안 받은 금액의 3/12을 3개월 임금에 더해요. 퇴사하면서 처음 생긴 미사용 연차수당은 넣지 않아요.'},{q:'받는 기간은 어떻게 정해지나요?',a:'퇴직할 때 나이(50세 이상·장애인 여부)와 고용보험에 가입한 기간을 합쳐 120일에서 270일 사이로 정해져요.'},{q:'언제, 어디서 신청하나요?',a:'퇴사 후 고용24(work24.go.kr)에서 구직 신청과 수급자격 교육을 마치고 가까운 고용센터에 신청해요. 퇴사 다음 날부터 12개월이 지나면 남은 기간이 있어도 받을 수 없으니 빨리 신청하세요.'}];
LEGAL_BASIS['unemployment']='평균임금은 근로기준법 제2조(퇴직 전 3개월 임금 총액 ÷ 그 기간 날수)로 계산하고, 상여금·연차수당은 지난 1년치의 3/12을 더해요. 고용보험법 제45조(평균임금의 60%), 제46조(상한·하한), 제50조와 별표1(소정급여일수)을 기준으로 해요. 상한액 하루 68,100원은 고용노동부 2025년 12월 16일 발표(2026년 적용), 하한액은 2026년 최저시급 10,320원 × 80% × 하루 소정근로시간으로 계산했어요.';

calcs.push({id:'overtime',label:'연장·야간·휴일수당 계산기',title:'연장·야간·휴일수당 계산기',group:'employee',
 disclaimerExtra:'야간 시간은 연장·휴일과 겹쳐도 따로 넣어요. 겹치면 가산이 함께 붙어요.',
 fields:[{id:'wage',label:'통상시급',unit:'원',placeholder:'예: '+RATES.minimumWage,hint:'월급제라면 기본급과 고정수당 합계 ÷ 209'},
  {id:'ot',label:'연장근로 시간 (8시간·주 40시간 초과분)',unit:'시간',placeholder:'예: 10'},
  {id:'night',label:'야간근로 시간 (밤 10시~아침 6시)',unit:'시간',placeholder:'예: 4'},
  {id:'hol',label:'휴일근로 시간 (하루 기준)',unit:'시간',placeholder:'예: 0'},
  {id:'size',type:'select',label:'사업장 직원 수',options:[{value:'5up',label:'5명 이상'},{value:'u5',label:'5명 미만 (가산 없음)'}]}],
 run(v){if(v.size==='0')v.size='5up';const w=+v.wage||0,ot=+v.ot||0,nt=+v.night||0,hl=+v.hol||0,big=v.size!=='u5';if(!w)return{main:'통상시급을 넣어 주세요',sub:[],related:[]};
  const h8=Math.min(hl,8),hx=Math.max(hl-8,0);
  const base=(ot+hl)*w,pOt=big?ot*w*0.5:0,pNt=big?nt*w*0.5:0,pH=big?h8*w*0.5+hx*w*1.0:0,tot=base+pOt+pNt+pH;
  const rows=[['기본 시급분',won(base)]];
  if(big){if(ot)rows.push([`연장 가산 ${ot}시간`,won(pOt)]);if(nt)rows.push([`야간 가산 ${nt}시간`,won(pNt)]);if(h8)rows.push([`휴일 가산 ${h8}시간 (0.5배)`,won(h8*w*0.5)]);if(hx)rows.push([`휴일 8시간 초과 ${hx}시간 (1배)`,won(hx*w)])}
  else rows.push(['5명 미만 사업장은 연장·야간·휴일 가산(0.5배)이 의무가 아니에요.','']);
  return{main:`수당 합계 ${won(tot)}`,sub:rows,related:RELATED['weekly-rest']||[]}}});
CALC_FAQ['overtime']=[{q:'연장과 야간이 겹치면 어떻게 되나요?',a:'둘 다 붙어요. 예를 들어 밤 11시에 연장근로를 하면 시급 × 1배(기본) + 0.5배(연장) + 0.5배(야간) = 2배를 받아요.'},{q:'휴일에 8시간 넘게 일하면요?',a:'8시간까지는 시급의 1.5배, 8시간을 넘긴 부분은 2배예요.'},{q:'5명 미만 가게는요?',a:'근로기준법의 연장·야간·휴일 가산 규정이 적용되지 않아서 일한 시간만큼 시급(1배)만 받아도 법 위반은 아니에요. 회사 규정이나 근로계약에 가산이 있으면 그에 따라요.'}];
LEGAL_BASIS['overtime']='근로기준법 제56조: 연장근로는 통상임금의 50% 이상, 야간근로(오후 10시~오전 6시)는 50% 이상, 휴일근로는 8시간 이내 50%·8시간 초과 100%를 더해 줘야 해요. 상시 5명 미만 사업장에는 이 조항이 적용되지 않아요(근로기준법 시행령 별표1).';

calcs.push({id:'resign',label:'퇴사하면 받을 돈',title:'퇴사하면 받을 돈 계산기',group:'employee',
 disclaimerExtra:'퇴직금은 1년 이상·주 15시간 이상 일했을 때 받아요. 실업급여는 이 회사 근속기간만 가입 기간으로 계산했어요.',
 fields:[{id:'recent3',label:'최근 3개월 총급여 (세전, 상여금 제외)',unit:'만원',placeholder:'예: 900'},
  {id:'years',label:'근속연수',unit:'년',placeholder:'예: 3'},{id:'months',label:'근속개월 (나머지 개월 수)',unit:'개월',placeholder:'예: 6'},
  {id:'unusedDays',label:'남은 연차',unit:'일',placeholder:'예: 5'},
  {id:'age',type:'select',label:'퇴직할 때 나이',options:[{value:'u50',label:'50세 미만'},{value:'o50',label:'50세 이상 또는 장애인'}]},
  {id:'ub',type:'select',label:'실업급여',options:[{value:'yes',label:'포함 (회사 사정으로 그만둠)'},{value:'no',label:'빼고 보기 (스스로 그만둠)'}]}],
 run(v){if(v.ub==='0')v.ub='yes';const sv=calcs.find(c=>c.id=='severance'),al=calcs.find(c=>c.id=='annual-leave');
  const num=x=>parseInt(String(x).replace(/[^\d]/g,''))||0,yrs=(+v.years||0)+(+v.months||0)/12;
  if(!(+v.recent3))return{main:'최근 3개월 급여를 넣어 주세요',sub:[],related:[]};
  // 기존 계산기 코드를 그대로 불러온다 (결과가 항상 같게)
  const sev=yrs>=1?num(sv.run({recent3:v.recent3,recentDays:'90',years:v.years,months:v.months}).main):0;
  const monthly=(+v.recent3)*10000/3,hourly=Math.round(monthly/209);
  const leave=num(al.run({hourlyWage:String(hourly),unusedDays:v.unusedDays||'0'}).main);
  const u=v.ub!=='no'?ubCalc(monthly*12/365,yrIdx(yrs),v.age==='o50'):null;
  const tot=sev+leave+(u?u.total:0);
  return{main:`합계 ${won(tot)}`,sub:[['퇴직금',yrs>=1?won(sev):'0원 (1년 미만)'],[`연차수당 ${+v.unusedDays||0}일`,won(leave)],
   ...(u?[[`실업급여 ${u.days}일`,won(u.total)]]:[['실업급여','제외']]),
   [`통상시급은 월급 ÷ 209 (약 ${won(hourly)})로 어림했어요.`,'']],related:RELATED.severance||[]}}});
CALC_FAQ['resign']=[{q:'퇴직금은 언제 받나요?',a:'퇴사한 날부터 14일 안에 받는 게 원칙이에요. 회사와 합의하면 늦출 수 있어요.'},{q:'남은 연차는 꼭 돈으로 받나요?',a:'퇴사로 쓰지 못한 연차는 수당으로 정산받는 게 원칙이에요. 연차수당 계산기에서 정확한 통상시급으로 다시 계산해 볼 수 있어요.'},{q:'세금은 빠졌나요?',a:'아니요. 세금을 떼기 전 금액이에요. 퇴직금에는 퇴직소득세, 연차수당에는 근로소득세가 붙을 수 있어요.'}];
LEGAL_BASIS['resign']='퇴직금은 근로자퇴직급여 보장법 제8조, 연차수당은 근로기준법 제60조, 실업급여는 고용보험법 제45조·제46조·제50조를 기준으로 기존 퇴직금·연차수당·실업급여 계산기와 같은 방식으로 계산해요.';

// 시급 ↔ 일급·주급·월급·연봉 환산 (주휴수당 포함). 월 시간 = (주 근무시간 + 주휴시간) × 365 ÷ 7 ÷ 12, 반올림 (주 40시간이면 209시간)
const WFROM=[['h','시급'],['d','일급'],['w','주급'],['m','월급'],['y','연봉']];
calcs.push({id:'wage',label:'시급 환산 계산기',title:'시급 환산 계산기',group:'employee',
 fields:[{id:'from',type:'select',label:'내가 아는 금액',options:WFROM.map(([v,l])=>({value:v,label:l}))},
  {id:'amt',label:'금액',unit:'원',placeholder:'예: '+RATES.minimumWage},
  {id:'dh',label:'하루 근무시간',unit:'시간',placeholder:'예: 8'},
  {id:'wd',label:'일주일 근무일',unit:'일',placeholder:'예: 5'}],
 run(v){const from=(v.from&&v.from!='0')?v.from:'h',a=+v.amt||0,dh=+v.dh||0,wd=Math.min(+v.wd||0,7);if(!a||!dh||!wd)return{main:'금액과 근무시간을 넣어 주세요',sub:[],related:[]};
  const wh=dh*wd,ju=wh>=15?Math.min(wh,40)/40*8:0,mh=Math.round((wh+ju)*365/7/12);
  const h=from=='h'?a:from=='d'?a/dh:from=='w'?a/(wh+ju):from=='m'?a/mh:a/12/mh;
  const min=RATES.minimumWage,rows=[['시급',won(h)],['일급 ('+dh+'시간)',won(h*dh)],['주급 (주휴 포함)',won(h*(wh+ju))],['월급 ('+mh+'시간)',won(h*mh)],['연봉',won(h*mh*12)],
   [ju?`주 ${wh}시간이라 주휴수당 ${Math.round(ju*10)/10}시간분이 포함돼요.`:`주 ${wh}시간이라 주휴수당이 없어요 (15시간 미만).`,''],
   [h+0.5<min?`⚠️ 시급이 ${RATES.minimumWageYear}년 최저시급 ${won(min)}보다 적어요.`:`${RATES.minimumWageYear}년 최저시급은 ${won(min)}이에요.`,'']];
  const tgt=from=='m'?['연봉',h*mh*12]:from=='h'?['월급',h*mh]:['시급',h];
  return{main:`${tgt[0]} ${won(tgt[1])}`,sub:rows,related:[]}}});
CALC_FAQ['wage']=[{q:'월 209시간은 어디서 나왔나요?',a:'주 40시간에 주휴시간 8시간을 더한 48시간에, 한 달 평균 주 수(365 ÷ 7 ÷ 12 ≈ 4.345주)를 곱한 값이에요. 48 × 4.345 ≈ 209시간.'},{q:'주휴수당은 언제 포함되나요?',a:'일주일에 일하기로 한 시간이 15시간 이상일 때 포함돼요. 주 40시간이면 8시간분, 그보다 짧으면 근무시간에 비례해서 줄어요.'}];
LEGAL_BASIS['wage']='주휴수당은 근로기준법 제55조, 주 15시간 미만 예외는 제18조 제3항을 따라요. 최저시급은 고용노동부 고시(2026년 10,320원) 기준이에요.';
// 알바 월급 계산기: 출퇴근·휴게시간·요일로 주급·월급, 주휴수당 성립 여부
const tmin=t=>{const m=String(t||'').match(/^(\d{1,2}):(\d{2})$/);return m?(+m[1])*60+(+m[2]):null};
function shiftMinutes(st,en,bs,be){let a=tmin(st),b=tmin(en);if(a==null||b==null)return null;if(b<=a)b+=1440;
 let br=0,x=tmin(bs),y=tmin(be);if(x!=null&&y!=null){if(x<a)x+=1440;if(y<=x)y+=1440;br=Math.max(0,Math.min(y,b)-Math.max(x,a))}
 // 야간(22:00~06:00) 근무 분: 휴게시간과 겹치는 부분은 뺀다
 let night=0;for(let m=a;m<b;m++){const h=m%1440;const inBreak=x!=null&&y!=null&&m>=x&&m<y;if(!inBreak&&(h>=1320||h<360))night++}
 return{work:b-a-br,brk:br,night}}
// 요일별 시간: custom 이 켜져 있으면 s{요일}/e{요일}/bs{요일}/be{요일}, 없으면 공통 시간
const dayT=(v,d,k)=>{const key={start:'s',end:'e',bstart:'bs',bend:'be'}[k]+d;return v.custom==='1'&&v[key]!=null?v[key]:v[k]};
function partTime(v){const mode=v.mode||'hour',days=String(v.days||'').split('').filter(d=>'1234567'.includes(d)),n=days.length;
 if(!n)return null;const per=[];
 for(const d of days){const sh=shiftMinutes(dayT(v,d,'start'),dayT(v,d,'end'),dayT(v,d,'bstart'),dayT(v,d,'bend'));if(!sh||sh.work<=0)return null;per.push({d,h:sh.work/60,brk:sh.brk/60,night:sh.night/60,st:dayT(v,d,'start'),en:dayT(v,d,'end')})}
 const wh=per.reduce((a,x)=>a+x.h,0),dh=wh/n,big=(v.size||'5up')==='5up';
 const base=mode==='day'?(+v.daily||0)*n:(+v.hourly||0)*wh,wage=mode==='day'?base/wh:(+v.hourly||0);
 const otH=big?Math.max(per.reduce((a,x)=>a+Math.max(x.h-8,0),0),Math.max(wh-40,0)):0,ot=otH*wage*0.5;
 const ntH=big?per.reduce((a,x)=>a+x.night,0):0,nt=ntH*wage*0.5;
 const juOk=wh>=15,ju=juOk?Math.min(wh,40)/40*8*wage:0;
 const week=base+ot+nt+ju,month=week*365/7/12,sameBrk=per.every(x=>x.brk===per[0].brk)?per[0].brk:null;
 const dedType=v.ded||'none';let ded=0,dedRows=[];
 if(dedType==='33'){const it=Math.floor(month*0.03/10)*10,lt=Math.floor(it*0.1/10)*10;ded=it+lt;dedRows=[['3.3% (소득세 3% + 지방세 0.3%)','− '+won(ded)]]}
 if(dedType==='ins'){const pen=pensionBase(month)*RATES.pension/100,hea=month*RATES.health/100,ltc=hea*RATES.ltc/100,emp=month*RATES.employment/100,itx=ntsTax(month,1,0),ltx=Math.floor(itx*0.1/10)*10;
  ded=pen+hea+ltc+emp+itx+ltx;dedRows=[['4대보험 + 소득세 (근로자 부담)','− '+won(ded)]]}
 return{n,dh,wh,per,custom:v.custom==='1',brk:sameBrk,wage,base,otH,ot,ntH,nt,juOk,ju,week,month,ded,dedRows,net:month-ded,big}}
const DAYN='월화수목금토일';
calcs.push({id:'parttime',label:'알바 월급 계산기',title:'알바 월급 계산기',group:'employee',
 disclaimerExtra:'한 달은 평균 4.345주로 계산했어요. 주휴수당은 그 주 출근하기로 한 날을 모두 나왔을 때 받아요. 4대보험 세금은 추정치예요.',
 fields:[
  {id:'mode',type:'seg',label:'어떻게 받나요?',options:[{value:'hour',label:'시급으로'},{value:'day',label:'일당으로'}]},
  {id:'hourly',when:'hour',label:'시급',unit:'원',placeholder:'예: '+RATES.minimumWage},
  {id:'daily',when:'day',label:'일당',unit:'원',placeholder:'예: 90000'},
  {id:'days',type:'days',label:'출근하는 요일',def:'12345'},
  {id:'start',type:'time',label:'출근',def:'11:00',half:1},{id:'end',type:'time',label:'퇴근',def:'21:00',half:1},
  {id:'bstart',type:'time',label:'휴게 시작',def:'15:30',half:1},{id:'bend',type:'time',label:'휴게 끝',def:'17:00',half:1},
  {id:'custom',type:'perday',label:'요일마다 시간이 달라요',def:'0'},
  {id:'size',type:'select',label:'가게 직원 수',options:[{value:'5up',label:'5명 이상'},{value:'u5',label:'5명 미만'}],hint:'5명 이상 가게만 연장·야간수당(1.5배)이 의무예요.'},
  {id:'ded',type:'select',label:'떼는 돈',options:[{value:'none',label:'안 뗌 (세전)'},{value:'33',label:'3.3%'},{value:'ins',label:'4대보험'}]}],
 run(v){if(v.size==='0')v.size='5up';if(v.ded==='0')v.ded='none';
  const r=partTime(v);if(!r)return{main:'출근 요일과 근무시간을 확인해 주세요',sub:[],related:[]};
  const h=x=>(Math.round(x*10)/10)+'시간',min=RATES.minimumWage,rows=[];
  rows.push(['근무시간',null]);
  if(r.custom)r.per.forEach(x=>rows.push([`${DAYN[x.d-1]} ${x.st}~${x.en}`+(x.brk?` (휴게 ${h(x.brk)})`:''),h(x.h)]));
  else rows.push(['하루 일하는 시간',r.brk?`${h(r.dh)} (휴게 ${h(r.brk)} 빼고)`:`${h(r.dh)} (휴게 없음)`]);
  rows.push(['일주일 일하는 시간',`${h(r.wh)} (주 ${r.n}일)`]);
  rows.push([r.juOk?`✅ 주휴수당 받아요 (주 15시간 이상)`:`❌ 주휴수당 없어요 (주 ${h(r.wh)}, 15시간 미만)`,'']);
  if(!r.juOk){const need=15-r.wh,dayAdd=r.wh+r.dh>=15&&r.n<7;rows.push([dayAdd?`비슷한 시간으로 하루 더 출근하면 주 ${h(r.wh+r.dh)}이 돼서 주휴수당이 생겨요.`:`주 ${h(need)} 더 일하면 주휴수당이 생겨요.`,''])}
  rows.push(['일주일에 받는 돈 (세전)',null],[v.mode==='day'?`일당 × ${r.n}일`:`시급 × ${h(r.wh)}`,won(r.base)]);
  if(r.ot)rows.push([`연장수당 (${h(r.otH)} × 0.5배)`,won(r.ot)]);
  if(r.nt)rows.push([`야간수당 (${h(r.ntH)} × 0.5배)`,won(r.nt)]);
  if(r.ju)rows.push([`주휴수당 (${h(Math.min(r.wh,40)/40*8)}분)`,won(r.ju)]);
  rows.push(['주급 합계',won(r.week)],['한 달에 받는 돈',null],['월급 (세전)',won(r.month)],...r.dedRows,['월급 (실수령)',won(r.net)]);
  const lack=r.per.filter(x=>(x.h+x.brk>=8&&x.brk<1)||(x.h+x.brk>=4&&x.brk<0.5));if(lack.length)rows.push([`${lack.map(x=>DAYN[x.d-1]).join('·')}요일은 쉬는 시간이 법정 기준보다 짧아요 (4시간에 30분, 8시간에 1시간 이상).`,'']);
  if(r.wage+0.5<min)rows.push([`⚠️ 시급으로 바꾸면 ${won(r.wage)}이라 최저시급(${won(min)})보다 적어요.`,'']);
  if(!r.big&&(Math.max(r.dh-8,0)>0))rows.push(['5명 미만 가게는 8시간을 넘겨도 연장수당(1.5배)이 의무가 아니에요.','']);
  return{main:`한 달 ${won(r.net)}`,sub:rows,related:RELATED['weekly-rest']||[]}}});
CALC_FAQ['parttime']=[{q:'주휴수당은 언제 받을 수 있나요?',a:'일주일에 일하기로 한 시간이 15시간 이상이고, 그 주에 출근하기로 한 날을 모두 나오면 받아요. 하루 일한 만큼(주 40시간 이상이면 8시간분)을 더 받아요.'},{q:'휴게시간은 돈을 받나요?',a:'아니요. 휴게시간은 일한 시간에서 빠져요. 4시간 일하면 30분, 8시간 일하면 1시간 이상 쉬는 시간을 줘야 해요.'},{q:'연장·야간수당은 누구나 받나요?',a:'직원이 5명 이상인 가게에서 하루 8시간 또는 주 40시간을 넘기거나, 밤 10시~아침 6시에 일하면 그 시간에 시급의 0.5배를 더 받아요. 5명 미만 가게는 의무가 아니에요.'},{q:'3.3%와 4대보험 중 뭐가 맞나요?',a:'원래 직원으로 일하면 4대보험 대상인 경우가 많아요. 3.3%는 프리랜서(사업소득)로 처리할 때 떼는 세금이에요. 내가 어떻게 처리되는지는 급여명세서에서 확인하세요.'}];
LEGAL_BASIS['parttime']='근로기준법 제55조(주휴일)와 제18조 제3항(주 15시간 미만 초단시간근로자 예외), 제54조(휴게: 4시간에 30분, 8시간에 1시간 이상), 제56조(연장·야간근로 50% 가산, 상시 5명 이상 사업장 적용)를 기준으로 계산해요.';
// 복리 계산기: 매달 계산, 적립은 매달 말에 넣는다고 가정
function compound(v){const P=+v.principal||0,M=+v.monthly||0,rate=(+v.rate||0)/100,Y=Math.min(Math.max(Math.round(+v.years||0),0),60),monthlyComp=(v.freq||'month')==='month',taxed=(v.tax||'normal')==='normal';
 let B=P,pending=0,simpleInt=0;const rows=[];
 for(let m=1;m<=Y*12;m++){const it=B*rate/12;if(monthlyComp)B+=it;else pending+=it;B+=M;if(!monthlyComp&&m%12===0){B+=pending;pending=0}
  if(m%12===0)rows.push([m/12,P+M*m,B])}
 simpleInt=P*rate*Y+M*rate/12*(Y*12)*(Y*12-1)/2; // 단리였다면 (적립금은 넣은 뒤 남은 달만큼)
 const paid=P+M*Y*12,interest=B-paid,tax=taxed?Math.floor(interest*0.154/10)*10:0;
 return{B,paid,interest,tax,net:B-tax,simpleInt,rows,Y}}
calcs.push({id:'compound',label:'복리 계산기',title:'복리 계산기',group:'money',
 disclaimerExtra:'이자율이 기간 내내 같다고 가정한 계산이에요. 예·적금 상품마다 이자 계산 방식과 세금 혜택이 다를 수 있어요.',
 fields:[{id:'principal',label:'처음에 넣는 돈',unit:'원',placeholder:'예: 10000000'},
  {id:'monthly',label:'매달 더 넣는 돈',unit:'원',placeholder:'예: 500000'},
  {id:'rate',label:'연 이자율 (수익률)',unit:'%',placeholder:'예: 4'},
  {id:'years',label:'기간',unit:'년',placeholder:'예: 10'},
  {id:'freq',type:'select',label:'이자 붙는 방식',options:[{value:'month',label:'월복리 (매달 이자에 이자)'},{value:'year',label:'연복리 (1년마다 이자에 이자)'}]},
  {id:'tax',type:'select',label:'이자 세금',options:[{value:'normal',label:'일반과세 15.4%'},{value:'free',label:'비과세 (ISA·비과세 상품 등)'}]}],
 run(v){if(v.freq==='0')v.freq='month';if(v.tax==='0')v.tax='normal';
  const r=compound(v);if(!r.Y)return{main:'기간을 1년 이상 넣어 주세요',sub:[],related:[]};
  const pick=new Set([1,3,5,...Array.from({length:12},(_,i)=>(i+1)*5),r.Y]),yr=r.rows.filter(x=>pick.has(x[0]));
  return{main:`${r.Y}년 뒤 ${won(r.net)}`,sub:[
   ['넣은 돈 합계',won(r.paid)],['붙은 이자 (세전)',won(r.interest)],[v.tax==='free'?'이자 세금 (비과세)':'이자 세금 15.4%','− '+won(r.tax)],['받는 이자 (세후)',won(r.interest-r.tax)],
   ['단리였다면 이자',won(r.simpleInt)],['복리로 더 붙은 이자',won(r.interest-r.simpleInt)],
   ['연도별 잔액 (세전)',null],...yr.map(([y,p,b])=>[`${y}년 뒤`,won(b)])],related:[]}}});
CALC_FAQ['compound']=[{q:'복리와 단리는 뭐가 다른가요?',a:'단리는 처음 넣은 돈에만 이자가 붙고, 복리는 붙은 이자에도 다시 이자가 붙어요. 기간이 길수록 차이가 커져요.'},{q:'월복리와 연복리 중 뭘 골라야 하나요?',a:'가입한 상품 설명서에 적힌 방식을 고르세요. 같은 이자율이면 월복리가 조금 더 많아요. 주식·펀드 수익률처럼 1년 기준 수익률이면 연복리가 더 가까워요.'},{q:'세금은 언제 떼나요?',a:'예·적금 이자는 받을 때 이자소득세 14%와 지방소득세 1.4%, 합계 15.4%를 떼요. 이 계산기는 만기에 한 번에 뗀다고 보고 계산해요.'}];
LEGAL_BASIS['compound']='예·적금 이자는 소득세법에 따른 이자소득으로, 지급할 때 소득세 14%와 지방소득세 1.4%(합계 15.4%)가 원천징수돼요. 비과세 종합저축, ISA 등은 조건에 따라 세금이 줄거나 없어요.';
// ── 금융 계산기 (예금·적금·모으기·대출·중도상환수수료) ──
// 이자 세금: 이자소득세 14%(10원 미만 버림) + 지방소득세(그 10%, 10원 미만 버림)
function intTax(i,kind){if(kind=='free'||i<=0)return{it:0,lt:0,t:0};const it=Math.floor(i*0.14/10)*10,lt=Math.floor(it*0.1/10)*10;return{it,lt,t:it+lt}}
const nMon=v=>{const n=+v.n||0;return Math.max(0,Math.round(v.pu=='m'?n:n*12))};
const PU={id:'pu',type:'seg',label:'기간 단위',options:[{value:'y',label:'년'},{value:'m',label:'월'}]};
const NF=(lb)=>({id:'n',label:lb,unit:v=>v.pu=='m'?'개월':'년',placeholder:'예: 1'});
const RM={id:'how',type:'seg',label:'이자 방식',options:[{value:'s',label:'단리'},{value:'c',label:'월복리'}]};
const TX={id:'tax',type:'seg',label:'이자 세금',options:[{value:'normal',label:'일반과세 15.4%'},{value:'free',label:'비과세'}]};
function depInt(P,r,n,how){return how=='c'?P*(Math.pow(1+r/12,n)-1):P*r*n/12}
function savInt(M,r,n,how){const i=r/12;if(!i)return 0;return how=='c'?M*((1+i)*(Math.pow(1+i,n)-1)/i-n):M*i*n*(n+1)/2}
calcs.push({id:'deposit',label:'예금 이자 계산기',title:'예금 이자 계산기',group:'money',
 disclaimerExtra:'만기에 이자를 한 번에 받는다고 보고 계산했어요. 실제 이자는 은행의 일수 계산 방식에 따라 몇 원~몇백 원 다를 수 있어요.',
 fields:[{id:'p',label:'예치금액',unit:'원',placeholder:'예: 10000000'},PU,NF('예금기간'),{id:'rate',label:'연 이자율',unit:'%',placeholder:'예: 3'},RM,TX],
 run(v){const P=+v.p||0,n=nMon(v),r=(+v.rate||0)/100;if(!P||!n)return{main:'예치금액과 기간을 넣어 주세요',sub:[]};
  const I=Math.floor(depInt(P,r,n,v.how)),T=intTax(I,v.tax);
  return{main:`만기 수령액 ${won(P+I-T.t)}`,sub:[['원금',won(P)],['세전 이자',won(I)],...(v.tax=='free'?[['이자 세금','비과세 0원']]:[['이자소득세 14%','− '+won(T.it)],['지방소득세 1.4%','− '+won(T.lt)]]),['세후 이자',won(I-T.t)],['기간',`${n}개월`]]}}});
calcs.push({id:'savings',label:'적금 이자 계산기',title:'적금 이자 계산기',group:'money',
 disclaimerExtra:'매달 같은 날 같은 금액을 넣는다고 보고 계산했어요. 적금 이자율은 넣은 돈 전체에 1년 내내 붙는 게 아니라, 매달 넣은 돈이 남은 기간만큼만 붙어요.',
 fields:[{id:'m',label:'월 납입액',unit:'원',placeholder:'예: 500000'},PU,NF('적립기간'),{id:'rate',label:'연 이자율',unit:'%',placeholder:'예: 4'},RM,TX],
 run(v){const M=+v.m||0,n=nMon(v),r=(+v.rate||0)/100;if(!M||!n)return{main:'월 납입액과 기간을 넣어 주세요',sub:[]};
  const paid=M*n,I=Math.floor(savInt(M,r,n,v.how)),T=intTax(I,v.tax);
  return{main:`만기 수령액 ${won(paid+I-T.t)}`,sub:[['넣은 돈 합계',won(paid)],['세전 이자',won(I)],...(v.tax=='free'?[['이자 세금','비과세 0원']]:[['이자소득세 14%','− '+won(T.it)],['지방소득세 1.4%','− '+won(T.lt)]]),['세후 이자',won(I-T.t)],['이자율로 보면',`실제로는 원금의 ${(I/paid*100).toFixed(2)}%`]]}}});
// 모으기: 지금 있는 돈(예금처럼) + 매달 적금. 세후 금액이 목표에 닿는지
function goalNet(P,M,r,n,how,tax){const I=Math.floor(depInt(P,r,n,how)+savInt(M,r,n,how)),T=intTax(I,tax);return{paid:P+M*n,I,T:T.t,net:P+M*n+I-T.t}}
function goalNeed(G,P,r,n,how,tax){if(n<=0)return 0;let lo=0,hi=G;while(hi-lo>1){const m=Math.floor((lo+hi)/2);goalNet(P,m,r,n,how,tax).net>=G?hi=m:lo=m}return Math.ceil(hi/1000)*1000}
function goalRun(v){const G=(+v.goal||0)*10000,P=(+v.have||0)*10000,r=(+v.rate||0)/100,how=v.how,tax=v.tax;
 if(!G)return{main:'목표 금액을 넣어 주세요',sub:[]};
 if(P>=G)return{main:'이미 목표를 넘었어요 🎉',sub:[]};
 const cmp=[3,5,7,10].map(y=>[`${y}년이면`,`월 ${won(goalNeed(G,P,r,y*12,how,tax))}`]);
 if(v.mode=='time'){const M=+v.m||0;if(!M)return{main:'매달 모을 금액을 넣어 주세요',sub:[]};
  let n=0,g;do{n++;g=goalNet(P,M,r,n,how,tax)}while(g.net<G&&n<1200);
  if(g.net<G)return{main:'100년 안에 닿지 않아요. 금액을 늘려 보세요',sub:[]};
  return{main:`${Math.floor(n/12)?Math.floor(n/12)+'년 ':''}${n%12?n%12+'개월':''} 걸려요`,sub:[['목표',won(G)],['넣은 돈 합계',won(g.paid)],['붙는 이자 (세후)',won(g.I-g.T)],['그때 모인 돈',won(g.net)],['기간별로 보면',null],...cmp]}}
 const n=Math.round((+v.y||0)*12);if(!n)return{main:'기간을 넣어 주세요',sub:[]};
 const M=goalNeed(G,P,r,n,how,tax),g=goalNet(P,M,r,n,how,tax);
 return{main:`매달 ${won(M)}씩`,sub:[['목표',won(G)],['기간',`${+v.y}년 (${n}개월)`],['넣은 돈 합계',won(g.paid)],['붙는 이자 (세후)',won(g.I-g.T)],['만기에 모인 돈',won(g.net)],['하루로 치면',`${won(Math.ceil(M*12/365/100)*100)}`],['기간별로 보면',null],...cmp]}}
const goalF=(def)=>[{id:'mode',type:'seg',label:'알고 싶은 것',options:[{value:'month',label:'매달 얼마?'},{value:'time',label:'몇 년 걸려?'}]},
 {id:'goal',label:'목표 금액',unit:'만원',placeholder:'예: 10000',def},{id:'have',label:'지금 모아 둔 돈',unit:'만원',placeholder:'예: 0'},
 {id:'y',label:'모을 기간',unit:'년',placeholder:'예: 5',when:'month',def:'5'},{id:'m',label:'매달 모을 돈',unit:'원',placeholder:'예: 1000000',when:'time'},
 {id:'rate',label:'연 이자율',unit:'%',placeholder:'예: 3.5',def:'3.5'},RM,TX];
const GOALD='지금 모아 둔 돈은 예금처럼, 매달 모으는 돈은 적금처럼 같은 이자율로 계산했어요. 실제 상품은 기간·한도가 있어 이자율이 바뀔 수 있어요. 매달 금액은 천 원 단위로 올렸어요.';
calcs.push({id:'goal',label:'목돈 모으기 계산기',title:'목돈 모으기 계산기',group:'money',disclaimerExtra:GOALD,fields:goalF(''),run:goalRun});
calcs.push({id:'goal-50m',label:'5천만원 모으기',title:'5천만원 모으기 계산기',group:'money',disclaimerExtra:GOALD,fields:goalF('5000'),run:goalRun});
calcs.push({id:'goal-100m',label:'1억 모으기',title:'1억 모으기 계산기',group:'money',disclaimerExtra:GOALD,fields:goalF('10000'),run:goalRun});
calcs.push({id:'loan',label:'대출 이자 계산기',title:'대출 이자 계산기',group:'money',
 disclaimerExtra:'금리가 대출 기간 내내 같다고 보고 계산했어요. 변동금리는 금리가 바뀔 때마다 상환액도 바뀌어요.',
 fields:[{id:'p',label:'대출금액',unit:'원',placeholder:'예: 100000000'},PU,NF('대출기간'),{id:'rate',label:'대출금리',unit:'%',placeholder:'예: 4.5'},
  {id:'how',type:'seg',label:'상환방법',options:[{value:'eq',label:'원리금균등'},{value:'pr',label:'원금균등'},{value:'bul',label:'만기일시'}]}],
 run(v){const P=+v.p||0,n=nMon(v),i=(+v.rate||0)/100/12;if(!P||!n)return{main:'대출금액과 기간을 넣어 주세요',sub:[]};
  let bal=P,tot=0;const rows=[];
  for(let k=1;k<=n;k++){const it=Math.round(bal*i);let pr;
   if(v.how=='pr')pr=k==n?bal:Math.round(P/n);else if(v.how=='bul')pr=k==n?bal:0;else{const A=i?P*i/(1-Math.pow(1+i,-n)):P/n;pr=k==n?bal:Math.round(A)-it}
   bal-=pr;tot+=it;rows.push([k,pr+it,pr,it,bal])}
  const f=rows[0],l=rows[n-1],head=v.how=='eq'?`매달 ${won(f[1])}`:v.how=='pr'?`첫 달 ${won(f[1])}`:`매달 이자 ${won(f[3])}`;
  const show=rows.filter(r=>r[0]<=3||r[0]==n||(n>24&&r[0]%(n>120?60:12)==0));
  return{main:head,sub:[['대출금액',won(P)],['총 이자',won(tot)],['총 상환금액',won(P+tot)],...(v.how=='pr'?[['마지막 달',won(l[1])]]:[]),...(v.how=='bul'?[['만기에 갚을 돈',won(l[1])]]:[]),
   ['회차별 상환 (상환액 · 남은 원금)',null],...show.map(r=>[`${r[0]}회차`,`${won(r[1])} · ${won(Math.max(r[4],0))}`])]}}});
const dd=(a,b)=>Math.round((new Date(b)-new Date(a))/864e5);
calcs.push({id:'prepay-fee',label:'중도상환수수료 계산기',title:'중도상환수수료 계산기',group:'money',
 disclaimerExtra:'많이 쓰는 방식(상환금액 × 수수료율 × 남은 기간 ÷ 기준 기간)으로 계산했어요. 수수료율과 면제기간은 대출 약정서에 적힌 값을 넣어 주세요.',
 fields:[{id:'amt',label:'갚을 금액',unit:'원',placeholder:'예: 50000000'},{id:'rate',label:'수수료율',unit:'%',placeholder:'예: 1.2'},
  {id:'start',type:'date',label:'대출일',def:'2025-03-01'},{id:'pay',type:'date',label:'갚는 날',def:'2026-11-12'},{id:'end',type:'date',label:'만기일',def:'2030-03-01'},
  {id:'ex',label:'면제기간',unit:'년',placeholder:'예: 3',def:'3',hint:'대출 후 이 기간이 지나면 수수료가 없어요. 보통 3년이에요. 없으면 비워 두세요.'}],
 run(v){const A=+v.amt||0,R=(+v.rate||0)/100;if(!A)return{main:'갚을 금액을 넣어 주세요',sub:[]};
  if(!v.start||!v.pay||!v.end)return{main:'날짜를 모두 골라 주세요',sub:[]};
  const total=dd(v.start,v.end),used=dd(v.start,v.pay);if(total<=0||used<0)return{main:'날짜 순서를 확인해 주세요',sub:[]};
  const exD=+v.ex?Math.min(dd(v.start,new Date(new Date(v.start).setFullYear(new Date(v.start).getFullYear()+(+v.ex))).toISOString().slice(0,10)),total):total;
  const left=Math.max(exD-used,0),fee=Math.floor(A*R*left/exD);
  return{main:left?`수수료 ${won(fee)}`:'수수료 0원 (면제)',sub:[['갚을 금액',won(A)],['수수료율',`${+v.rate||0}%`],['기준 기간',`${exD}일${+v.ex?' (면제기간)':' (대출기간)'}`],['지난 기간',`${used}일`],['남은 기간',`${left}일`],['계산식',`${won(A)} × ${+v.rate||0}% × ${left}/${exD}`]]}}});
CALC_FAQ['deposit']=[{q:'단리와 월복리는 뭐가 달라요?',a:'단리는 원금에만 이자가 붙고, 월복리는 매달 붙은 이자에도 다시 이자가 붙어요. 기간이 길수록 월복리가 조금 더 많아요.'},{q:'이자 세금은 얼마나 떼요?',a:'이자소득세 14%와 지방소득세 1.4%, 합계 15.4%를 떼요. 비과세 종합저축 같은 상품은 조건이 맞으면 떼지 않아요.'}];
CALC_FAQ['savings']=[{q:'적금 4%면 이자가 넣은 돈의 4%인가요?',a:'아니에요. 첫 달에 넣은 돈만 1년 내내 이자가 붙고, 마지막 달 넣은 돈은 한 달만 붙어요. 그래서 1년 적금의 실제 이자는 넣은 돈의 약 절반 이율만큼이에요.'},{q:'세금은 언제 떼요?',a:'만기에 이자를 받을 때 15.4%를 떼고 줘요.'}];
CALC_FAQ['goal']=[{q:'1억 모으려면 매달 얼마씩 모아야 해요?',a:'이자 3.5%, 일반과세 기준으로 5년이면 매달 150만원대, 10년이면 70만원대예요. 위 계산기에 지금 모아 둔 돈과 이자율을 넣으면 정확히 나와요.'},{q:'이자는 어떻게 계산해요?',a:'지금 있는 돈은 예금처럼, 매달 넣는 돈은 적금처럼 같은 이자율로 계산해요. 세금 15.4%를 뗀 금액이 목표에 닿는 최소 금액을 찾아요.'}];
CALC_FAQ['goal-50m']=CALC_FAQ['goal'].map(x=>({q:x.q.replace('1억','5천만원'),a:x.a.replace('5년이면 매달 150만원대, 10년이면 70만원대','계산기 결과')}));CALC_FAQ['goal-100m']=CALC_FAQ['goal'];
CALC_FAQ['loan']=[{q:'원리금균등과 원금균등은 뭐가 달라요?',a:'원리금균등은 매달 갚는 돈이 같아요. 원금균등은 매달 같은 원금에 줄어드는 이자를 더해서, 처음에 많이 내고 점점 줄어요. 총 이자는 원금균등이 더 적어요.'},{q:'만기일시는요?',a:'매달 이자만 내다가 만기에 원금을 한 번에 갚아요. 매달 부담은 적지만 총 이자가 가장 많아요.'}];
CALC_FAQ['prepay-fee']=[{q:'중도상환수수료는 언제 안 내요?',a:'약정서의 면제기간(보통 대출 후 3년)이 지나면 내지 않아요. 상품에 따라 매년 일부 금액은 수수료 없이 갚을 수 있기도 해요.'},{q:'수수료율은 어디서 봐요?',a:'대출 약정서나 은행 앱의 대출 상세 화면에 적혀 있어요. 상품마다 달라서 이 계산기는 직접 넣게 했어요.'}];
LEGAL_BASIS['deposit']=LEGAL_BASIS['savings']=LEGAL_BASIS['goal']=LEGAL_BASIS['goal-50m']=LEGAL_BASIS['goal-100m']='이자소득은 지급할 때 소득세 14%(소득세법 제129조)와 지방소득세 1.4%가 원천징수돼요. 비과세종합저축·ISA 등은 조건에 따라 세금이 줄거나 없어요.';
LEGAL_BASIS['loan']='상환액은 금리와 기간으로 계산한 일반적인 공식이에요. 실제 이자는 은행의 일할 계산 방식에 따라 조금 달라요.';
LEGAL_BASIS['prepay-fee']='금융소비자보호법은 대출 후 3년이 지나면 중도상환수수료를 받지 못하게 해요(일부 예외 있음). 수수료율은 금융회사·상품마다 달라 약정서를 확인해야 해요.';
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
// ---------- 마감 임박 혜택 ----------
const SUP=(DATA.support||[]);
const todayK=()=>new Date(Date.now()+9*3600e3).toISOString().slice(0,10);
const dday=e=>{if(!e)return null;return Math.round((new Date(e)-new Date(todayK()))/864e5)};
// 마감 임박순, 마감일 없는 것은 그 뒤, 종료는 맨 아래(최근 종료부터)
function supSorted(list){const t=todayK();const live=list.filter(x=>!x.end||x.end>=t),done=list.filter(x=>x.end&&x.end<t);
 return [...live.sort((a,b)=>(a.end||'9999').localeCompare(b.end||'9999')),...done.sort((a,b)=>b.end.localeCompare(a.end))]}
function ddBadge(x){const d=dday(x.end);if(d==null)return '<span class="dd dd-n">상시·별도 공지</span>';if(d<0)return '<span class="dd dd-x">종료</span>';if(d==0)return '<span class="dd dd-h">오늘 마감</span>';return `<span class="dd${d<=7?' dd-h':''}">D-${d}</span>`}
function supCard(x){const d=dday(x.end),done=d!=null&&d<0;
 return `<article class="sup${done?' done':''}" id="${x.id}"><div class="sh">${ddBadge(x)}<span class="sk">${x.kind=='event'?'기업 이벤트':'정부 지원'}</span>${x.host?`<span class="shost">${x.host}</span>`:''}</div>
 <h3>${x.name}</h3>${x.amount?`<p class="samt">최대 ${x.amount}</p>`:''}
 ${x.who?`<p><em>대상</em>${x.who}</p>`:''}${x.cond?`<p><em>조건</em>${x.cond}</p>`:''}${x.end?`<p><em>마감</em>${ymd(x.end)}${x.start?` (접수 ${ymd(x.start)}부터)`:''}</p>`:''}
 ${done?'':`<a class="sapply" href="${x.url}" target="_blank" rel="noopener">공식 페이지에서 신청 ↗</a>`}
 <small class="asof">정보 확인일 ${ymd(x.checked)} · 최종 조건은 공식 페이지에서 확인하세요${x.src?` · <a href="${x.src}" target="_blank" rel="noopener">출처</a>`:''}${x.kind=='gov'?' · 출처 기업마당':''}</small></article>`}
let supT='전체',supK='전체';
function benefitsPage(){const l=supSorted(SUP.filter(x=>(supT=='전체'||x.tags.includes(supT))&&(supK=='전체'||(supK=='정부 지원'?x.kind=='gov':x.kind=='event'))));
 const chip=(v,cur,set)=>`<button class="${v==cur?'on':''}" onclick="${set}='${v}';render()">${v}</button>`;
 const live=l.filter(x=>dday(x.end)==null||dday(x.end)>=0).length;
 return `<h1 class="h1">마감 임박 혜택</h1><p class="note">정부 지원사업과 기업 이벤트를 마감이 가까운 순서로 모았어요</p>
 <div class="chips">${['전체','소상공인','직장인','청년','육아'].map(v=>chip(v,supT,'supT')).join('')}</div>
 <div class="chips">${['전체','정부 지원','기업 이벤트'].map(v=>chip(v,supK,'supK')).join('')}</div>
 <p class="note">신청 가능 ${live}개${l.length>live?` · 종료 ${l.length-live}개`:''}</p>
 ${l.length?l.map(supCard).join(''):SUP.length?`<p class="note" style="margin:20px 0">지금 조건에 맞는 혜택이 없어요. 다른 대상을 골라 보세요.</p>`:`<p class="note" style="margin:20px 0">혜택 정보를 모으고 있어요. 곧 정부 지원사업과 기업 이벤트가 여기에 올라와요.</p>`}
 <p class="note" style="margin-top:14px">금액과 조건은 공고·이벤트 원문에 있는 내용만 옮겼어요. 비어 있는 칸은 원문에서 확인하세요.</p>${foot}`}
// 받을 돈 찾기 칩 → 혜택 대상
const FIND2SUP={self:'소상공인',worker:'직장인',youth:'청년',parent:'육아'};
function supFor(keys){const tags=new Set(keys.map(k=>FIND2SUP[k]).filter(Boolean));const t=todayK();
 return supSorted(SUP.filter(x=>x.tags.some(g=>tags.has(g))&&(!x.end||x.end>=t)))}

// ---------- 받을 돈 찾기 ----------
// 제도 정보는 data/benefits.json (공식 출처·기준일 확인한 값만). tags 는 어떤 조건을 고른 사람에게 보여 줄지.
const BEN=(DATA.benefits||[]);
const BTYPE=[['monthly','매달 받는 돈'],['once','한 번에 받는 돈'],['refund','돌려받는 돈']];
function findSel(){if(typeof location=='undefined'||!location.search)return new Set;const t=new URLSearchParams(location.search).get('t')||'';return new Set(t.split(',').filter(k=>FINDT.some(f=>f[0]==k)))}
let findInit=0;
function findTg2(k){findPick.has(k)?findPick.delete(k):findPick.add(k);try{history.replaceState(null,'','/find/'+(findPick.size?'?t='+[...findPick].join(','):''))}catch(e){}render()}
function benCard(b){const c=b.calc&&ALLC().find(x=>x.id==b.calc);
 return `<article class="ben"><div class="bt"><b>${b.name}</b>${b.amount?`<span class="ba">${b.amount}</span>`:''}</div>
 ${b.who?`<p><em>누가</em>${b.who}</p>`:''}${b.period?`<p><em>얼마나</em>${b.period}</p>`:''}${b.apply?`<p><em>신청</em>${b.apply}</p>`:''}${b.note?`<p class="bnote">${b.note}</p>`:''}
 <div class="bl">${b.url?`<a href="${b.url}" target="_blank" rel="noopener">공식 안내 보기 ↗</a>`:''}${c?A('c-'+c.id,'',`${c.label} ›`):''}</div>
 <small class="asof">기준일 ${b.asof} · 공식 안내를 꼭 확인하세요</small></article>`}
// ── /life/ 인생 이벤트별로 받을 돈·할 일 ──
// steps: [언제, 할 일, 링크(선택: 공식 URL 또는 'c-계산기')]. ben: data/benefits.json 의 id. 금액은 확인된 것만.
const LIFE=[
 {k:'marriage',e:'💍',t:'결혼',d:'혼인신고부터 연말정산까지',
  steps:[['혼인신고 할 때','혼인신고는 시·구청이나 읍·면사무소에서 해요. 결혼세액공제는 2024~2026년에 혼인신고한 사람만 받아요','https://www.gov.kr'],
   ['다음 해 연말정산','결혼세액공제: 부부 각자 50만원, 평생 한 번 (2024~2026년 혼인신고분)','https://www.hometax.go.kr'],
   ['다음 해 연말정산','배우자 연 소득이 100만원 이하(근로소득만 있으면 총급여 500만원 이하)면 배우자 기본공제를 받을 수 있어요','https://www.hometax.go.kr'],
   ['집 구할 때','신혼부부 전세·구입 대출은 조건이 자주 바뀌어요. 주택도시기금에서 지금 기준을 확인하세요','https://nhuf.molit.go.kr'],
   ['돈 모을 때','둘이 합쳐 목표를 정하고 매달 얼마씩 모을지 계산해 보세요','c-goal-100m']],
  calcs:['goal-100m','loan','salary'],ben:['eitc'],
  src:'결혼세액공제: 세정일보 「2025년 달라지는 조세제도」(조세특례제한법 개정) 기준 · 2026-11-12 확인'},
 {k:'birth',e:'👶',t:'출산',d:'출생신고 때 한 번에 신청하는 돈',
  steps:[['임신 중','임신·출산 진료비 바우처(국민행복카드)는 건강보험공단·카드사에서 신청해요','https://www.nhis.or.kr'],
   ['출생신고 할 때','부모급여·아동수당·첫만남이용권을 행정복지센터나 복지로에서 한 번에 신청할 수 있어요 (출생 후 60일 안에)','https://www.bokjiro.go.kr'],
   ['아이 키우는 동안','육아휴직급여는 고용24에서 신청해요','https://www.work24.go.kr'],
   ['다음 해 5월','자녀장려금 대상인지 확인하세요','https://www.hometax.go.kr'],
   ['다음 해 연말정산','자녀가 있으면 자녀세액공제·출산입양 세액공제를 받을 수 있어요','https://www.hometax.go.kr']],
  calcs:['goal','savings'],ben:['parent-pay','child-allowance','first-voucher','parental-leave','eitc']},
 {k:'moving',e:'📦',t:'이사',d:'대출·전입신고·월세 지원',
  steps:[['집 고를 때','대출이면 매달 얼마씩 갚는지 먼저 계산해 보세요','c-loan'],
   ['기존 대출 갚을 때','중도상환수수료가 있는지 약정서를 보고 계산해 보세요','c-prepay-fee'],
   ['이사한 날부터 14일 안에','전입신고를 해요 (주민등록법). 정부24에서 온라인으로도 돼요','https://www.gov.kr'],
   ['계약서 받으면','전입신고와 함께 확정일자를 받아 두면 보증금을 지키는 데 도움이 돼요','https://www.gov.kr'],
   ['월세 사는 청년이면','청년월세 지원 대상인지 확인하세요','https://www.bokjiro.go.kr'],
   ['다음 해 연말정산','무주택 세대주라면 월세 세액공제를 받을 수 있는지 확인하세요','https://www.hometax.go.kr']],
  calcs:['loan','prepay-fee','deposit'],ben:['youth-rent']},
 {k:'resign',e:'🚪',t:'퇴사',d:'퇴직금·실업급여·세금 정리',
  steps:[['퇴사 전','퇴직금·남은 연차수당·실업급여를 한 번에 계산해 보세요','c-resign'],
   ['퇴사 후 14일 안에','퇴직금은 퇴사 후 14일 안에 받아야 해요 (근로자퇴직급여 보장법). 늦으면 회사에 먼저 물어보세요','c-severance'],
   ['퇴사 후 바로','실업급여는 고용24에서 구직 등록 후 신청해요. 퇴사 다음 날부터 12개월 안에 다 받아야 해서 늦으면 손해예요','https://www.work24.go.kr'],
   ['실업급여가 안 되면','국민취업지원제도를 확인하세요','https://www.work24.go.kr'],
   ['건강보험','지역가입자로 바뀌어 보험료가 오를 수 있어요. 임의계속가입을 신청할 수 있는지 건강보험공단에서 확인하세요','https://www.nhis.or.kr'],
   ['다음 해 5월','중간에 퇴사해서 연말정산을 못 했다면 5월 종합소득세 신고 때 정산해요','https://www.hometax.go.kr']],
  calcs:['resign','severance','unemployment'],ben:['unemployment','kua']},
 {k:'retire',e:'🌿',t:'은퇴',d:'연금과 모아 둔 돈 점검',
  steps:[['은퇴 5~10년 전','국민연금공단 「내 연금 알아보기」에서 예상 연금액을 확인하세요','https://www.nps.or.kr'],
   ['은퇴 5~10년 전','목표 노후자금까지 매달 얼마씩 더 모아야 하는지 계산해 보세요','c-goal'],
   ['퇴직할 때','퇴직금·퇴직연금은 IRP로 옮기면 세금을 나중에 낼 수 있어요. 가입한 금융회사에서 확인하세요','https://100lifeplan.fss.or.kr'],
   ['만 65세 이후','기초연금은 소득·재산 기준이 있어요. 복지로에서 대상인지 확인하세요','https://www.bokjiro.go.kr']],
  calcs:['goal','compound','deposit'],ben:[]}];
const LIFEBY=Object.fromEntries(LIFE.map(x=>[x.k,x]));
function lifeIdx(){return `<h1 class="h1">인생 이벤트별 받을 돈</h1><p class="lsub">결혼, 출산, 이사, 퇴사, 은퇴 때 챙길 돈과 할 일을 순서대로 모았어요</p>
 <div class="lgrid">${LIFE.map(x=>A('l-'+x.k,'lcard',`<span class="le">${x.e}</span><b>${x.t}</b><small>${x.d}</small>`)).join('')}</div>${foot}`}
function lifePage(k){const x=LIFEBY[k];if(!x)return lifeIdx();
 const lk=(u,t)=>!u?t:u.startsWith('c-')?A(u,'',t+' ›'):`<a href="${u}" target="_blank" rel="noopener">${t} ↗</a>`;
 const bens=x.ben.map(id=>BEN.find(b=>b.id==id)).filter(Boolean);
 return `<div class="crumb">${A('life','','인생 이벤트')} › ${x.t}</div><h1 class="h1">${x.e} ${x.t} 할 때 받을 돈·할 일</h1><p class="lsub">${x.d}</p>
 <ol class="ltl">${x.steps.map(([w,t,u])=>`<li><em>${w}</em><p>${t}</p>${u?`<div class="ll">${lk(u,u.startsWith('c-')?'계산하기':'공식 사이트')}</div>`:''}</li>`).join('')}</ol>
 ${bens.length?`<h2 class="lh">받을 수 있는 돈</h2>${bens.map(benCard).join('')}`:''}
 <h2 class="lh">바로 계산</h2><div class="lcalc">${x.calcs.map(id=>ALLC().find(c=>c.id==id)).filter(Boolean).map(c=>A('c-'+c.id,'gcard',`<div><b class="one">${c.label}</b></div><span>›</span>`)).join('')}</div>
 <div class="fn bot"><p>조회·신청은 공식 사이트에서 해요. 받는돈은 개인정보를 받지 않아요.</p>${x.src?`<p>${x.src}</p>`:''}<p>제도는 자주 바뀌어요. 금액·조건은 공식 안내를 꼭 확인하세요.</p></div>
 <nav class="lnav">${LIFE.filter(y=>y.k!=k).map(y=>A('l-'+y.k,'',`${y.e} ${y.t}`)).join('')}</nav>${foot}`}
function findPage(){if(!findInit){findInit=1;findPick=findSel()}
 const sel=[...findPick],list=sel.length?BEN.filter(b=>b.tags.some(t=>findPick.has(t))):[];
 const chips=`<div class="fchips">${FINDT.map(([k,l])=>`<button type="button" class="${findPick.has(k)?'on':''}" onclick="findTg2('${k}')">${l}</button>`).join('')}</div>`;
 const body=!sel.length?`<p class="note" style="margin-top:14px">해당하는 걸 모두 눌러 보세요. 받을 수 있는 돈을 종류별로 모아 드려요.</p>`
  :list.length?BTYPE.map(([k,l])=>{const xs=list.filter(b=>b.type==k);return xs.length?`<h2>${l} <small>${xs.length}개</small></h2>${xs.map(benCard).join('')}`:''}).join('')
  :`<p class="note" style="margin-top:14px">고른 조건에 맞는 항목을 아직 준비하지 못했어요.</p>`;
 return `<h1 class="h1">받을 돈 찾기</h1><p class="note">나에게 해당하는 걸 고르세요 · 여러 개 가능</p>${chips}${body}
 ${sel.length&&supFor(sel).length?`<h2>지금 신청할 수 있는 혜택 <small>마감 임박순</small></h2>${supFor(sel).slice(0,5).map(supCard).join('')}${A('benefits','btn ghost allbtn','마감 임박 혜택 전체 보기 ›')}`:''}
 ${sel.length?`<div class="shr"><button type="button" class="btn" onclick="findShare()">카카오톡·문자로 공유</button><button type="button" class="btn ghost" onclick="findCopy(this)">링크 복사</button></div><input id="shurl" hidden readonly aria-label="공유 주소" style="width:100%;margin-top:8px">`:''}
 <p class="note" style="margin-top:16px">금액과 조건은 해마다 바뀌어요. 여기 정보는 각 항목의 기준일 기준이고, 실제로 받을 수 있는지는 공식 안내에서 확인하세요.</p>${foot}`}
function findUrl(){return (DATA.config&&DATA.config.siteUrl||'')+'/find/'+(findPick.size?'?t='+[...findPick].join(','):'')}
function findShare(){const u=findUrl(),d={title:'받을 돈 찾기 | 받는돈',text:'나도 받을 수 있는 돈이 있는지 확인해 보세요',url:u};if(navigator.share)navigator.share(d).catch(()=>{});else findCopy()}
function findCopy(el){const u=findUrl();const ok=()=>{if(el){const t=el.textContent;el.textContent='복사했어요';setTimeout(()=>el.textContent=t,1500)}};const fail=()=>{const b=document.getElementById('shurl');if(b){b.hidden=false;b.value=u;b.select()}};if(navigator.clipboard)navigator.clipboard.writeText(u).then(ok,fail);else fail()}
// ---------- 메인 ----------
let heroA='4000';
function heroNet(){const c=calcs.find(x=>x.id=='salary');try{return c.run({annual:heroA,nonTaxable:'20',dependents:'1'})}catch(e){return null}}
function heroOut(){const r=heroNet(),a=+heroA||0;if(!r||!a)return '<p class="hnote">연봉을 넣어 보세요</p>';
 const m=parseInt(String(r.main).replace(/[^\d]/g,''))||0;
 return `<div class="hres"><span>연봉 ${a.toLocaleString()}만원이면 한 달에</span><b>${m.toLocaleString()}원</b></div><p class="hnote">${RATES.minimumWageYear}년 기준 · 비과세 식대 20만원 · 본인 1명 가정 ${A('c-salary','',`자세히 계산하기 ›`).replace('href="/calc/salary/"',`href="/calc/salary/?annual=${a}"`)}</p>`}
function heroIn(el){heroA=el.value.replace(/[^\d]/g,'');el.value=heroA?(+heroA).toLocaleString():'';document.getElementById('hout').innerHTML=heroOut()}
function heroSet(v){heroA=String(v);const e=document.getElementById('hin');if(e)e.value=(+v).toLocaleString();document.querySelectorAll('.hq button').forEach(b=>b.classList.toggle('on',b.dataset.v==v));document.getElementById('hout').innerHTML=heroOut()}
const FINDT=[['worker','직장인'],['parttime','알바'],['freelance','프리랜서·N잡'],['parent','육아 중'],['jobless','구직·퇴사'],['youth','청년'],['self','자영업']];
let findPick=new Set;
function findTg(k){findPick.has(k)?findPick.delete(k):findPick.add(k);document.querySelectorAll('.fchips button').forEach(b=>b.classList.toggle('on',findPick.has(b.dataset.k)));const g=document.getElementById('fgo');if(g){g.href='/find/'+(findPick.size?'?t='+[...findPick].join(','):'');g.textContent=findPick.size?`${findPick.size}개 골랐어요 · 받을 돈 보기 ›`:'받을 돈 보기 ›'}}
const CATS4=[['월급·일한 돈','연봉·알바·퇴직금·3.3%','calc','w'],['나라에서 받는 돈','지원금·수당·장려금','find','g'],['돌려받는 돈','연말정산·종합소득세 환급','c-tax-refund','r'],['당첨된 돈','로또·연금복권 실수령액','lotto','l']];
const POPC=['salary','parttime','goal-100m','freelance','severance','weekly-rest'];
function home(){const d=DRAWS[0],S=(DATA.config&&DATA.config.season)||null,posts=allPosts().slice(0,3);
 return `<section class="h-hero"><h1>내가 받을 돈,<br><em>24시간</em> 다 찾아드려요</h1>
 <label class="hlab" for="hin">내 연봉 (세전)</label><div class="hbox"><input id="hin" inputmode="numeric" autocomplete="off" value="${(+heroA).toLocaleString()}" oninput="heroIn(this)" onfocus="this.select()"><span>만원</span></div>
 <div class="hq">${[3000,4000,5000].map(v=>`<button type="button" data-v="${v}" class="${heroA==v?'on':''}" onclick="heroSet(${v})">${v/1000}천만</button>`).join('')}</div>
 <div id="hout">${heroOut()}</div></section>
 <section class="hsec"><h2>1분 만에 받을 돈 찾기 <small>여러 개 골라도 돼요</small></h2><div class="fchips">${FINDT.map(([k,l])=>`<button type="button" data-k="${k}" class="${findPick.has(k)?'on':''}" onclick="findTg('${k}')">${l}</button>`).join('')}</div><a id="fgo" class="fgo" href="/find/">받을 돈 보기 ›</a></section>
 <section class="hsec"><div class="c4">${CATS4.map(([t,dsc,to,k])=>A(to,'c4i c4-'+k,`<b>${t}</b><small>${dsc}</small>`)).join('')}</div></section>
 <section class="hsec"><h2>이럴 때 받을 돈 ${A('life','more2','전체 ›')}</h2><nav class="lnav">${LIFE.map(y=>A('l-'+y.k,'',`${y.e} ${y.t}`)).join('')}</nav></section>
 ${S?`<a class="season" href="${S.url}"${/^https?:/.test(S.url)?' target="_blank" rel="noopener"':''}><span class="stag">${S.tag}</span><b>${S.title}</b><small>${S.desc}</small></a>`:''}
 <section class="hsec"><h2>많이 쓰는 계산기</h2>${POPC.map(id=>ALLC().find(c=>c.id==id)).filter(Boolean).map(c=>A('c-'+c.id,'gcard lg',`<div><b class="one">${c.label}</b></div><span>›</span>`)).join('')}</section>
 ${(()=>{const t=todayK(),xs=supSorted(SUP).filter(x=>x.end&&x.end>=t).slice(0,3);return xs.length?`<section class="hsec"><h2>마감 임박 혜택 ${A('benefits','more2','전체 ›')}</h2>${xs.map(x=>A('benefits','hsup',`${ddBadge(x)}<b class="one">${x.name}</b><small class="one">${x.host}${x.amount?` · 최대 ${x.amount}`:''}</small>`).replace('href="/benefits/"',`href="/benefits/#${x.id}"`)).join('')}</section>`:''})()}
 ${d?`<section class="hsec"><h2>로또 ${d.r}회 <small>${ymd(d.date)}</small></h2>${A('lotto','hlot',`${balls(d,'sm')}<span>1등 ${d.win}명 · 1인 ${d.per}원 ›</span>`)}</section>`:''}
 <section class="hsec"><h2>최신 글 ${A('guide','more2',`전체 ${allPosts().length}개 ›`)}</h2>${posts.map(postRow).join('')}</section>${foot}`}

function calcList(){const list=VIS().filter(c=>calcG=='all'||c.group==calcG);
 return `<h1 class="h1">실수령액 계산기 모음</h1><p class="note">${VIS().length}종 · 숫자만 넣으면 바로 계산돼요</p><div class="chips">${Object.keys(GL).map(k=>`<button class="${k==calcG?'on':''}" onclick="calcG='${k}';render()">${GL[k]}</button>`).join('')}</div>
 ${list.map(c=>A('c-'+c.id,'gcard lg',`<div><b class="one">${c.label}</b></div><span>›</span>`)).join('')}${foot}`}
const ex=f=>f.def!=null?f.def:f.type=='seg'?f.options[0].value:f.type=='select'?'0':((f.placeholder||'').match(/[\d.]+/)||[''])[0];
const LEAD={salary:'연봉만 넣으면 4대보험과 세금을 뗀 월급이 나와요',
 'salary-compare':'두 회사 연봉을 넣고 실수령액 차이를 비교해요',insurance:'월급에서 빠지는 4대보험료를 항목별로 보여 드려요',
 severance:'최근 3개월 급여와 근속기간으로 퇴직금을 계산해요','annual-leave':'남은 연차를 돈으로 바꾸면 얼마인지 계산해요',
 'weekly-rest':'시급과 주당 근무시간으로 주휴수당을 계산해요',freelance:'프리랜서 원천징수 3.3%를 뗀 실제 수령액을 확인해 보세요.',
'tax-refund':'작년 소득으로 5월 환급액을 미리 가늠해 봐요',
 'labor-cost':'사업주가 내는 4대보험까지 더한 실제 인건비예요','minwage-check':'월급이나 시급이 최저임금을 지키는지 바로 확인해요',
 'daily-worker-tax':'일당과 근무일수로 일용직 세금과 실제 지급액을 계산해요','card-fee':'카드 결제액에서 수수료와 부가세를 뺀 남는 돈이에요',
 'split-14h':'주 15시간 1명과 14시간 여러 명의 인건비를 비교해요',
 unemployment:'하루 금액과 받는 기간을 계산해요',overtime:'연장·야간·휴일에 일한 만큼 더 받는 돈을 계산해요',resign:'퇴직금, 남은 연차수당, 실업급여를 한 번에 더해 봐요',parttime:'시급·일당으로 월급과 주휴수당을 계산해요',compound:'이자에 이자가 붙으면 얼마가 되는지 계산해요','lotto-tax':'당첨금에서 세금을 뗀 실수령액을 계산해요','pension-tax':'연금복권720+ 당첨금에서 세금을 뗀 실수령액이에요'};
// 천 단위 쉼표: CV 에는 쉼표 없는 숫자만 저장하고 화면에만 쉼표를 붙인다
const fmtN=x=>{const [i,...d]=String(x).replace(/[^\d.]/g,'').split('.');return i.replace(/^0+(?=[0-9])/,'').replace(/\B(?=(\d{3})+(?!\d))/g,',')+(d.length?'.'+d.join(''):'')};
function nIn(el,id,fid){const raw=el.value.replace(/[^\d.]/g,''),left=el.value.slice(0,el.selectionStart).replace(/[^\d.]/g,'').length,f=fmtN(raw);el.value=f;
 let n=0,p=0;while(p<f.length&&n<left){if(/[\d.]/.test(f[p]))n++;p++}try{el.setSelectionRange(p,p)}catch(e){}
 CV[id][fid]=raw;runC(id)}
function dayTg(id,fid,d){let v=String(CV[id][fid]||'');v=v.includes(d)?v.replace(d,''):(v+d).split('').sort().join('');CV[id][fid]=v;render()}
function perdayHtml(id,f){const v=CV[id],on=v.custom==='1',days=String(v.days||'').split('').sort();
 const tin=(d,k,lab)=>{const key={start:'s',end:'e',bstart:'bs',bend:'be'}[k]+d;return `<div class="tcell"><label class="fl2" for="f-${key}">${lab}</label><input type="time" id="f-${key}" value="${dayT(v,d,k)||''}" onchange="CV['${id}']['${key}']=this.value;runC('${id}')"></div>`};
 return `<button type="button" class="ptg${on?' on':''}" aria-pressed="${on}" onclick="CV['${id}'].custom=CV['${id}'].custom==='1'?'0':'1';render()"><span class="ck">${on?'✓':''}</span>${f.label}</button>`
  +(on?`<p class="note">위 공통 시간이 먼저 들어가 있어요. 다른 요일만 고치세요.</p>`+days.map(d=>`<div class="pday"><b>${DAYN[d-1]}</b><div class="tpair">${tin(d,'start','출근')}${tin(d,'end','퇴근')}</div><div class="tpair">${tin(d,'bstart','휴게 시작')}${tin(d,'bend','휴게 끝')}</div></div>`).join(''):'')}
const fieldHtml0=(id,f)=>f.type=='date'?`<label class="fl2" for="f-${f.id}">${f.label}</label><input type="date" class="din" id="f-${f.id}" value="${CV[id][f.id]||''}" onchange="CV['${id}']['${f.id}']=this.value;runC('${id}')">`:f.type=='perday'?perdayHtml(id,f):f.type=='days'?`<label class="fl2">${f.label}</label><div class="dayp">${[...DAYN].map((n,k)=>`<button type="button" class="${String(CV[id][f.id]).includes(String(k+1))?'on':''}" onclick="dayTg('${id}','${f.id}','${k+1}')">${n}</button>`).join('')}</div>`
 :f.type=='time'?`<div class="tcell"><label class="fl2" for="f-${f.id}">${f.label}</label><input type="time" id="f-${f.id}" value="${CV[id][f.id]}" onchange="CV['${id}']['${f.id}']=this.value;runC('${id}')"></div>`:null;
// half 칸(시간 입력)은 두 개씩 한 줄에
function fieldsHtml(id,fs){let out='';for(let k=0;k<fs.length;k++){const f=fs[k];if(f.half){const g=fs[k+1]&&fs[k+1].half?fs[++k]:null;out+=`<div class="tpair">${fieldHtml(id,f)}${g?fieldHtml(id,g):''}</div>`}else out+=fieldHtml(id,f)}return out}
const fieldHtml=(id,f,big)=>fieldHtml0(id,f)!=null?fieldHtml0(id,f):f.type=='seg'?`<div class="seg mseg" role="group" aria-label="${f.label}">${f.options.map(o=>`<button type="button" class="${CV[id][f.id]==o.value?'on':''}" onclick="CV['${id}']['${f.id}']='${o.value}';render()">${o.label}</button>`).join('')}</div>`:`<label class="fl2" for="f-${f.id}">${f.label}</label>`+(f.type=='select'?`<select id="f-${f.id}" onchange="CV['${id}']['${f.id}']=this.value;runC('${id}')">${f.options.map(o=>`<option value="${o.value}" ${String(o.value)==String(CV[id][f.id])?'selected':''}>${o.label}</option>`).join('')}</select>`:`<div class="inw"><input id="f-${f.id}" inputmode="decimal" autocomplete="off" value="${fmtN(CV[id][f.id])}" oninput="nIn(this,'${id}','${f.id}')">${f.unit?`<span class="un">${f.unit}</span>`:''}</div>`)+(f.hint?`<p class="note">${f.hint}</p>`:'');
const rwH=(a,b)=>`<div class="rw"><span>${a}</span><b>${b}</b></div>`;
function resHtml(id){const c=calcs.find(x=>x.id==id),v=CV[id];
 if(c.dual){const a=wht33(+v.contract||0),b=rev33(+v.net||0),
  card=(r,l,m)=>rwH('기본세율(3%)',won(r.it))+rwH('지방소득세율(0.3%)',won(r.lt))+'<hr class="cdiv">'+rwH('총 3.3% 금액',won(r.it+r.lt))+`<div class="rbig"><span>${l}</span><b>${won(m)}</b></div>`;
  return{contract:card(a,'실제 수령액',a.net),net:card(b,'계약 금액',b.g)}}
 let r;try{r=c.run(v)}catch(e){return '<p class="note">숫자를 확인해 주세요.</p>'}
 return (r.sub||[]).map(([a,b])=>b===null?`<b class="rh">${a}</b>`:b===''?`<p class="note">${a}</p>`:rwH(a,b)).join('')+(c.disclaimerExtra?`<p class="note">${c.disclaimerExtra}</p>`:'')+`<div class="rbig${/^⚠️/.test(r.main)?' warn':''}"><b>${r.main}</b></div>`}
function relHtml(id){const c=calcs.find(x=>x.id==id);let r;try{r=c.run(CV[id])}catch(e){return ''}
 const l=(r.related||[]).filter(s=>ARTICLES[s]);return l.length?`<p class="note" style="margin-top:14px">관련 글</p>`+l.map(s=>A('b-'+s,'rl one',`${ARTICLES[s].title} ›`)).join(''):''}
// ---------- 계산기 화면 (새 디자인: 한 줄 입력 · 탭 묶음 · 작은 결과표) ----------
// 같은 카드 안에서 탭으로 오가는 계산기 묶음. 탭마다 주소는 그대로(/calc/{id}/)
const GNL={employee:'직장인',freelance:'프리랜서',employer:'사업주',money:'재테크',lotto:'복권'};
const GFIRST={employee:'salary',freelance:'freelance',employer:'labor-cost',money:'goal-100m',lotto:'lotto-tax'};
function gnav(g){return `<nav class="gnav" aria-label="계산기 분야"><span>계산기</span>${Object.keys(GFIRST).map(k=>A('c-'+GFIRST[k],k==g?'on':'',GNL[k])).join('')}</nav>`}
function moreHtml(id,g,S){const inTabs=new Set(S?S.ids:[]),L=ALLC().filter(c=>c.group==g&&!c.hidden&&c.id!=id&&!inTabs.has(c.id)&&!inTabs.has(TABAL[c.id]||''));return L.length?`<div class="nrel nmore"><span>더 보기</span>${L.map(c=>A('c-'+c.id,'',c.label)).join('<i>·</i>')}</div>`:''}
const SUITES=[{g:'employee',t:'직장인 계산기',sub:[['월급·연봉',['salary','salary-compare','insurance']],['시급·알바',['wage','parttime','weekly-rest','overtime','minwage-check']],['퇴사',['severance','annual-leave','unemployment','resign']]]},
 {g:'freelance',t:'프리랜서 계산기',ids:['freelance','tax-refund']},
 {g:'employer',t:'사업주 계산기',ids:['labor-cost','split-14h','daily-worker-tax','card-fee']},
 {g:'money',t:'재테크 계산기',sub:[['모으기',['goal','deposit','savings','compound']],['대출',['loan','prepay-fee']]]}];
SUITES.forEach(S=>{if(S.sub)S.ids=S.sub.flatMap(x=>x[1])});
const TABAL={'goal-50m':'goal','goal-100m':'goal'};
const TABL={wage:'시급',salary:'연봉',severance:'퇴직금',unemployment:'실업급여',resign:'퇴사 합계',parttime:'알바 월급','weekly-rest':'주휴수당',overtime:'연장·야간','minwage-check':'최저임금',freelance:'3.3%','tax-refund':'종소세 환급','card-fee':'카드 수수료','labor-cost':'인건비','salary-compare':'연봉 비교',insurance:'4대보험','annual-leave':'연차수당','split-14h':'쪼개기 고용','daily-worker-tax':'일용직 세금',deposit:'예금',savings:'적금',goal:'모으기',loan:'대출','prepay-fee':'중도상환수수료',compound:'복리'};
const suiteOf=id=>(id=TABAL[id]||id,SUITES.find(g=>g.ids.includes(id)&&g.ids.every(k=>k=='wage'||calcs.some(c=>c.id==k))));
function hintTg(b){const p=b.closest('.fr').nextElementSibling;if(p&&p.classList.contains('fh'))p.hidden=!p.hidden}
function nFieldHtml(id,f){const v=CV[id][f.id],hint=f.hint?`<button type="button" class="qi" aria-label="설명 보기" onclick="hintTg(this)">?</button>`:'';
 const H=f.hint?`<p class="fh" hidden>${f.hint}</p>`:'';
 if(f.type=='seg')return `<div class="fseg" role="radiogroup" aria-label="${f.label}">${f.options.map(o=>`<button type="button" role="radio" aria-checked="${v==o.value}" class="${v==o.value?'on':''}" onclick="CV['${id}']['${f.id}']='${o.value}';render()">${o.label}</button>`).join('')}</div>`;
 if(f.type=='select')return `<div class="fr"><label for="f-${f.id}">${f.label}${hint}</label><div class="fi"><select id="f-${f.id}" onchange="CV['${id}']['${f.id}']=this.value;runC('${id}')">${f.options.map(o=>`<option value="${o.value}" ${String(o.value)==String(v)?'selected':''}>${o.label}</option>`).join('')}</select></div></div>${H}`;
 if(f.type=='date')return `<div class="fr"><label for="f-${f.id}">${f.label}${hint}</label><div class="fi"><input type="date" id="f-${f.id}" value="${v||''}" onchange="CV['${id}']['${f.id}']=this.value;runC('${id}')"></div></div>${H}`;
 const o=fieldHtml0(id,f);if(o!=null)return o;
 return `<div class="fr"><label for="f-${f.id}">${f.label}${hint}</label><div class="fi"><input id="f-${f.id}" inputmode="decimal" autocomplete="off" value="${fmtN(v)}" onfocus="this.select()" oninput="nIn(this,'${id}','${f.id}')">${f.unit?`<span class="u">${typeof f.unit=='function'?f.unit(CV[id]):f.unit}</span>`:''}</div></div>${H}`}
function nFieldsHtml(id,fs){let out='';for(let k=0;k<fs.length;k++){const f=fs[k];if(f.half){const g=fs[k+1]&&fs[k+1].half?fs[++k]:null;out+=`<div class="tpair">${nFieldHtml(id,f)}${g?nFieldHtml(id,g):''}</div>`}else out+=nFieldHtml(id,f)}return out}
// 결과: 맨 위 요약 한 줄 + 작은 표, 안내 문장('')은 아래 회색 각주로
function splitMain(m){const x=String(m).match(/^(.*?)\s*([−-]?\s?[\d,]+원.*)$/);return x&&x[1]?[x[1],x[2]]:['',String(m)]}
function nResHtml(id){const c=calcs.find(x=>x.id==id);let r;try{r=c.run(CV[id])}catch(e){return '<p class="fn">숫자를 확인해 주세요.</p>'}
 const [ml,mv]=splitMain(r.main),warn=/^⚠️/.test(r.main),notes=[];
 const rows=(r.sub||[]).map(([a,b])=>b===null?`<tr class="sec"><th colspan="2">${a}</th></tr>`:b===''?(notes.push(a),''):`<tr><th>${a}</th><td>${b}</td></tr>`).join('');
 return `<div class="ncm${warn?' warn':''}">${ml?`<span>${ml}</span>`:''}<b>${mv}</b></div>${rows?`<table class="nct2">${rows}</table>`:''}${notes.length?`<div class="fn">${notes.map(n=>`<p>${n}</p>`).join('')}</div>`:''}`}
function resetC(id){const c=calcs.find(x=>x.id==id);CV[id]={_q:1};c.fields.forEach(f=>{CV[id][f.id]=f.type=='seg'?f.options[0].value:f.def!=null?f.def:f.type=='select'?'0':''});render()}
function calcView(id){const L=LCALC.find(x=>x.id==id);if(L){const faq=(CALC_FAQ[id]||[]).map(q=>`<details><summary>${q.q}</summary><p>${q.a}</p></details>`).join('');
 return `<div class="calc">${gnav('lotto')}<section class="nc nlot"><div class="nch"><h1>복권 계산기</h1></div><nav class="ntabs" aria-label="복권 세금 계산기">${LCALC.map(x=>A('c-'+x.id,x.id==id?'on':'',x.id=='lotto-tax'?'로또':'연금복권')).join('')}</nav><p class="nsub">${L.title}</p>${id=='lotto-tax'?taxPanel():penCalc()}<div class="fn bot"><p>${id=='lotto-tax'?'3억원까지 22%, 넘는 부분 33% (소득세 + 지방소득세) · 200만원 이하 비과세':'연금형은 매달 받는 금액에서 22%를 떼요 · 1등 20년, 2등·보너스 10년'}</p></div></section><details class="info"><summary>자주 묻는 질문 · 법적 근거</summary>${faq}<h3>법적 근거</h3><p>${LEGAL_BASIS[id]}</p></details></div>${foot}`}
 const c=calcs.find(x=>x.id==id);if(!c)return calcList();CV[id]=CV[id]||{};c.fields.forEach(f=>{if(CV[id][f.id]==null)CV[id][f.id]=ex(f)});
 if(!CV[id]._q&&typeof location!='undefined'&&location.search){CV[id]._q=1;const q=new URLSearchParams(location.search);c.fields.forEach(f=>{const x=q.get(f.id);if(x!=null&&/^[\d.:]+$|^[a-z0-9]+$|^\d{4}-\d{2}-\d{2}$/i.test(x))CV[id][f.id]=x})}
 const faq=(CALC_FAQ[id]||[]).map(q=>`<details><summary>${q.q}</summary><p>${q.a}</p></details>`).join('');
 const S=suiteOf(id),tid=TABAL[id]||id,SB=S&&S.sub?S.sub.find(x=>x[1].includes(tid)):null,tids=SB?SB[1]:S?S.ids:[];
 const tabs=S?`${SB?`<nav class="nsubg" aria-label="${S.t} 묶음">${S.sub.map(([n,ids])=>A('c-'+ids[0],n==SB[0]?'on':'',n)).join('')}</nav>`:''}<nav class="ntabs" aria-label="${S.t}">${tids.filter(k=>calcs.some(c=>c.id==k)).map(k=>A('c-'+k,k==tid?'on':'',TABL[k]||k)).join('')}</nav>`:'';
 let body;
 if(c.dual){const R=resHtml(id),LB={contract:'<b class="hl">계약 금액</b> 기준',net:'<b class="hl">실제 수령액</b> 기준'},
  card=k=>`<section class="ccard"><div class="crow"><label class="ct" for="f-${k}">${LB[k]}</label><div class="inw"><input id="f-${k}" inputmode="decimal" autocomplete="off" value="${fmtN(CV[id][k])}" onfocus="this.select()" oninput="nIn(this,'${id}','${k}')"><span class="un">원</span></div></div><div id="dres-${k}">${R[k]}</div></section>`;
  body=`<div class="dual">${['contract','net'].map(card).join('')}</div>`}
 else body=`<div class="nf">${nFieldsHtml(id,c.fields.filter(f=>!f.when||f.when==CV[id].mode))}</div><div class="ncr" id="cres">${nResHtml(id)}</div>`;
 const rel=(CALC_REL[id]||[]).map(k=>ALLC().find(c=>c.id==k)).filter(Boolean);
 const fn=[CALC_SRC[id]&&CALC_SRC[id](),c.disclaimerExtra].filter(Boolean);
 return `<div class="calc">${gnav(c.group)}
 <section class="nc"><div class="nch"><h1>${S?S.t:c.title}</h1><button type="button" class="nrst" onclick="resetC('${id}')">↻ 초기화</button></div>${tabs}
 ${S?`<p class="nsub">${c.title}</p>`:''}${body}
 ${fn.length?`<div class="fn bot">${fn.map(t=>`<p>${t}</p>`).join('')}</div>`:''}
 ${rel.length?`<div class="nrel"><span>관련</span>${rel.map(c=>A('c-'+c.id,'',c.label)).join('<i>·</i>')}</div>`:''}</section>
 <details class="info"><summary>자주 묻는 질문 · 법적 근거</summary><div id="crel">${relHtml(id)}</div>${faq?faq:''}${LEGAL_BASIS[id]?`<h3>법적 근거</h3><p>${LEGAL_BASIS[id]}</p>`:''}</details></div>${foot}`}
function runC(id){const c=calcs.find(x=>x.id==id);if(!c)return;const set=(i,h)=>{const e=document.getElementById(i);if(e)e.innerHTML=h};
 if(c.dual){const R=resHtml(id);set('dres-contract',R.contract);set('dres-net',R.net)}else set('cres',nResHtml(id));set('crel',relHtml(id))}
const pd=s=>ymd(ARTICLES[s].date);
function allPosts(){return POSTS.map(p=>({id:'b-'+p.slug,t:p.title,c:p.cat,d:ymd(p.date),e:p.excerpt})).sort((a,b)=>b.d.localeCompare(a.d))}
const postRow=p=>A(p.id,'gcard',`<div><b class="one">${p.t}</b><small class="one">${p.c} · ${p.d}</small></div><span>›</span>`);
function guide(){const all=allPosts(),cats=['전체','급여','세금','복권'].filter(c=>c=='전체'||all.some(p=>p.c==c));
 return `<h1 class="h1">정보</h1><p class="note">급여·세금·복권 정보글 ${all.length}개</p><input id="bq" placeholder="글 제목 검색" value="${boardQ}" oninput="boardQ=this.value;document.getElementById('bl').innerHTML=bl()" style="margin:10px 0" aria-label="글 제목 검색"><div class="chips">${cats.map(c=>`<button class="${c==boardF?'on':''}" onclick="boardF='${c}';render()">${c}</button>`).join('')}</div><div id="bl">${bl()}</div>${foot}`}
function bl(){const l=allPosts().filter(p=>(boardF=='전체'||p.c==boardF)&&(!boardQ||p.t.includes(boardQ)));return l.length?l.map(postRow).join(''):'<p class="note">찾는 글이 없어요.</p>'}
function bpost(s){const a=ARTICLES[s];if(!a)return guide();const c=ALLC().find(x=>x.id==a.calc);
 return `<div class="crumb">${A('guide','','정보')} › ${a.cat}</div><h1 class="h1">${a.title}</h1><p class="note">${pd(s)} · ${a.cat} · ${a.min}분</p><article class="art" style="margin-top:12px">${(typeof window!='undefined'&&window.__POSTHTML)||''}</article>${c?A('c-'+c.id,'btn cta',`${c.title} 바로 쓰기 ›`):''}${foot}`}
function lotSwitch(k){return `<nav class="lsw" aria-label="복권 종류">${A('lotto',k=='lotto'?'on':'','로또 6/45')}${A('pension',k=='pension'?'on':'','연금복권720+')}</nav>`}
function lotto(){const seg=`<div class="chips" style="margin-top:12px">${[['win','당첨번호'],['place','지역·명당'],['gen','번호뽑기']].map(([k,l])=>`<button class="${k==lottoF?'on':''}" onclick="lottoF='${k}';render()">${l}</button>`).join('')}</div>`;
 return lotSwitch('lotto')+seg+(lottoF=='place'?place():lottoF=='gen'?gen():lottoWin())}
function tabOf(c){if(PAGES[c])return '';if(c=='find'||c=='benefits')return 'find';if(c.startsWith('c-'))return 'calc';if(c.startsWith('draw')||c=='all')return 'lotto';if(c=='penall'||c=='pension')return 'lotto';if(c.startsWith('g-')||c.startsWith('b-'))return 'guide';return c}

function tabsHtml(){return TABS.map(([k,i,l])=>`<a href="${pathOf(k)}" class="${k==tabOf(cur)?'on':''}"><i>${i}</i>${l}</a>`).join('')}
function view(){const v=view0();return tabOf(cur)=='lotto'?v.replace('<div class="ad-slot"',LOTNOTE+'<div class="ad-slot"'):v}
function view0(){return cur.startsWith('c-')?calcView(cur.slice(2)):cur.startsWith('b-')?bpost(cur.slice(2)):cur.startsWith('l-')?lifePage(cur.slice(2)):cur=='all'?allDraws():cur=='penall'?penAll():cur.startsWith('draw')?draw(+cur.slice(4)):PAGES[cur]?`<h1 class="h1">${PAGES[cur][0]}</h1><div class="art">${PAGES[cur][1]}</div>`+foot:({home,calc:calcList,lotto,guide,pension,find:findPage,benefits:benefitsPage,life:lifeIdx}[cur]||home)()}
function render(){document.getElementById('tabs').innerHTML=tabsHtml();
 const v=view();if(!(cur.startsWith('b-')&&window.__PRE))document.getElementById('app').innerHTML=v;if(cur.startsWith('c-'))runC(cur.slice(2));tick()}
function nextAt(dow,h,m){const now=new Date,k=new Date(now.getTime()+(now.getTimezoneOffset()+540)*6e4),t=new Date(k);t.setDate(k.getDate()+((dow-k.getDay()+7)%7));t.setHours(h,m,0,0);if(t<k)t.setDate(t.getDate()+7);const s=Math.floor((t-k)/1e3),p=x=>String(x).padStart(2,'0');return `${Math.floor(s/86400)}일 ${p(Math.floor(s%86400/3600))}:${p(Math.floor(s%3600/60))}:${p(s%60)}`}
function tick(){const lt=nextAt(6,20,35),pt=nextAt(4,19,5),set=(i,v)=>{const e=document.getElementById(i);if(e)e.textContent=v};set('cd',lt);set('cdp',pt);const t=tabOf(cur);set('hsub',t=='lotto'?'로또 추첨 '+lt:t=='pension'?'연금복권 추첨 '+pt:'')}
if(!window.__PRERENDER){setInterval(tick,1000);render()}
